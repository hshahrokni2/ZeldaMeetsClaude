/**
 * Field Validator
 *
 * Validates extracted data from agents against expected schemas.
 */

import type { AgentId } from './agent-prompts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fieldCount: number;
}

/**
 * Validate agent response
 *
 * Performs lenient validation - warns but doesn't block on missing fields.
 */
export function validateAgentResponse(
  agentId: AgentId,
  data: Record<string, any>,
  options: {
    strictMode?: boolean;
    allowNulls?: boolean;
    requireEvidence?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is empty
  if (!data || Object.keys(data).length === 0) {
    errors.push('Agent returned empty data');
    return {
      valid: false,
      errors,
      warnings,
      fieldCount: 0,
    };
  }

  // Count valid fields
  const fieldCount = Object.keys(data).filter(key => key !== 'evidence_pages').length;

  // Check for null values if not allowed
  if (!options.allowNulls) {
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        warnings.push(`Field ${key} is null/undefined`);
      }
    }
  }

  // Check for evidence pages if required
  if (options.requireEvidence && !data.evidence_pages) {
    warnings.push('Missing evidence_pages field');
  }

  // Validate field types based on agent
  const typeWarnings = validateFieldTypes(agentId, data);
  warnings.push(...typeWarnings);

  const valid = errors.length === 0 && (!options.strictMode || warnings.length === 0);

  return {
    valid,
    errors,
    warnings,
    fieldCount,
  };
}

/**
 * Validate field types for specific agents
 */
function validateFieldTypes(agentId: AgentId, data: Record<string, any>): string[] {
  const warnings: string[] = [];

  // Financial agent - check for _tkr fields
  if (agentId === 'financial_agent') {
    for (const key of Object.keys(data)) {
      if (key.endsWith('_tkr') && typeof data[key] !== 'number' && data[key] !== null) {
        warnings.push(`Field ${key} should be a number but got ${typeof data[key]}`);
      }
    }
  }

  return warnings;
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult, agentId: string): string {
  let output = `[Validation ${agentId}] `;

  if (result.valid) {
    output += `✅ VALID (${result.fieldCount} fields)`;
  } else {
    output += `❌ INVALID (${result.errors.length} errors, ${result.warnings.length} warnings)`;
  }

  if (result.errors.length > 0) {
    output += `\n  Errors:\n    - ${result.errors.join('\n    - ')}`;
  }

  if (result.warnings.length > 0) {
    output += `\n  Warnings:\n    - ${result.warnings.join('\n    - ')}`;
  }

  return output;
}
