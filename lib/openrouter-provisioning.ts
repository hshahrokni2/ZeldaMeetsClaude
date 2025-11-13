/**
 * OpenRouter Provisioning API Client
 * Automates creation, management, and deletion of OpenRouter API keys
 *
 * Documentation: https://openrouter.ai/docs/features/provisioning-api-keys
 */

const OPENROUTER_PROVISIONING_BASE = 'https://openrouter.ai/api/v1/keys'

// Get provisioning key from environment
const PROVISIONING_KEY = process.env.OPENROUTER_PROVISIONING_KEY

if (!PROVISIONING_KEY) {
  console.warn(
    'OPENROUTER_PROVISIONING_KEY not set. ' +
    'Automated key provisioning will not be available. ' +
    'Get a provisioning key at: https://openrouter.ai/settings/provisioning-keys'
  )
}

/**
 * OpenRouter API key data structure
 */
export interface OpenRouterKey {
  key: string              // The actual API key (sk-or-v1-...)
  label: string            // Masked display format
  name: string             // User-friendly name
  limit?: number           // Credit limit (in cents)
  limit_remaining?: number // Remaining credits
  disabled: boolean        // Is key disabled
  include_byok_in_limit?: boolean
}

/**
 * Create a new OpenRouter API key via provisioning API
 *
 * @param name - User-friendly name for the key (e.g., "user-123-key-1")
 * @param limitDollars - Credit limit in dollars (will be converted to cents)
 * @param metadata - Optional metadata for tracking
 * @returns Created key with details
 */
