/**
 * OpenRouter Client (Simplified Standalone Version)
 *
 * Minimal OpenRouter API client without database/crypto dependencies.
 * Uses environment variables for API key.
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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
}

/**
 * Chat response structure
 */
export interface ChatResponse {
  id: string
  model: string
  created: number
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  totalCost?: number
}

/**
 * Simple OpenRouter client
 */
export class OpenRouterClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment');
    }
  }

  /**
   * Make chat completion request
   *
   * @param userId - User identifier (for routing/logging)
   * @param request - Chat request
   * @returns Chat response
   */
  async chat(userId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/zelda-meets-claude',
        'X-Title': 'Zelda Meets Claude - BRF Extraction',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    // Calculate cost based on usage (rough estimate)
    if (data.usage) {
      const promptCost = (data.usage.prompt_tokens / 1000000) * 2.5; // $2.50 per 1M tokens (estimate)
      const completionCost = (data.usage.completion_tokens / 1000000) * 10; // $10 per 1M tokens (estimate)
      data.totalCost = promptCost + completionCost;
    }

    return data;
  }

  /**
   * Get available models
   */
  async getModels(): Promise<any> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Create client instance
 */
export function createOpenRouterClient(): OpenRouterClient {
  return new OpenRouterClient();
}
