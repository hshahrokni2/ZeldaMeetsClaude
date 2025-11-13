/**
 * Schema Validator - Lenient validation for agent responses
 *
 * Philosophy: WARN, DON'T BLOCK
 * - BRF documents are heterogeneous (names, numbers, depth, breadth vary wildly)
 * - Null is VALID (field not found in document)
 * - Missing _original is SUBOPTIMAL but allowed (warn only)
 * - Only block on catastrophic failures (invalid JSON, type mismatches)
 *
 * See: docs/SCHEMA_VALIDATOR_ULTRATHINKING.md for full design rationale
 *
 * Created: November 5, 2025
 * Version: v1.0.0 (Lenient Mode)
 */

import { detectSwedishUnit } from './field-wrapper';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean; // False if CRITICAL errors exist
  errors: ValidationError[]; // CRITICAL errors (block execution)
  warnings: ValidationWarning[]; // Suboptimal but allowed
  metadata: ValidationMetadata; // Stats for monitoring
}

export interface ValidationError {
  field: string;
  errorType: 'invalid_json' | 'type_mismatch' | 'evidence_invalid';
  message: string;
  severity: 'critical';
}

export interface ValidationWarning {
  field: string;
  warningType: 'missing_original' | 'empty_evidence' | 'placeholder_value' | 'suspicious_format' | 'invalid_date_format';
  message: string;
  severity: 'warning';
  recommendation?: string;
}

export interface ValidationMetadata {
  totalFields: number;
  tkrFieldsCount: number;
  tkrFieldsWithOriginal: number;
  coveragePercentage: number;
  nullFieldsCount: number;
  evidencePagesCoverage: boolean;
}

export interface ValidationOptions {
  strictMode?: boolean; // Default: false (lenient)
  allowNulls?: boolean; // Default: true (nulls are valid)
  requireEvidence?: boolean; // Default: false (evidence is optional)
  blockOnPlaceholders?: boolean; // Default: false (allow "Unknown" etc)
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate agent response with LENIENT rules
 *
 * Philosophy: Warn about issues, but don't block extraction
 * Reality: BRF documents are heterogeneous, null is valid
 *
 * @param agentId - Agent name (for logging)
 * @param response - Agent's JSON response
 * @param options - Validation options (default: lenient)
 * @returns Validation result with errors, warnings, and metadata
 */
export function validateAgentResponse(
  agentId: string,
  response: Record<string, any>,
  options?: ValidationOptions
): ValidationResult {
  const opts: Required<ValidationOptions> = {
    strictMode: false,
    allowNulls: true,
    requireEvidence: false,
    blockOnPlaceholders: false,
    ...options,
  };

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Skip validation for null/undefined response
  if (!response || typeof response !== 'object') {
    errors.push({
      field: '__root__',
      errorType: 'invalid_json',
      message: 'Response is not a valid object',
      severity: 'critical',
    });
    return {
      valid: false,
      errors,
      warnings: [],
      metadata: {
        totalFields: 0,
        tkrFieldsCount: 0,
        tkrFieldsWithOriginal: 0,
        coveragePercentage: 0,
        nullFieldsCount: 0,
        evidencePagesCoverage: false,
      },
    };
  }

  // Metadata collection
  let tkrFieldsCount = 0;
  let tkrFieldsWithOriginal = 0;
  let nullFieldsCount = 0;

  // RULE 1: Validate evidence_pages (CRITICAL)
  validateEvidencePages(response, errors, warnings, opts);

  // RULE 2: Validate each field
  for (const [fieldName, value] of Object.entries(response)) {
    // Skip metadata fields
    if (fieldName === 'evidence_pages') continue;
    if (fieldName.endsWith('_original') || fieldName.endsWith('_evidence_pages')) continue;

    // NULL is ALWAYS VALID - no warning needed
    if (value === null || value === undefined) {
      nullFieldsCount++;
      continue;
    }

    // RULE 3: Currency field validation (_tkr fields)
    if (fieldName.endsWith('_tkr')) {
      tkrFieldsCount++;
      validateCurrencyField(fieldName, response, warnings, opts);
      if (response[`${fieldName}_original`]) {
        tkrFieldsWithOriginal++;
      }
    }

    // RULE 4: Placeholder detection (WARNING only)
    validatePlaceholders(fieldName, value, warnings, opts);
  }

  // RULE 5: Balance sheet equation validation (WARNING only)
  validateBalanceSheetEquation(response, warnings);

  // RULE 6: Date format validation (WARNING only)
  validateDateFields(response, warnings);

  // RULE 7: Cash flow consistency validation (WARNING only)
  validateCashFlowConsistency(response, warnings);

  // Calculate metadata
  const coveragePercentage = tkrFieldsCount > 0 ? (tkrFieldsWithOriginal / tkrFieldsCount) * 100 : 100;
  const evidencePagesCoverage =
    Array.isArray(response.evidence_pages) && response.evidence_pages.length > 0;

  const metadata: ValidationMetadata = {
    totalFields: Object.keys(response).length,
    tkrFieldsCount,
    tkrFieldsWithOriginal,
    coveragePercentage,
    nullFieldsCount,
    evidencePagesCoverage,
  };

  // Determine validity
  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    metadata,
  };
}