export async function createOpenRouterKey(
  name: string,
  limitDollars?: number,
  metadata?: Record<string, any>
): Promise<OpenRouterKey> {
  if (!PROVISIONING_KEY) {
    throw new Error('OPENROUTER_PROVISIONING_KEY not configured')
  }

  try {
    const payload: any = { name }

    // Convert dollars to cents for OpenRouter API
    if (limitDollars !== undefined) {
      payload.limit = Math.round(limitDollars * 100)
    }

    // Add metadata if provided (encoded in name for now, as API may not support separate metadata field)
    if (metadata) {
      payload.name = `${name}_${JSON.stringify(metadata)}`
    }

    const response = await fetch(OPENROUTER_PROVISIONING_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${error}`)
    }

    const data = await response.json()

    // OpenRouter returns the full key in 'key' field (only on creation)
    // and metadata in 'data' field. Merge them together.
    const keyData = data.data || {}
    const fullKey = data.key || keyData.key || null

    if (!fullKey) {
      console.error('OpenRouter API response:', JSON.stringify(data, null, 2))
      throw new Error('OpenRouter API did not return a key in the response')
    }

    return {
      ...keyData,
      key: fullKey
    } as OpenRouterKey
  } catch (error) {
    console.error('Error creating OpenRouter key:', error)
    throw new Error(`Failed to create OpenRouter key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all provisioned OpenRouter keys
 *
 * @param offset - Pagination offset (default: 0)
 * @param limit - Number of keys to return (default: 100, max: 100)
 * @returns Array of keys
 */
export async function listOpenRouterKeys(
  offset: number = 0,
  limit: number = 100
): Promise<OpenRouterKey[]> {
  if (!PROVISIONING_KEY) {
    throw new Error('OPENROUTER_PROVISIONING_KEY not configured')
  }

  try {
    const url = new URL(OPENROUTER_PROVISIONING_BASE)
    url.searchParams.set('offset', offset.toString())
    url.searchParams.set('limit', limit.toString())

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.data as OpenRouterKey[]
  } catch (error) {
    console.error('Error listing OpenRouter keys:', error)
    throw new Error(`Failed to list OpenRouter keys: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get details for a specific OpenRouter key
 *
 * @param keyHash - Key hash (from key string or database)
 * @returns Key details
 */
export async function getOpenRouterKey(keyHash: string): Promise<OpenRouterKey> {
  if (!PROVISIONING_KEY) {
    throw new Error('OPENROUTER_PROVISIONING_KEY not configured')
  }

  try {
    const response = await fetch(`${OPENROUTER_PROVISIONING_BASE}/${keyHash}`, {
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.data as OpenRouterKey
  } catch (error) {
    console.error('Error getting OpenRouter key:', error)
    throw new Error(`Failed to get OpenRouter key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update an existing OpenRouter key
 *
 * @param keyHash - Key hash to update
 * @param updates - Fields to update (limit, disabled, name)
 * @returns Updated key
 */
export async function updateOpenRouterKey(
  keyHash: string,
  updates: {
    limit?: number        // Credit limit in cents
    disabled?: boolean
    name?: string
  }
): Promise<OpenRouterKey> {
  if (!PROVISIONING_KEY) {
    throw new Error('OPENROUTER_PROVISIONING_KEY not configured')
  }

  try {
    const response = await fetch(`${OPENROUTER_PROVISIONING_BASE}/${keyHash}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.data as OpenRouterKey
  } catch (error) {
    console.error('Error updating OpenRouter key:', error)
    throw new Error(`Failed to update OpenRouter key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete an OpenRouter key
 *
 * @param keyHash - Key hash to delete
 * @returns Success status
 */
export async function deleteOpenRouterKey(keyHash: string): Promise<boolean> {
  if (!PROVISIONING_KEY) {
    throw new Error('OPENROUTER_PROVISIONING_KEY not configured')
  }

  try {
    const response = await fetch(`${OPENROUTER_PROVISIONING_BASE}/${keyHash}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${error}`)
    }

    return true
  } catch (error) {
    console.error('Error deleting OpenRouter key:', error)
    throw new Error(`Failed to delete OpenRouter key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Batch create multiple keys for a user
 *
 * @param userId - User ID for naming
 * @param count - Number of keys to create (default: 10)
 * @param limitDollars - Credit limit per key in dollars
 * @returns Array of created keys
 */
export async function batchCreateKeys(
  userId: string,
  count: number = 10,
  limitDollars?: number
): Promise<OpenRouterKey[]> {
  const keys: OpenRouterKey[] = []
  const errors: string[] = []

  for (let i = 0; i < count; i++) {
    try {
      const key = await createOpenRouterKey(
        `user-${userId}-key-${i + 1}`,
        limitDollars,
        {
          user_id: userId,
          key_index: i,
          created_at: new Date().toISOString()
        }
      )

      keys.push(key)

      // Rate limit protection: wait 100ms between requests
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      const errorMsg = `Failed to create key ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)

      // Continue with remaining keys even if one fails
    }
  }

  if (errors.length > 0) {
    console.warn(`Created ${keys.length}/${count} keys. Errors:`, errors)
  }

  return keys
}

/**
 * Update limits for multiple keys at once
 *
 * @param keyHashes - Array of key hashes to update
 * @param limitDollars - New limit in dollars
 * @returns Number of successfully updated keys
 */
export async function batchUpdateLimits(
  keyHashes: string[],
  limitDollars: number
): Promise<number> {
  const limitCents = Math.round(limitDollars * 100)
  let successCount = 0

  for (const keyHash of keyHashes) {
    try {
      await updateOpenRouterKey(keyHash, { limit: limitCents })
      successCount++

      // Rate limit protection: wait 100ms between requests
      if (keyHash !== keyHashes[keyHashes.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`Failed to update key ${keyHash}:`, error)
      // Continue with remaining keys
    }
  }

  return successCount
}

/**
 * Test if provisioning API is accessible
 *
 * @returns True if provisioning key is valid
 */
export async function testProvisioningAccess(): Promise<boolean> {
  if (!PROVISIONING_KEY) {
    return false
  }

  try {
    await listOpenRouterKeys(0, 1)
    return true
  } catch (error) {
    console.error('Provisioning API test failed:', error)
    return false
  }
}
