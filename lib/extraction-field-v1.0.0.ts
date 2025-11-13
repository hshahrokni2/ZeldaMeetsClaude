/**
 * Base field classes for extraction with confidence tracking.
 *
 * This module provides the foundational ExtractionField classes that enable:
 * - Per-field confidence scoring (0.0-1.0)
 * - Source tracking (which extraction method was used)
 * - Evidence tracking (which PDF pages contained the data)
 * - Multi-source aggregation (when multiple methods extract the same field)
 * - Validation status tracking (valid/warning/error)
 *
 * Design Philosophy:
 * - NEVER null data due to validation failures
 * - Preserve both extracted and calculated values
 * - Track all extraction attempts and methods
 * - Enable tolerant validation with warnings instead of rejections
 *
 * Ported from: gracian_pipeline/models/base_fields.py (373 lines)
 * Port date: November 4, 2025
 * Version: v1.0.0
 */

import { z } from 'zod';

// =============================================================================
// BASE EXTRACTION FIELD
// =============================================================================

/**
 * Alternative extraction for multi-source aggregation
 */
export interface AlternativeValue<T = any> {
  value: T;
  confidence: number;
  source: string;
  extraction_method?: string;
  model_used?: string;
  [key: string]: any; // Allow additional metadata
}

/**
 * Base class for all extracted fields with confidence tracking.
 *
 * This is the foundation for tolerant validation - we track confidence,
 * source, and evidence for every field, allowing us to preserve data
 * even when validation warnings occur.
 */
export interface ExtractionField<T = any> {
  /** The extracted value (type-specific in subclasses) */
  value: T | null;

  /** Confidence score 0.0-1.0 (0.0 = not found, 1.0 = perfect) */
  confidence: number;

  /** Extraction method used: "structured_table"|"regex"|"vision_llm"|"calculated"|"not_found" */
  source?: string | null;

  /** PDF pages where data was found (1-indexed) */
  evidence_pages: number[];

  /** Detailed method name (e.g., "hierarchical_table_parser", "swedish_regex") */
  extraction_method?: string | null;

  /** For LLM extractions: "gpt-5"|"gemini-2.5-pro"|"qwen-2.5-vl"|etc */
  model_used?: string | null;

  /** Validation result: "valid"|"warning"|"error"|"unknown" */
  validation_status?: string | null;

  /** Other extractions for this field (multi-source) */
  alternative_values: AlternativeValue<T>[];

  /** When this field was extracted */
  extraction_timestamp?: string | null;
}

/**
 * Create base ExtractionField with defaults
 */
export function createExtractionField<T>(
  value: T | null = null,
  confidence: number = 0.0,
  source: string | null = null
): ExtractionField<T> {
  return {
    value,
    confidence: Math.max(0.0, Math.min(1.0, confidence)),
    source,
    evidence_pages: [],
    extraction_method: null,
    model_used: null,
    validation_status: null,
    alternative_values: [],
    extraction_timestamp: new Date().toISOString(),
  };
}

/**
 * Track an alternative extraction for this field.
 *
 * Used when multiple extraction methods return different values for the same field.
 * Enables multi-source aggregation and consensus-building.
 */
export function addAlternative<T>(
  field: ExtractionField<T>,
  value: T,
  confidence: number,
  source: string,
  metadata: Record<string, any> = {}
): void {
  field.alternative_values.push({
    value,
    confidence,
    source,
    ...metadata,
  });
}

/**
 * Check if all values in list are effectively equal.
 */
function allValuesAgree<T>(values: (T | null)[]): boolean {
  if (values.length === 0) return true;

  // Handle numeric values with tolerance
  try {
    const numericValues = values
      .filter((v) => v !== null && typeof v === 'number') as number[];

    if (numericValues.length < 2) return true;

    // Check if all within 1% of each other
    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    const tolerance = Math.abs(mean * 0.01);
    return numericValues.every((v) => Math.abs(v - mean) <= tolerance);
  } catch (error) {
    // Non-numeric: strict equality
    const first = values[0];
    return values.every((v) => v === first);
  }
}

/**
 * Resolve best value from multiple extractions.
 *
 * Strategy:
 * - If all values agree: Use highest confidence
 * - If values disagree: Use weighted vote, apply disagreement penalty
 *
 * This updates field.value, field.confidence, and field.source
 * based on aggregation of all alternatives.
 */