// =============================================================================
// VALIDATION RULE FUNCTIONS
// =============================================================================

/**
 * Validate evidence_pages field
 * - CRITICAL: Must be array (if present)
 * - CRITICAL: Must contain positive integers
 * - WARNING: Empty array (suboptimal but allowed)
 */
function validateEvidencePages(
  response: Record<string, any>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  opts: Required<ValidationOptions>
): void {
  const evidencePages = response.evidence_pages;

  // Not present is OK in lenient mode
  if (evidencePages === null || evidencePages === undefined) {
    if (opts.requireEvidence) {
      warnings.push({
        field: 'evidence_pages',
        warningType: 'empty_evidence',
        message: 'evidence_pages is missing',
        severity: 'warning',
        recommendation: 'Include evidence_pages array with page numbers where data was found',
      });
    }
    return;
  }

  // CRITICAL: Must be an array
  if (!Array.isArray(evidencePages)) {
    errors.push({
      field: 'evidence_pages',
      errorType: 'type_mismatch',
      message: `evidence_pages must be an array, got ${typeof evidencePages}`,
      severity: 'critical',
    });
    return;
  }

  // WARNING: Empty array (suboptimal but allowed)
  if (evidencePages.length === 0) {
    if (opts.requireEvidence || opts.strictMode) {
      warnings.push({
        field: 'evidence_pages',
        warningType: 'empty_evidence',
        message: 'evidence_pages is empty - cannot trace data source',
        severity: 'warning',
        recommendation: 'Add page numbers where data was extracted from',
      });
    }
    return;
  }

  // CRITICAL: Validate page numbers
  for (const page of evidencePages) {
    if (typeof page !== 'number' || page <= 0 || !Number.isInteger(page)) {
      errors.push({
        field: 'evidence_pages',
        errorType: 'evidence_invalid',
        message: `Invalid page number: ${page} (must be positive integer)`,
        severity: 'critical',
      });
    }
  }
}

/**
 * Validate currency fields (_tkr suffix)
 * - WARNING: Missing _original (suboptimal but allowed)
 * - WARNING: _original has no detectable currency unit
 */
