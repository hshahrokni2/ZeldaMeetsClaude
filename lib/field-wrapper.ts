/**
 * Field Wrapper - Post-Processing Layer for Agent Responses
 *
 * Wraps plain JSON agent responses in ExtractionField types with:
 * - Confidence inference (0.0-1.0)
 * - Swedish currency normalization (MSEK, kSEK, SEK → tkr)
 * - Original value preservation
 * - Evidence tracking
 *
 * WHY: Keeps battle-tested agent prompts unchanged while adding rich metadata
 *
 * Port date: November 4, 2025
 * Version: v1.0.0
 */

import type { ExtractionField } from './extraction-field-v1.0.0';

// =============================================================================
// SWEDISH CURRENCY NORMALIZATION
// =============================================================================

/**
 * Detect currency unit from Swedish financial string
 *
 * Common units in BRF documents:
 * - MSEK (miljoner SEK) = million SEK
 * - tkr / kSEK / tSEK (tusen SEK) = thousand SEK
 * - SEK (kronor) = SEK
 *
 * @param str - Original string (e.g., "12,5 MSEK")
 * @returns Detected unit or null
 */
export function detectSwedishUnit(str: string | null | undefined): string | null {
  if (!str) return null;

  const normalized = str.toLowerCase().trim();

  // MSEK (million SEK) - highest priority to avoid false matches
  if (/\bmsek\b|miljoner?\s*sek|miljoner?\s*kronor/i.test(normalized)) {
    return 'MSEK';
  }

  // tkr / kSEK / tSEK (thousand SEK)
  if (/\btkr\b|\bksek\b|\btsek\b|tusen\s*sek|tusen\s*kronor/i.test(normalized)) {
    return 'tkr';
  }

  // Plain SEK (check after tkr/MSEK to avoid false matches)
  if (/\bsek\b|kronor/i.test(normalized) && !/[mkt]sek/i.test(normalized)) {
    return 'SEK';
  }

  // Default: assume tkr (most common in BRF reports)
  return 'tkr';
}

/**
 * Normalize Swedish currency to tkr (thousand SEK)
 *
 * Conversion factors:
 * - 1 MSEK = 1,000 tkr
 * - 1 tkr = 1 tkr (no change)
 * - 1,000 SEK = 1 tkr
 *
 * @param value - Numeric value
 * @param unit - Currency unit (MSEK, tkr, SEK, etc.)
 * @returns Normalized value in tkr with conversion tracking
 */
export function normalizeToTkr(
  value: number,
  unit: string | null
): {
  normalized: number;
  conversionFactor: number;
  sourceUnit: string;
} {
  const unitUpper = (unit || 'tkr').toUpperCase();

  switch (unitUpper) {
    case 'MSEK':
      // 1 MSEK = 1,000 tkr
      return {
        normalized: value * 1000,
        conversionFactor: 1000,
        sourceUnit: 'MSEK',
      };

    case 'TKR':
    case 'KSEK':
    case 'TSEK':
      // Already in tkr
      return {
        normalized: value,
        conversionFactor: 1.0,
        sourceUnit: unitUpper,
      };

    case 'SEK':
      // 1,000 SEK = 1 tkr
      return {
        normalized: value / 1000,
        conversionFactor: 0.001,
        sourceUnit: 'SEK',
      };

    default:
      // Unknown unit → assume tkr (most common in BRF)
      console.warn(`[Normalization] Unknown unit "${unit}", assuming tkr`);
      return {
        normalized: value,
        conversionFactor: 1.0,
        sourceUnit: 'unknown',
      };
  }
}

// =============================================================================
// CONFIDENCE INFERENCE
// =============================================================================

/**
 * Infer confidence score from value characteristics
 *
 * Philosophy: Confidence spectrum (not binary!)
 * - 1.0: Perfect match, explicit label
 * - 0.9-0.95: Minor variations (abbreviations, formatting)
 * - 0.85: Approximate values ("ca 12 500 tkr")
 * - 0.7-0.8: Inferred from context
 * - 0.5-0.6: Uncertain but visible
 * - 0.0: Not found
 *
 * @param value - Extracted value
 * @returns Confidence score (0.0-1.0)
 */
export function inferConfidence<T>(value: T | null): number {
  // null/undefined → 0.0 (not found)
  if (value === null || value === undefined) {
    return 0.0;
  }

  // String fields
  if (typeof value === 'string') {
    if (value.length === 0) return 0.0;

    // Very short strings (might be incomplete or abbreviations)
    if (value.length < 3) return 0.60;

    // Check for uncertainty markers
    if (/\b(ca|cirka|ungefär|approximately|~|c\.|ca\.)\b/i.test(value)) {
      return 0.85; // Approximate value (valid but uncertain)
    }

    // Check for abbreviations (unambiguous)
    if (/\b[A-ZÅÄÖ]{2,4}\b/.test(value)) {
      return 0.90; // Likely abbreviation (e.g., "ordf." = ordförande)
    }

    // Check for metadata in parentheses (dates, titles)
    if (/\(.+\)/.test(value)) {
      return 0.95; // Name with metadata (valid, high confidence)
    }

    // Normal string
    return 0.85;
  }

  // Number fields
  if (typeof value === 'number') {
    // Check if it's a "suspicious" round number (might be estimate)
    if (value % 1000 === 0 && value >= 10000) {
      return 0.90; // Round number (likely approximate but valid)
    }

    // Numbers less prone to hallucination
    return 0.95;
  }

  // Boolean fields
  if (typeof value === 'boolean') {
    return 0.90;
  }

  // Array fields
  if (Array.isArray(value)) {
    if (value.length === 0) return 0.0;
    if (value.length === 1) return 0.85; // Single item (might be incomplete)
    return 0.90; // Multiple items (more confident)
  }

  // Object fields
  if (typeof value === 'object') {
    return 0.85; // Complex objects might be partial
  }

  // Default
  return 0.80;
}