export function resolveBestValue<T>(field: ExtractionField<T>): void {
  if (field.alternative_values.length === 0) return;

  // Collect all extractions (current + alternatives)
  const allExtractions = [
    {
      value: field.value,
      confidence: field.confidence,
      source: field.source || 'unknown',
    },
    ...field.alternative_values,
  ];

  // Check if all agree
  const values = allExtractions.map((e) => e.value);
  if (allValuesAgree(values)) {
    // Agreement: Use highest confidence, boost for consensus
    const best = allExtractions.reduce((prev, curr) =>
      curr.confidence > prev.confidence ? curr : prev
    );
    const numSources = allExtractions.length;
    const boost = Math.min(0.1, numSources * 0.03); // +3% per source, max +10%

    field.value = best.value;
    field.confidence = Math.min(1.0, best.confidence + boost);
    field.source = 'multi_source_consensus';
  } else {
    // Disagreement: Weighted vote
    let weightedSum = 0.0;
    let totalWeight = 0.0;

    for (const extraction of allExtractions) {
      const weight = extraction.confidence;
      // Convert value to numeric if possible for weighted average
      try {
        const numericValue = Number(extraction.value);
        if (!isNaN(numericValue)) {
          weightedSum += numericValue * weight;
          totalWeight += weight;
        }
      } catch (error) {
        // Non-numeric value, skip weighted average
      }
    }

    if (totalWeight > 0) {
      // Numeric weighted average
      field.value = (weightedSum / totalWeight) as T;
      field.confidence = totalWeight / allExtractions.length;
      // Apply disagreement penalty
      field.confidence = Math.max(0.0, field.confidence - 0.15);
      field.source = 'multi_source_weighted';
    } else {
      // Non-numeric, use highest confidence
      const best = allExtractions.reduce((prev, curr) =>
        curr.confidence > prev.confidence ? curr : prev
      );
      field.value = best.value;
      field.confidence = best.confidence - 0.15; // Disagreement penalty
      field.source = 'multi_source_disagreement';
    }
  }
}

// =============================================================================
// STRING FIELD
// =============================================================================

export type StringField = ExtractionField<string>;

/**
 * Create StringField with whitespace stripping
 */
export function createStringField(
  value: string | null = null,
  confidence: number = 0.0,
  source: string | null = null
): StringField {
  // Strip whitespace from value
  const cleanedValue = value !== null && typeof value === 'string' ? value.trim() : value;

  return createExtractionField<string>(cleanedValue, confidence, source);
}

// =============================================================================
// NUMBER FIELD
// =============================================================================

export interface NumberFieldExtra extends ExtractionField<number> {
  /** Original string representation before parsing */
  original_string?: string | null;
}

export type NumberField = NumberFieldExtra;

/**
 * Parse number from various formats.
 *
 * Handles:
 * - Swedish format: "1 234 567,89" → 1234567.89
 * - Standard format: "1,234,567.89" → 1234567.89
 * - Already numeric: pass through
 */
export function parseSwedishNumber(value: any): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    // Remove whitespace and non-breaking spaces
    let cleaned = value.replace(/\s/g, '').replace(/\u00A0/g, '');

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
  }

  return null;
}

/**
 * Create NumberField with Swedish number parsing
 */
export function createNumberField(
  value: number | string | null = null,
  confidence: number = 0.0,
  source: string | null = null
): NumberField {
  const originalString = typeof value === 'string' ? value : null;
  const parsedValue = parseSwedishNumber(value);

  const field = createExtractionField<number>(parsedValue, confidence, source);

  return {
    ...field,
    original_string: originalString,
  };
}

// =============================================================================
// LIST FIELD
// =============================================================================

export type ListField<T = any> = ExtractionField<T[]>;

/**
 * Create ListField ensuring value is array
 */
export function createListField<T = any>(
  value: T | T[] | null = null,
  confidence: number = 0.0,
  source: string | null = null
): ListField<T> {
  // Ensure value is a list
  let listValue: T[] = [];
  if (value === null) {
    listValue = [];
  } else if (Array.isArray(value)) {
    listValue = value;
  } else {
    // Convert single value to list
    listValue = [value];
  }

  return createExtractionField<T[]>(listValue, confidence, source);
}

// =============================================================================
// BOOLEAN FIELD
// =============================================================================

export type BooleanField = ExtractionField<boolean>;

/**
 * Parse boolean from various formats (ja/nej, yes/no, true/false, 1/0).
 */
export function parseSwedishBoolean(value: any): boolean | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const vLower = value.toLowerCase().trim();
    if (['ja', 'yes', 'true', '1', 'sant'].includes(vLower)) return true;
    if (['nej', 'no', 'false', '0', 'falskt'].includes(vLower)) return false;
  }

  if (typeof value === 'number') return Boolean(value);

  return null;
}