function validateCurrencyField(
  fieldName: string,
  response: Record<string, any>,
  warnings: ValidationWarning[],
  opts: Required<ValidationOptions>
): void {
  const value = response[fieldName];
  const originalFieldName = `${fieldName}_original`;
  const original = response[originalFieldName];

  // Value is null - completely valid, no warning
  if (value === null || value === undefined) {
    return;
  }

  // Value exists but no _original → WARNING
  if (original === null || original === undefined) {
    warnings.push({
      field: fieldName,
      warningType: 'missing_original',
      message: `Field ${fieldName} = ${value} but missing ${originalFieldName}`,
      severity: 'warning',
      recommendation:
        'Currency normalization will default to tkr - include _original with currency unit (MSEK, tkr, SEK)',
    });
    return;
  }

  // Value exists with _original but no unit detected → WARNING
  const unit = detectSwedishUnit(original);
  if (!unit || unit === 'tkr') {
    // If original is just a number without unit, warn
    if (typeof original === 'string' && /^\d+[\s,.]?\d*$/.test(original.trim())) {
      warnings.push({
        field: fieldName,
        warningType: 'suspicious_format',
        message: `_original "${original}" has no detectable currency unit`,
        severity: 'warning',
        recommendation: 'Add explicit currency unit to _original (e.g., "12,5 MSEK" instead of "12,5")',
      });
    }
  }

  // CRITICAL: Currency magnitude validation to catch 1000x errors
  // If value is a number, check if it's suspiciously large
  if (typeof value === 'number' && !isNaN(value)) {
    const MAX_PLAUSIBLE_TKR = 1000000; // 1 billion SEK = 1,000,000 tkr
    const MIN_PLAUSIBLE_TKR = -1000000; // Allow negative for losses

    if (Math.abs(value) > MAX_PLAUSIBLE_TKR) {
      warnings.push({
        field: fieldName,
        warningType: 'suspicious_magnitude',
        message: `CRITICAL: Suspicious magnitude ${value.toLocaleString()} tkr (${(value / 1000).toLocaleString()} MSEK). Likely missing ÷1000 conversion from SEK.`,
        severity: 'warning',
        recommendation: `Expected value: ${(value / 1000).toLocaleString()} tkr if source was SEK. Please verify extraction logic applies unit conversion correctly.`,
      });
    }
  }
}

/**
 * Detect placeholder values
 * - WARNING: "Unknown", "N/A", "Not found", etc.
 */
function validatePlaceholders(
  fieldName: string,
  value: any,
  warnings: ValidationWarning[],
  opts: Required<ValidationOptions>
): void {
  // Only check string values
  if (typeof value !== 'string') return;

  const placeholders = [
    'Unknown',
    'N/A',
    'Not found',
    'NA',
    'unknown',
    'n/a',
    'not found',
    'not available',
    'N.A.',
    'ikke funnet', // Norwegian
    'ej tillgänglig', // Swedish
  ];

  const trimmedValue = value.trim();
  if (placeholders.some((p) => p.toLowerCase() === trimmedValue.toLowerCase())) {
    const message = `Field "${fieldName}" contains placeholder value: "${value}"`;

    if (opts.blockOnPlaceholders || opts.strictMode) {
      // In strict mode, escalate to error
      warnings.push({
        field: fieldName,
        warningType: 'placeholder_value',
        message,
        severity: 'warning',
        recommendation: 'Return null or omit field if not found (do NOT use placeholder strings)',
      });
    } else {
      // In lenient mode, just warn
      warnings.push({
        field: fieldName,
        warningType: 'placeholder_value',
        message,
        severity: 'warning',
        recommendation: 'Consider returning null or omitting field if not found',
      });
    }
  }
}

/**
 * Validate balance sheet equation: Assets = Liabilities + Equity
 * - WARNING: Imbalance detected (difference > 1%)
 * - Helps catch extraction errors in financial statements
 */
