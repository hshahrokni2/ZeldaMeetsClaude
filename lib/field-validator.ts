/**
 * Field Validator
 *
 * Validates extracted fields against expected schema and business rules.
 */

import type { AgentId } from './agent-prompts';
import type { ExtractionField } from './extraction-field-v1.0.0';

export interface ValidationError {
  field: string;
  error: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validatedFields: number;
  totalFields: number;
}

export interface ValidationOptions {
  strictMode?: boolean;  // If true, warnings become errors
  allowNulls?: boolean;   // If true, null values are acceptable
  requireEvidence?: boolean; // If true, all fields must have evidence_pages
}

/**
 * Expected fields per agent (for schema validation)
 */
const AGENT_EXPECTED_FIELDS: Partial<Record<AgentId, string[]>> = {
  financial_agent: [
    'total_revenue_tkr',
    'property_revenue_tkr',
    'interest_revenue_tkr',
    'other_revenue_tkr',
    'total_costs_tkr',
    'operational_costs_tkr',
    'maintenance_costs_tkr',
    'administrative_costs_tkr',
    'interest_costs_tkr',
    'depreciation_tkr',
    'net_result_tkr',
  ],
  chairman_agent: ['chairman'],
  board_members_agent: ['board_members'],
  balance_sheet_agent: [
    'total_assets_tkr',
    'total_liabilities_tkr',
    'total_equity_tkr',
  ],
  // Add more as needed
};

/**
 * Validate agent response
 *
 * @param agentId - Agent that generated response
 * @param data - Extracted data
 * @param options - Validation options
 * @returns Validation result
 */
export function validateAgentResponse(
  agentId: AgentId,
  data: Record<string, any>,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    strictMode = false,
    allowNulls = true,
    requireEvidence = false,
  } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const expectedFields = AGENT_EXPECTED_FIELDS[agentId] || [];
  const extractedFields = Object.keys(data).filter(
    (key) => !key.endsWith('_original') && key !== 'evidence_pages'
  );

  // Check for missing expected fields
  for (const expectedField of expectedFields) {
    if (!(expectedField in data)) {
      warnings.push({
        field: expectedField,
        error: `Expected field missing (null data OK if section not in PDF)`,
        severity: 'WARNING',
      });
    }
  }

  // Validate each extracted field
  for (const field of extractedFields) {
    const value = data[field];

    // Check for null values
    if (value === null && !allowNulls) {
      errors.push({
        field,
        error: 'Null value not allowed',
        severity: 'CRITICAL',
      });
    }

    // Check for evidence pages
    if (requireEvidence && !data.evidence_pages) {
      warnings.push({
        field,
        error: 'No evidence_pages provided',
        severity: 'WARNING',
      });
    }

    // Type validation for _tkr fields
    if (field.endsWith('_tkr')) {
      if (value !== null && typeof value !== 'number') {
        errors.push({
          field,
          error: `Expected number, got ${typeof value}`,
          severity: 'CRITICAL',
        });
      }

      // Check for corresponding _original field
      const originalField = `${field}_original`;
      if (value !== null && !(originalField in data)) {
        warnings.push({
          field: originalField,
          error: `Missing _original field for ${field}`,
          severity: 'WARNING',
        });
      }
    }
  }

  // In strict mode, warnings become errors
  if (strictMode) {
    errors.push(...warnings);
    warnings.length = 0;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validatedFields: extractedFields.length,
    totalFields: expectedFields.length,
  };
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(
  result: ValidationResult,
  agentId: AgentId
): string {
  let output = `\n[${agentId}] Validation Result:\n`;
  output += `  Valid: ${result.valid ? '✅' : '❌'}\n`;
  output += `  Fields: ${result.validatedFields}/${result.totalFields}\n`;

  if (result.errors.length > 0) {
    output += `\n  Errors (${result.errors.length}):\n`;
    for (const error of result.errors) {
      output += `    - ${error.field}: ${error.error}\n`;
    }
  }

  if (result.warnings.length > 0) {
    output += `\n  Warnings (${result.warnings.length}):\n`;
    for (const warning of result.warnings) {
      output += `    - ${warning.field}: ${warning.error}\n`;
    }
  }

  return output;
}

/**
 * Cross-field validation (balance sheet equation, etc.)
 */
export function validateCrossFieldConsistency(
  data: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Balance sheet equation: Assets = Liabilities + Equity
  if (
    'total_assets_tkr' in data &&
    'total_liabilities_tkr' in data &&
    'total_equity_tkr' in data
  ) {
    const assets = data.total_assets_tkr;
    const liabilities = data.total_liabilities_tkr;
    const equity = data.total_equity_tkr;

    if (assets !== null && liabilities !== null && equity !== null) {
      const sum = liabilities + equity;
      const diff = Math.abs(assets - sum);
      const tolerance = Math.max(assets, sum) * 0.01; // 1% tolerance

      if (diff > tolerance) {
        errors.push({
          field: 'balance_sheet_equation',
          error: `Assets (${assets}) != Liabilities (${liabilities}) + Equity (${equity}). Diff: ${diff}`,
          severity: diff > tolerance * 5 ? 'CRITICAL' : 'WARNING',
        });
      }
    }
  }

  // Financial ratios: Operational result = Revenue - Costs
  if (
    'total_revenue_tkr' in data &&
    'total_costs_tkr' in data &&
    'net_result_tkr' in data
  ) {
    const revenue = data.total_revenue_tkr;
    const costs = data.total_costs_tkr;
    const result = data.net_result_tkr;

    if (revenue !== null && costs !== null && result !== null) {
      const expected = revenue - costs;
      const diff = Math.abs(result - expected);
      const tolerance = Math.max(Math.abs(revenue), Math.abs(costs)) * 0.02; // 2% tolerance

      if (diff > tolerance) {
        errors.push({
          field: 'net_result_consistency',
          error: `Net result (${result}) != Revenue (${revenue}) - Costs (${costs}). Diff: ${diff}`,
          severity: 'WARNING',
        });
      }
    }
  }

  return errors;
}