// =============================================================================
// FIELD WRAPPING
// =============================================================================

/**
 * Wrap plain extracted value in ExtractionField with metadata
 *
 * Features:
 * - Confidence inference
 * - Currency normalization for _tkr fields
 * - Original value preservation
 * - Evidence page tracking
 *
 * @param value - Extracted value (any type)
 * @param config - Wrapping configuration
 * @returns ExtractionField with full metadata
 */
export function wrapField<T>(
  value: T | null,
  config: {
    fieldName: string;
    originalString?: string | null; // From NumberField or agent response
    evidencePages: number[];
    agentId: string;
    modelUsed: string;
  }
): ExtractionField<T> {
  let finalValue = value;
  let normalizedFrom: string | null = null;

  // Currency normalization for _tkr fields
  if (config.fieldName.endsWith('_tkr') && typeof value === 'number' && value !== null) {
    const unit = detectSwedishUnit(config.originalString || null);
    const { normalized, conversionFactor, sourceUnit } = normalizeToTkr(value, unit);

    if (conversionFactor !== 1.0) {
      console.log(
        `[Normalization] ${config.fieldName}: ${value} ${sourceUnit} → ${normalized} tkr (×${conversionFactor})`
      );
      finalValue = normalized as T;
      normalizedFrom = `${value} ${sourceUnit}`;
    }
  }

  // Infer confidence from value characteristics
  const confidence = inferConfidence(finalValue);

  return {
    value: finalValue,
    confidence,
    source: config.agentId,
    evidence_pages: config.evidencePages,
    extraction_method: config.agentId,
    model_used: config.modelUsed,
    validation_status: null,
    alternative_values: [],
    extraction_timestamp: new Date().toISOString(),
    // @ts-ignore - Add original_string if it's a NumberField
    ...(config.originalString ? { original_string: normalizedFrom || config.originalString } : {}),
  };
}

/**
 * Wrap all fields in agent response
 *
 * Skips metadata fields (evidence_pages, etc.) and wraps all data fields
 *
 * @param plainData - Plain JSON from agent
 * @param config - Wrapping configuration
 * @returns Record of field name → ExtractionField
 */
export function wrapAgentResponse(
  plainData: Record<string, any>,
  config: {
    agentId: string;
    modelUsed: string;
    defaultEvidencePages: number[];
  }
): Record<string, ExtractionField<any>> {
  const wrapped: Record<string, ExtractionField<any>> = {};

  for (const [fieldName, value] of Object.entries(plainData)) {
    // Skip metadata fields (not data fields)
    if (fieldName === 'evidence_pages') continue;

    // Skip auxiliary fields that provide metadata for other fields
    if (fieldName.endsWith('_original') || fieldName.endsWith('_evidence_pages')) continue;

    // Extract field-specific evidence pages if provided
    // Some agents may return evidence per field, otherwise use default
    const evidencePages = plainData[`${fieldName}_evidence_pages`] || plainData.evidence_pages || config.defaultEvidencePages;

    // Check if agent provided original_string for this field (for NumberFields)
    const originalString = plainData[`${fieldName}_original`] || null;

    wrapped[fieldName] = wrapField(value, {
      fieldName,
      originalString,
      evidencePages,
      agentId: config.agentId,
      modelUsed: config.modelUsed,
    });
  }

  return wrapped;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract numeric value from Swedish number string
 *
 * Handles:
 * - Swedish format: "12 500,89" → 12500.89
 * - Standard format: "12,500.89" → 12500.89
 *
 * @param str - Number string
 * @returns Parsed number or null
 */
export function parseSwedishNumberString(str: string | null | undefined): number | null {
  if (!str) return null;

  // Remove whitespace and non-breaking spaces
  let cleaned = str.replace(/\s/g, '').replace(/\u00A0/g, '');

  // Try Swedish format first (comma as decimal)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    try {
      const parsed = parseFloat(cleaned.replace(',', '.'));
      if (!isNaN(parsed)) return parsed;
    } catch (error) {
      // Continue to next strategy
    }
  }

  // Try standard format (period as decimal)
  try {
    // Remove thousand separators
    cleaned = cleaned.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) return parsed;
  } catch (error) {
    // Parsing failed
  }

  return null;
}

/**
 * Get confidence level description
 *
 * @param confidence - Confidence score (0.0-1.0)
 * @returns Human-readable confidence level
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.95) return 'very_high';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.70) return 'medium';
  if (confidence >= 0.50) return 'low';
  if (confidence > 0.0) return 'very_low';
  return 'not_found';
}