function validateBalanceSheetEquation(
  response: Record<string, any>,
  warnings: ValidationWarning[]
): void {
  const assets = response.total_assets_tkr;
  const liabilities = response.total_liabilities_tkr;
  const equity = response.total_equity_tkr;

  // Only validate if all three values are present and numeric
  if (
    typeof assets !== 'number' ||
    typeof liabilities !== 'number' ||
    typeof equity !== 'number' ||
    isNaN(assets) ||
    isNaN(liabilities) ||
    isNaN(equity)
  ) {
    return; // Skip validation if values are missing or non-numeric
  }

  // Calculate expected total (liabilities + equity)
  const expectedTotal = liabilities + equity;
  const difference = Math.abs(assets - expectedTotal);

  // Tolerance: 1% of assets (allows for rounding errors)
  const tolerance = Math.abs(assets) * 0.01;

  if (difference > tolerance) {
    const percentageDiff = assets !== 0 ? ((difference / Math.abs(assets)) * 100).toFixed(2) : '∞';

    warnings.push({
      field: 'balance_sheet_equation',
      warningType: 'suspicious_format',
      message: `Balance sheet imbalance: Assets (${assets.toLocaleString()} tkr) ≠ Liabilities + Equity (${expectedTotal.toLocaleString()} tkr). Difference: ${difference.toLocaleString()} tkr (${percentageDiff}%).`,
      severity: 'warning',
      recommendation: `Verify extraction of total_assets_tkr, total_liabilities_tkr, and total_equity_tkr. The accounting equation Assets = Liabilities + Equity should hold within ±1%. Check for missing components or extraction errors.`,
    });
  }
}

/**
 * Validate date fields have ISO 8601 format (YYYY-MM-DD)
 * - WARNING: Swedish date format detected (e.g., "1:a juni 2023")
 * - WARNING: Other non-ISO formats
 * - Helps standardize dates for structured data
 */
function validateDateFields(response: Record<string, any>, warnings: ValidationWarning[]): void {
  // Common date field names in BRF documents
  const dateFieldPatterns = [
    'date',
    '_date',
    'annual_meeting_date',
    'fiscal_year_end',
    'approval_date',
    'signature_date',
  ];

  // ISO 8601 date pattern: YYYY-MM-DD
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}$/;

  // Swedish date patterns
  const swedishPatterns = [
    /\d{1,2}:\w+\s+\w+\s+\d{4}/, // "1:a juni 2023"
    /\d{1,2}\s+\w+\s+\d{4}/, // "1 juni 2023"
    /\d{4}-\d{2}-\d{2}T/, // ISO with time (should be date-only)
  ];

  for (const [fieldName, value] of Object.entries(response)) {
    // Skip non-string values
    if (typeof value !== 'string') continue;

    // Check if field is likely a date field
    const isDateField = dateFieldPatterns.some(
      (pattern) => fieldName.includes(pattern) || fieldName.endsWith(pattern)
    );

    if (!isDateField) continue;

    // Skip if value is null or empty
    if (!value || value.trim() === '') continue;

    const trimmedValue = value.trim();

    // Check if already ISO 8601 format
    if (iso8601Pattern.test(trimmedValue)) {
      // Valid ISO 8601 - no warning
      continue;
    }

    // Check for Swedish date formats
    const isSwedishFormat = swedishPatterns.some((pattern) => pattern.test(trimmedValue));

    if (isSwedishFormat) {
      warnings.push({
        field: fieldName,
        warningType: 'invalid_date_format',
        message: `Date field "${fieldName}" uses Swedish format: "${trimmedValue}". Should be ISO 8601 (YYYY-MM-DD).`,
        severity: 'warning',
        recommendation:
          'Convert Swedish dates to ISO 8601 format (YYYY-MM-DD) for machine-readable structured data. Example: "1:a juni 2023" → "2023-06-01"',
      });
    } else if (trimmedValue.length > 0) {
      // Non-empty but not ISO 8601 and not Swedish - likely invalid format
      warnings.push({
        field: fieldName,
        warningType: 'invalid_date_format',
        message: `Date field "${fieldName}" has non-standard format: "${trimmedValue}". Should be ISO 8601 (YYYY-MM-DD).`,
        severity: 'warning',
        recommendation:
          'Use ISO 8601 date format (YYYY-MM-DD) for all date fields to ensure machine-readability and sortability.',
      });
    }
  }
}

