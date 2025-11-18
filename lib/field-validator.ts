/**
 * Field Validator
 *
 * Validates agent responses against expected schemas.
 * Implements LENIENT validation mode per RIGOR_PROTOCOL.md
 */

import type { AgentId } from './agent-prompts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  strictMode: boolean;      // If true, warnings become errors
  allowNulls: boolean;       // If true, null values are valid
  requireEvidence: boolean;  // If true, non-null values must have evidence_pages
}

/**
 * Validate agent response
 */
export function validateAgentResponse(
  agentId: AgentId,
  data: Record<string, any>,
  options: ValidationOptions = {
    strictMode: false,
    allowNulls: true,
    requireEvidence: false,
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('Response must be a JSON object');
    return { valid: false, errors, warnings };
  }

  // Check for evidence_pages
  if ('evidence_pages' in data) {
    if (!Array.isArray(data.evidence_pages)) {
      warnings.push('evidence_pages should be an array');
    }
  } else {
    warnings.push('Missing evidence_pages array');
  }

  // Validate individual fields
  for (const [key, value] of Object.entries(data)) {
    if (key === 'evidence_pages') continue;

    // Check for nulls
    if (value === null) {
      if (!options.allowNulls) {
        warnings.push(`Field ${key} is null`);
      }
      continue;
    }

    // Check for _original fields for _tkr fields
    if (key.endsWith('_tkr') && typeof value === 'number') {
      const originalKey = key + '_original';
      if (!(originalKey in data)) {
        warnings.push(`Missing ${originalKey} for currency field ${key}`);
      }
    }

    // Check for empty strings (should be null instead)
    if (value === '') {
      warnings.push(`Field ${key} is empty string (should be null)`);
    }
  }

  // In strict mode, warnings become errors
  const finalErrors = options.strictMode ? [...errors, ...warnings] : errors;

  return {
    valid: finalErrors.length === 0,
    errors: finalErrors,
    warnings: options.strictMode ? [] : warnings,
  };
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult, agentId: AgentId): string {
  const lines: string[] = [];

  lines.push(`[Validation] Agent: ${agentId}`);

  if (result.valid) {
    lines.push(`[Validation] ✅ Valid (${result.warnings.length} warnings)`);
  } else {
    lines.push(`[Validation] ❌ Invalid (${result.errors.length} errors)`);
  }

  if (result.errors.length > 0) {
    lines.push(`[Validation] Errors:`);
    result.errors.forEach(err => lines.push(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    lines.push(`[Validation] Warnings:`);
    result.warnings.forEach(warn => lines.push(`  - ${warn}`));
  }

  return lines.join('\n');
}
