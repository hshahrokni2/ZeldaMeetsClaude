/**
 * OpenRouter Client with Multi-Key Pool Support
 *
 * Abstracts OpenRouter API calls with:
 * - Automatic key selection (LRU)
 * - Retry logic on rate limit errors (429)
 * - Usage tracking
 * - Cooldown management
 * - Wallet balance enforcement
 */

import { keyPoolManager } from './key-pool-manager'
import { decryptApiKey } from './crypto'
import { getPricingManager } from './pricing-manager'
import { sendCircuitBreakerAlert } from './email-notifications'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Message content types (for multimodal support)
 */
export type MessageContent =
  | string  // Simple text
  | Array<{  // Multimodal (text + images)
      type: 'text' | 'image_url'
      text?: string
      image_url?: {
        url: string
      }
    }>

/**
 * Chat request structure
 */
export interface ChatRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: MessageContent
  }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
  response_format?: { type: 'json_object' }
  [key: string]: any
}

/**
 * Chat response structure from OpenRouter
 */
export interface ChatResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
    index: number
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  totalCost?: number // Added for extraction workflow cost tracking
  // OpenRouter-specific fields
  native_tokens_prompt?: number
  native_tokens_completion?: number
}

/**
 * OpenRouter error response
 */
interface OpenRouterError {
  error: {
    code: number
    message: string
  }
}

/**
 * OpenRouter Client - Handles all LLM API calls with key pool
 */
export class OpenRouterClient {
  private maxRetries: number = 3
  private baseDelay: number = 1000 // 1 second

  /**
   * Decrypted key cache to prevent race conditions during parallel execution
   * Maps apiKey (encrypted) -> { decrypted: string, timestamp: number }
   * Cache entries expire after 5 minutes for security
   */
  private static decryptedKeyCache = new Map<string, { decrypted: string; timestamp: number }>()
  private static CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Make a chat completion request
   *
   * @param userId - User ID for key selection and billing
   * @param request - Chat request parameters
   * @returns Chat completion response
   */
  async chat(userId: string, request: ChatRequest): Promise<ChatResponse> {
    // Check if user has key pool enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        keyPoolEnabled: true,
        walletBalance: true,
      }
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    // If key pool not enabled, fall back to single key mode
    if (!user.keyPoolEnabled) {
      throw new Error('Multi-key pool not enabled for this user. Please provision keys first.')
    }

    // Check wallet balance (minimum $0.01 required)
    if (user.walletBalance < 0.01) {
      throw new Error('Insufficient wallet balance. Please top up your account.')
    }

    // WEEK 2 IMPROVEMENT: Estimate cost and reserve funds
    const estimatedCost = await this.estimateCost(request)
    console.log(`[OpenRouterClient] Estimated cost: $${estimatedCost.toFixed(4)}`)

    // Reserve estimated cost
    const reserved = await this.reserveBalance(userId, estimatedCost)
    if (!reserved) {
      throw new Error(`Insufficient balance. Estimated cost: $${estimatedCost.toFixed(4)}, Available: $${user.walletBalance.toFixed(4)}`)
    }