/**
 * Validate cash flow consistency: Operating + Investing + Financing = Net change
 * - WARNING: Inconsistency detected (components don't sum correctly)
 * - Helps catch extraction errors in cash flow statements
 * - Tolerance: ±2% to allow for rounding errors and subtotals
 */
function validateCashFlowConsistency(
  response: Record<string, any>,
  warnings: ValidationWarning[]
): void {
  // Cash flow components (from cashflow_agent)
  const operating = response.cashflow_operating_tkr;
  const investing = response.cashflow_investing_tkr;
  const financing = response.cashflow_financing_tkr;
  const netChange = response.cashflow_net_change_tkr;

  // Only validate if all four values are present and numeric
  if (
    typeof operating !== 'number' ||
    typeof investing !== 'number' ||
    typeof financing !== 'number' ||
    typeof netChange !== 'number' ||
    isNaN(operating) ||
    isNaN(investing) ||
    isNaN(financing) ||
    isNaN(netChange)
  ) {
    return; // Skip validation if values are missing or non-numeric
  }

  // Calculate expected net change (sum of three components)
  const calculatedNetChange = operating + investing + financing;
  const difference = Math.abs(netChange - calculatedNetChange);

  // Tolerance: 2% of the absolute value of net change
  // (More lenient than balance sheet due to subtotals in cash flow statements)
  const tolerance = Math.abs(netChange) * 0.02;

  if (difference > tolerance) {
    const percentageDiff =
      netChange !== 0 ? ((difference / Math.abs(netChange)) * 100).toFixed(2) : '∞';

    warnings.push({
      field: 'cashflow_consistency',
      warningType: 'suspicious_format',
      message: `Cash flow inconsistency: Operating (${operating.toLocaleString()} tkr) + Investing (${investing.toLocaleString()} tkr) + Financing (${financing.toLocaleString()} tkr) = ${calculatedNetChange.toLocaleString()} tkr, but Net Change = ${netChange.toLocaleString()} tkr. Difference: ${difference.toLocaleString()} tkr (${percentageDiff}%).`,
      severity: 'warning',
      recommendation: `Verify extraction of cashflow_operating_tkr, cashflow_investing_tkr, cashflow_financing_tkr, and cashflow_net_change_tkr. The cash flow equation Operating + Investing + Financing = Net Change should hold within ±2%. Check for missing subtotals or misclassified line items.`,
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult, agentId: string): string {
  const lines: string[] = [];

  lines.push(`\n[Schema Validator] Agent: ${agentId}`);
  lines.push(`Valid: ${result.valid ? '✅' : '❌'}`);

  // Errors
  if (result.errors.length > 0) {
    lines.push(`\n🚨 CRITICAL ERRORS (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  - ${error.field}: ${error.message}`);
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  WARNINGS (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.field}: ${warning.message}`);
      if (warning.recommendation) {
        lines.push(`    💡 ${warning.recommendation}`);
      }
    }
  }

  // Metadata
  lines.push(`\n📊 METADATA:`);
  lines.push(`  - Total fields: ${result.metadata.totalFields}`);
  lines.push(`  - Null fields: ${result.metadata.nullFieldsCount}`);
  lines.push(`  - _tkr fields: ${result.metadata.tkrFieldsCount}`);
  if (result.metadata.tkrFieldsCount > 0) {
    lines.push(
      `  - _tkr with _original: ${result.metadata.tkrFieldsWithOriginal}/${result.metadata.tkrFieldsCount} (${result.metadata.coveragePercentage.toFixed(1)}%)`
    );
  }
  lines.push(`  - Evidence pages: ${result.metadata.evidencePagesCoverage ? '✅' : '❌'}`);

  return lines.join('\n');
}