/**
 * Create BooleanField with Swedish boolean parsing
 */
export function createBooleanField(
  value: boolean | string | number | null = null,
  confidence: number = 0.0,
  source: string | null = null
): BooleanField {
  const parsedValue = parseSwedishBoolean(value);

  return createExtractionField<boolean>(parsedValue, confidence, source);
}

// =============================================================================
// DATE FIELD
// =============================================================================

export interface DateFieldExtra extends ExtractionField<Date> {
  /** Format string used to parse date (e.g., 'YYYY-MM-DD') */
  date_format?: string | null;
}

export type DateField = DateFieldExtra;

/**
 * Parse date from various formats.
 *
 * Tries:
 * - ISO format: 2024-03-15
 * - Swedish format: 2024-03-15, 15/3/2024, 15 mars 2024
 * - Already Date: pass through
 */
export function parseSwedishDate(value: any): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    // Try common formats
    const formats = [
      { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: 'YMD' }, // 2024-03-15
      { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: 'DMY' }, // 15/03/2024
      { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, order: 'YMD' }, // 2024/03/15
      { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, order: 'DMY' }, // 15.03.2024
      { regex: /^(\d{4})\.(\d{2})\.(\d{2})$/, order: 'YMD' }, // 2024.03.15
    ];

    for (const { regex, order } of formats) {
      const match = value.match(regex);
      if (match) {
        let year: number, month: number, day: number;

        if (order === 'YMD') {
          [, year, month, day] = match.map(Number);
        } else {
          // DMY
          [, day, month, year] = match.map(Number);
        }

        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Try Date constructor as fallback
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    } catch (error) {
      // Parsing failed
    }
  }

  return null;
}

/**
 * Create DateField with multi-format parsing
 */
export function createDateField(
  value: Date | string | null = null,
  confidence: number = 0.0,
  source: string | null = null
): DateField {
  const parsedValue = parseSwedishDate(value);

  const field = createExtractionField<Date>(parsedValue, confidence, source);

  return {
    ...field,
    date_format: null,
  };
}

// =============================================================================
// DICT FIELD
// =============================================================================

export type DictField<T = Record<string, any>> = ExtractionField<T>;

/**
 * Create DictField ensuring value is object
 */
export function createDictField<T extends Record<string, any> = Record<string, any>>(
  value: T | null = null,
  confidence: number = 0.0,
  source: string | null = null
): DictField<T> {
  // Ensure value is a dictionary
  let dictValue: T | null = value;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    dictValue = {} as T;
  }

  return createExtractionField<T>(dictValue, confidence, source);
}

// =============================================================================
// CONVENIENCE TYPE ALIASES
// =============================================================================

export type TextField = StringField;
export type IntegerField = NumberField;
export type FloatField = NumberField;
export type DecimalField = NumberField;
export type ArrayField<T = any> = ListField<T>;
export type ObjectField<T extends Record<string, any> = Record<string, any>> = DictField<T>;

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

/**
 * Zod schema for ExtractionField validation
 */
export const ExtractionFieldSchema = z.object({
  value: z.any().nullable(),
  confidence: z.number().min(0.0).max(1.0),
  source: z.string().nullable().optional(),
  evidence_pages: z.array(z.number()),
  extraction_method: z.string().nullable().optional(),
  model_used: z.string().nullable().optional(),
  validation_status: z.string().nullable().optional(),
  alternative_values: z.array(z.any()),
  extraction_timestamp: z.string().nullable().optional(),
});

/**
 * Zod schema for StringField
 */
export const StringFieldSchema = ExtractionFieldSchema.extend({
  value: z.string().nullable(),
});

/**
 * Zod schema for NumberField
 */
export const NumberFieldSchema = ExtractionFieldSchema.extend({
  value: z.number().nullable(),
  original_string: z.string().nullable().optional(),
});

/**
 * Zod schema for ListField
 */
export const ListFieldSchema = ExtractionFieldSchema.extend({
  value: z.array(z.any()),
});

/**
 * Zod schema for BooleanField
 */
export const BooleanFieldSchema = ExtractionFieldSchema.extend({
  value: z.boolean().nullable(),
});

/**
 * Zod schema for DateField
 */
export const DateFieldSchema = ExtractionFieldSchema.extend({
  value: z.date().nullable(),
  date_format: z.string().nullable().optional(),
});

/**
 * Zod schema for DictField
 */
export const DictFieldSchema = ExtractionFieldSchema.extend({
  value: z.record(z.string(), z.any()).nullable(),
});