    try {
      // Attempt request with retry logic
      const response = await this.chatWithRetry(userId, request, 0, estimatedCost)
      return response
    } catch (error) {
      // If request fails, refund the reservation
      await this.refundBalance(userId, estimatedCost)
      console.log(`[OpenRouterClient] Request failed, refunded $${estimatedCost.toFixed(4)}`)
      throw error
    }
  }

  /**
   * Make chat request with retry logic
   *
   * @param userId - User ID
   * @param request - Chat request
   * @param attempt - Current attempt number (0-indexed)
   * @param reservedAmount - Reserved amount for this request
   * @returns Chat response
   */
  private async chatWithRetry(
    userId: string,
    request: ChatRequest,
    attempt: number,
    reservedAmount: number
  ): Promise<ChatResponse> {
    try {
      // Get available key from pool (LRU selection)
      const keyPool = await keyPoolManager.getAvailableKey(userId)

      if (!keyPool) {
        throw new Error('No available API keys. All keys may be in cooldown.')
      }

      // Decrypt API key (with caching to prevent race conditions)
      let apiKey: string
      const cached = OpenRouterClient.decryptedKeyCache.get(keyPool.apiKey)

      if (cached && Date.now() - cached.timestamp < OpenRouterClient.CACHE_TTL_MS) {
        // Use cached decrypted key
        apiKey = cached.decrypted
        console.log('[OpenRouterClient] ✅ Using cached decrypted key')
      } else {
        // Decrypt and cache for 5 minutes
        apiKey = await decryptApiKey(keyPool.apiKey)
        OpenRouterClient.decryptedKeyCache.set(keyPool.apiKey, {
          decrypted: apiKey,
          timestamp: Date.now()
        })
        console.log('[OpenRouterClient] 🔐 Decrypted and cached key (TTL: 5min)')
      }

      // Make the API request
      const startTime = Date.now()
      const response = await this.makeRequest(apiKey, request)
      const latencyMs = Date.now() - startTime

      // Calculate actual cost from usage
      const actualCost = await this.calculateCost(response, request.model)

      console.log(`[OpenRouterClient] Cost comparison - Reserved: $${reservedAmount.toFixed(4)}, Actual: $${actualCost.toFixed(4)}`)

      // WEEK 2 IMPROVEMENT: Circuit breaker for cost runaway
      const costMultiplier = actualCost / reservedAmount
      const CIRCUIT_BREAKER_THRESHOLD = 10 // 10x overrun triggers abort

      if (costMultiplier > CIRCUIT_BREAKER_THRESHOLD) {
        // CRITICAL: Cost runaway detected!
        console.error(`[OpenRouterClient] CIRCUIT BREAKER TRIGGERED!`, {
          reserved: reservedAmount.toFixed(4),
          actual: actualCost.toFixed(4),
          multiplier: `${costMultiplier.toFixed(2)}x`,
          model: request.model,
          userId
        })

        // Refund the reservation (don't charge the user)
        await this.refundBalance(userId, reservedAmount)

        // Log critical incident
        await prisma.usageLog.create({
          data: {
            userId,
            providerName: 'openrouter',
            modelName: request.model,
            taskType: 'completion',
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
            providerCost: 0,
            cost: 0,
            success: false,
            errorCode: 'CIRCUIT_BREAKER',
            errorMessage: `Cost runaway: ${costMultiplier.toFixed(2)}x overrun (Reserved: $${reservedAmount.toFixed(4)}, Actual: $${actualCost.toFixed(4)})`,
          }
        })

        // Send email notification (non-blocking)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true }
        })

        if (user?.email) {
          sendCircuitBreakerAlert({
            userEmail: user.email,
            userName: user.name || 'User',
            model: request.model,
            estimatedCost: reservedAmount,
            actualCost,
            taskDescription: request.messages.map(m => m.content).join(' ').slice(0, 200),
            timestamp: new Date()
          }).catch(err => console.error('[Email] Circuit breaker alert failed:', err))
        }

        throw new Error(`Cost runaway detected: ${costMultiplier.toFixed(2)}x overrun. Request aborted for safety. Reserved: $${reservedAmount.toFixed(4)}, Actual: $${actualCost.toFixed(4)}`)
      }

      // WEEK 2 IMPROVEMENT: Refund difference between reserved and actual
      if (actualCost < reservedAmount) {
        const refundAmount = reservedAmount - actualCost
        await this.refundBalance(userId, refundAmount)
        console.log(`[OpenRouterClient] Refunded difference: $${refundAmount.toFixed(4)}`)
      } else if (actualCost > reservedAmount) {
        // Actual cost higher than estimate - deduct the difference
        const additionalCost = actualCost - reservedAmount
        const deducted = await this.deductBalance(userId, additionalCost)
        if (!deducted) {
          // Refund the reservation and fail
          await this.refundBalance(userId, reservedAmount)
          throw new Error(`Insufficient balance for actual cost. Additional $${additionalCost.toFixed(4)} required.`)
        }
        console.log(`[OpenRouterClient] Deducted additional: $${additionalCost.toFixed(4)}`)
      }
      // If equal, no adjustment needed (already reserved)

      // Create usage log (FIX #4b: Safe token access for error responses)
      const inputTokens = response.usage?.prompt_tokens ?? 1000
      const outputTokens = response.usage?.completion_tokens ?? 1000
      const totalTokens = response.usage?.total_tokens ?? 2000

      const usageLog = await prisma.usageLog.create({
        data: {
          userId,
          providerName: 'openrouter',
          modelName: request.model,
          taskType: 'completion', // Could be inferred from request
          inputTokens,
          outputTokens,
          totalTokens,
          providerCost: actualCost / 1.25, // Remove 25% markup for provider cost
          markup: 0.25,
          cost: actualCost,
          latencyMs,
          success: true,
        }
      })

      // Track usage in key pool (totalTokens already defined above)
      await keyPoolManager.trackUsage(
        keyPool.id,
        usageLog.id,
        actualCost,
        true,
        totalTokens,
        request.model,
        latencyMs
      )

      console.log(`[OpenRouterClient] Request successful: ${request.model} ($${actualCost.toFixed(4)})`)

      // Add totalCost to response for extraction workflow tracking
      return {
        ...response,
        totalCost: actualCost
      }
    } catch (error: any) {
      // FIX #5: Handle timeout and connection errors with retry
      const isRetryableError =
        error.message?.includes('timeout') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'UND_ERR_CONNECT_TIMEOUT'

      if (isRetryableError && attempt < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000 // Exponential backoff with jitter
        console.warn(`[OpenRouterClient] ⚠️ Connection/timeout error (attempt ${attempt + 1}/${this.maxRetries})`)
        console.log(`[OpenRouterClient] 🔄 Retrying in ${Math.round(delay)}ms...`)
        await this.sleep(delay)
        return await this.chatWithRetry(userId, request, attempt + 1, reservedAmount)
      }

      // Handle rate limit error (429)
      if (error.status === 429 || error.code === 429) {
        console.warn(`[OpenRouterClient] Rate limit hit (attempt ${attempt + 1}/${this.maxRetries})`)

        // Get the key that was used (if available)
        const keyPool = await keyPoolManager.getAvailableKey(userId)
        if (keyPool) {
          // Mark key in cooldown
          const retryAfter = this.parseRetryAfter(error)
          await keyPoolManager.markCooldown(keyPool.id, retryAfter)
        }

        // Retry with different key if attempts remaining
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt) // Exponential backoff
          console.log(`[OpenRouterClient] Retrying in ${delay}ms...`)
          await this.sleep(delay)
          return await this.chatWithRetry(userId, request, attempt + 1, reservedAmount)
        }

        throw new Error('Rate limit exceeded. All keys exhausted.')
      }

      // Handle other errors
      console.error('[OpenRouterClient] Request failed:', error)

      // Log failed request
      const keyPool = await keyPoolManager.getAvailableKey(userId)
      if (keyPool) {
        const usageLog = await prisma.usageLog.create({
          data: {
            userId,
            providerName: 'openrouter',
            modelName: request.model,
            taskType: 'completion',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            providerCost: 0,
            cost: 0,
            success: false,
            errorCode: error.code?.toString(),
            errorMessage: error.message,
          }
        })

        await keyPoolManager.trackUsage(
          keyPool.id,
          usageLog.id,
          0,
          false,
          0,
          request.model
        )
      }

      throw error
    }
  }

  /**
   * Make the actual HTTP request to OpenRouter with timeout
   *
   * @param apiKey - Decrypted API key
   * @param request - Chat request
   * @returns Chat response
   */
  private async makeRequest(apiKey: string, request: ChatRequest): Promise<ChatResponse> {
    // FIX #5: Add 60s timeout with AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 seconds

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://komilion.com',
          'X-Title': 'Komilion - Universal LLM Router',
        },
        body: JSON.stringify(request),
        signal: controller.signal, // Add timeout signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error: OpenRouterError = await response.json()
        console.error('[OpenRouterClient] 🚨 OpenRouter API error:', {
          status: response.status,
          code: error.error.code,
          message: error.error.message,
          fullError: JSON.stringify(error, null, 2)
        })
        throw {
          status: response.status,
          code: error.error.code,
          message: error.error.message,
        }
      }

      const jsonResponse = await response.json()

      // FIX #4b: Log if response has error field (OpenRouter returns 200 with error object)
      if (jsonResponse.error) {
        console.error('[OpenRouterClient] 🚨 OpenRouter returned error in successful response:', {
          error: jsonResponse.error,
          user_id: jsonResponse.user_id,
          fullResponse: JSON.stringify(jsonResponse, null, 2)
        })
      }

      return jsonResponse
    } catch (error: any) {
      clearTimeout(timeoutId)

      // Handle timeout abort
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 60s')
      }

      throw error
    }
  }

  /**
   * Calculate cost from OpenRouter response
   *
   * Week 2 Improvement: Uses PricingManager with 5-level fallback
   *
   * @param response - Chat response
   * @param model - Model name
   * @returns Cost in dollars (with 25% markup)
   */
  private async calculateCost(response: ChatResponse, model: string): Promise<number> {
    // LAYER 3: Safe defaults with optional chaining (prevents crash when usage is missing)
    const inputTokens = response.usage?.prompt_tokens ?? 1000
    const outputTokens = response.usage?.completion_tokens ?? 1000

    // LAYER 4: Detailed logging when usage is missing (helps debug)
    if (!response.usage) {
      console.warn('[OpenRouterClient] ⚠️ Response missing usage data - using conservative estimates:', {
        model,
        estimatedInput: inputTokens,
        estimatedOutput: outputTokens,
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        responseKeys: Object.keys(response).join(', ')
      })
    }

    try {
      // Use PricingManager for intelligent pricing with fallbacks
      const pricingManager = getPricingManager()
      const result = await pricingManager.calculateCost(model, inputTokens, outputTokens)

      console.log(`[OpenRouterClient] Cost calculated via PricingManager:`, {
        model,
        cost: result.cost.toFixed(6),
        source: result.pricing.source,
        confidence: result.pricing.confidence,
        breakdown: {
          input: result.breakdown.inputCost.toFixed(6),
          output: result.breakdown.outputCost.toFixed(6),
          markup: result.breakdown.markup.toFixed(6),
        },
      })

      return result.cost
    } catch (error) {
      // Fallback to safe defaults if PricingManager fails
      console.error('[OpenRouterClient] PricingManager failed, using safe defaults:', error)

      const safeInputPrice = 5 / 1_000_000   // $5 per 1M tokens
      const safeOutputPrice = 20 / 1_000_000 // $20 per 1M tokens

      const inputCost = inputTokens * safeInputPrice
      const outputCost = outputTokens * safeOutputPrice
      const providerCost = inputCost + outputCost
      const finalCost = providerCost * 1.25 // 25% markup

      console.warn(`[OpenRouterClient] Safe default cost: $${finalCost.toFixed(6)}`)
      return finalCost
    }
  }

  /**
   * Deduct balance from user wallet (atomic transaction)
   *
   * @param userId - User ID
   * @param cost - Cost to deduct in dollars
   * @returns True if successful, false if insufficient balance
   */
  private async deductBalance(userId: string, cost: number): Promise<boolean> {
    try {
      // Atomic update with row lock
      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          walletBalance: {
            gte: cost // Only update if balance >= cost
          }
        },
        data: {
          walletBalance: {
            decrement: cost
          },
          totalCost: {
            increment: cost
          },
          totalRequests: {
            increment: 1
          }
        }
      })

      return updated.count > 0
    } catch (error) {
      console.error('[OpenRouterClient] Error deducting balance:', error)
      return false
    }
  }

  /**
   * Parse Retry-After header from 429 response
   *
   * @param error - Error object
   * @returns Retry delay in milliseconds (default: 60000)
   */
  private parseRetryAfter(error: any): number {
    // Try to get Retry-After from headers or error metadata
    const retryAfter = error.retryAfter || error.headers?.['retry-after']

    if (retryAfter) {
      // Could be seconds or HTTP date
      const seconds = parseInt(retryAfter)
      if (!isNaN(seconds)) {
        return seconds * 1000
      }
    }

    // Default: 60 seconds
    return 60000
  }

  /**
   * Sleep utility
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Estimate cost for a request before execution
   *
   * Week 2 Improvement: Conservative estimation
   *
   * @param request - Chat request
   * @returns Estimated cost in dollars
   */
  private async estimateCost(request: ChatRequest): Promise<number> {
    try {
      const pricingManager = getPricingManager()
      const pricing = await pricingManager.getModelPricing(request.model)

      // Estimate token counts
      // Input: rough estimate based on message content length
      const inputText = request.messages.map(m => m.content).join(' ')
      const estimatedInputTokens = Math.ceil(inputText.length / 4) // ~4 chars per token

      // Output: use max_tokens if provided, otherwise conservative default
      const estimatedOutputTokens = request.max_tokens || 1000

      // Calculate with 20% buffer for safety
      const inputCost = estimatedInputTokens * pricing.inputPricePerToken
      const outputCost = estimatedOutputTokens * pricing.outputPricePerToken
      const baseCost = inputCost + outputCost
      const markup = baseCost * 0.25 // 25% markup
      const total = baseCost + markup
      const withBuffer = total * 1.2 // 20% safety buffer

      console.log(`[OpenRouterClient] Cost estimate:`, {
        model: request.model,
        estimatedInputTokens,
        estimatedOutputTokens,
        baseCost: baseCost.toFixed(6),
        markup: markup.toFixed(6),
        total: total.toFixed(6),
        withBuffer: withBuffer.toFixed(6),
        pricingSource: pricing.source,
        confidence: pricing.confidence
      })

      return withBuffer
    } catch (error) {
      console.error('[OpenRouterClient] Cost estimation failed, using safe default:', error)
      // Safe default: $0.05 per request
      return 0.05
    }
  }

  /**
   * Reserve balance for a request
   *
   * Week 2 Improvement: Atomic reservation
   *
   * @param userId - User ID
   * @param amount - Amount to reserve
   * @returns True if successful
   */
  private async reserveBalance(userId: string, amount: number): Promise<boolean> {
    try {
      // Atomic deduction with row lock
      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          walletBalance: {
            gte: amount
          }
        },
        data: {
          walletBalance: {
            decrement: amount
          }
        }
      })

      if (updated.count > 0) {
        console.log(`[OpenRouterClient] Reserved $${amount.toFixed(4)} from wallet`)
        return true
      }

      console.warn(`[OpenRouterClient] Failed to reserve $${amount.toFixed(4)} - insufficient balance`)
      return false
    } catch (error) {
      console.error('[OpenRouterClient] Error reserving balance:', error)
      return false
    }
  }

  /**
   * Refund balance to user wallet
   *
   * Week 2 Improvement: Automatic refunds
   *
   * @param userId - User ID
   * @param amount - Amount to refund
   */
  private async refundBalance(userId: string, amount: number): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: amount
          }
        }
      })

      console.log(`[OpenRouterClient] Refunded $${amount.toFixed(4)} to wallet`)
    } catch (error) {
      console.error('[OpenRouterClient] Error refunding balance:', error)
      // Log critical error but don't throw - money already deducted
    }
  }
}

/**
 * Singleton instance
 */
export const openRouterClient = new OpenRouterClient()
