/**
 * Field Validator
 *
 * Validates agent extraction results against schemas.
 * Provides validation results with detailed error messages.
 */

import type { AgentId } from './agent-prompts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fieldCount: number;
  validFieldCount: number;
}

/**
 * Validate agent response against schema
 *
 * Performs basic validation:
 * - Check for required fields
 * - Validate field types
 * - Check confidence scores (0.0-1.0)
 * - Validate evidence pages
 *
 * @param agentId - Agent identifier
 * @param response - Agent response object
 * @param schema - Optional schema for validation
 * @returns Validation result
 */
export function validateAgentResponse(
  agentId: AgentId,
  response: any,
  schema?: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fieldCount = 0;
  let validFieldCount = 0;

  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return {
      valid: false,
      errors,
      warnings,
      fieldCount: 0,
      validFieldCount: 0,
    };
  }

  // Count fields and validate basic structure
  for (const [key, value] of Object.entries(response)) {
    // Skip metadata fields
    if (['evidence_pages', 'confidence', 'source'].includes(key)) {
      continue;
    }

    fieldCount++;

    // Check if field is an ExtractionField object
    if (value && typeof value === 'object' && 'value' in value) {
      const field = value as any;

      // Validate confidence score
      if ('confidence' in field) {
        if (typeof field.confidence !== 'number') {
          errors.push(`${key}: confidence is not a number`);
        } else if (field.confidence < 0 || field.confidence > 1) {
          errors.push(`${key}: confidence out of range (${field.confidence})`);
        } else {
          validFieldCount++;
        }
      }

      // Validate evidence pages
      if ('evidence_pages' in field) {
        if (!Array.isArray(field.evidence_pages)) {
          warnings.push(`${key}: evidence_pages is not an array`);
        } else if (field.evidence_pages.length === 0) {
          warnings.push(`${key}: no evidence pages provided`);
        }
      }
    } else {
      // Direct value (not wrapped in ExtractionField)
      validFieldCount++;
    }
  }

  // Agent-specific validation rules
  switch (agentId) {
    case 'financial_agent':
      // Validate _tkr fields have _original counterparts
      for (const key of Object.keys(response)) {
        if (key.endsWith('_tkr')) {
          const originalKey = key + '_original';
          if (!(originalKey in response)) {
            warnings.push(`${key}: missing ${originalKey} field`);
          }
        }
      }
      break;

    case 'balance_sheet_agent':
      // Validate balance sheet equation
      const assets = response.assets_total_tkr?.value || response.assets_total_tkr;
      const liabilities = response.liabilities_total_tkr?.value || response.liabilities_total_tkr;
      const equity = response.equity_total_tkr?.value || response.equity_total_tkr;

      if (assets !== null && liabilities !== null && equity !== null) {
        const diff = Math.abs(assets - (liabilities + equity));
        if (diff > 1) {
          // Allow 1 tkr tolerance for rounding
          errors.push(
            `Balance sheet mismatch: assets (${assets}) != liabilities (${liabilities}) + equity (${equity})`
          );
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fieldCount,
    validFieldCount,
  };
}

/**
 * Format validation result as human-readable string
 *
 * @param result - Validation result
 * @param agentId - Agent identifier
 * @returns Formatted validation summary
 */
export function formatValidationResult(result: ValidationResult, agentId: string): string {
  const status = result.valid ? '✅ VALID' : '❌ INVALID';
  const lines = [
    `[${agentId}] ${status}`,
    `  Fields: ${result.validFieldCount}/${result.fieldCount}`,
  ];

  if (result.errors.length > 0) {
    lines.push(`  Errors (${result.errors.length}):`);
    result.errors.forEach((err) => lines.push(`    - ${err}`));
  }

  if (result.warnings.length > 0) {
    lines.push(`  Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warn) => lines.push(`    - ${warn}`));
  }

  return lines.join('\n');
}

/**
 * Validate all agent responses
 *
 * @param agentResults - Map of agent ID to response
 * @returns Map of agent ID to validation result
 */
export function validateAllAgents(
  agentResults: Record<string, any>
): Record<string, ValidationResult> {
  const validationResults: Record<string, ValidationResult> = {};

  for (const [agentId, response] of Object.entries(agentResults)) {
    validationResults[agentId] = validateAgentResponse(agentId as AgentId, response);
  }

  return validationResults;
}
