#!/usr/bin/env tsx
/**
 * Audit Extraction - Self-Audit Engine
 *
 * This script audits extraction results to identify:
 * - Missing fields
 * - Low-confidence extractions
 * - Evidence gaps (missing page numbers)
 * - Cross-agent discrepancies
 * - Potential blind spots
 *
 * Usage:
 *   npm run audit -- --input ./results/example_extraction.json
 */

import * as fs from 'fs-extra';
import { Command } from 'commander';

// =============================================================================
// TYPES
// =============================================================================

interface AuditReport {
  pdfId: string;
  auditDate: string;
  overallScore: number; // 0-100
  issues: AuditIssue[];
  recommendations: string[];
  passFailStatus: 'PASS' | 'FAIL' | 'NEEDS_REFINEMENT';
  statistics: {
    totalFields: number;
    missingFields: number;
    lowConfidenceFields: number;
    evidenceGaps: number;
    crossAgentDiscrepancies: number;
  };
}

interface AuditIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'MISSING_FIELD' | 'LOW_CONFIDENCE' | 'EVIDENCE_GAP' | 'DISCREPANCY' | 'FORMAT_ERROR';
  agent: string;
  field: string;
  description: string;
  recommendation: string;
}

// =============================================================================
// EXPECTED FIELDS BY AGENT
// =============================================================================

const EXPECTED_FIELDS_BY_AGENT: Record<string, string[]> = {
  chairman: ['chairman_name', 'evidence_pages'],
  financial: [
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
    'evidence_pages'
  ],
  balance_sheet: [
    'total_assets_tkr',
    'fixed_assets_tkr',
    'current_assets_tkr',
    'cash_bank_tkr',
    'total_liabilities_tkr',
    'long_term_liabilities_tkr',
    'short_term_liabilities_tkr',
    'total_equity_tkr',
    'retained_earnings_tkr',
    'current_year_result_tkr',
    'evidence_pages'
  ],
  board_members: ['board_members', 'evidence_pages'],
  auditor: ['auditor_name', 'auditor_firm', 'evidence_pages']
  // TODO: Add remaining agents
};

// =============================================================================
// AUDIT FUNCTIONS
// =============================================================================

function auditMissingFields(extraction: any): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const agent of extraction.agents || []) {
    const expectedFields = EXPECTED_FIELDS_BY_AGENT[agent.agentId] || [];
    const extractedFields = Object.keys(agent.data || {});
    const missing = expectedFields.filter(f => !extractedFields.includes(f));

    for (const field of missing) {
      issues.push({
        severity: 'HIGH',
        category: 'MISSING_FIELD',
        agent: agent.agentId,
        field,
        description: `Field "${field}" is required but was not extracted`,
        recommendation: `Re-run ${agent.agentId} agent focusing on: ${field}`
      });
    }
  }

  return issues;
}

function auditLowConfidence(extraction: any, threshold: number = 0.7): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const agent of extraction.agents || []) {
    for (const [field, value] of Object.entries(agent.data || {})) {
      if (value && typeof value === 'object' && 'confidence' in value) {
        const conf = (value as any).confidence;
        if (conf < threshold) {
          const severity = conf < 0.5 ? 'CRITICAL' : conf < 0.6 ? 'HIGH' : 'MEDIUM';
          issues.push({
            severity,
            category: 'LOW_CONFIDENCE',
            agent: agent.agentId,
            field,
            description: `Field "${field}" has low confidence: ${(conf * 100).toFixed(1)}%`,
            recommendation: `Verify "${field}" in source document and re-extract`
          });
        }
      }
    }
  }

  return issues;
}

function auditEvidenceGaps(extraction: any): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const agent of extraction.agents || []) {
    for (const [field, value] of Object.entries(agent.data || {})) {
      if (value && typeof value === 'object') {
        const hasEvidence =
          'evidence_pages' in value &&
          Array.isArray((value as any).evidence_pages) &&
          (value as any).evidence_pages.length > 0;

        if (!hasEvidence && field !== 'evidence_pages') {
          issues.push({
            severity: 'MEDIUM',
            category: 'EVIDENCE_GAP',
            agent: agent.agentId,
            field,
            description: `Field "${field}" is missing evidence_pages`,
            recommendation: `Add page numbers where "${field}" was found`
          });
        }
      }
    }
  }

  return issues;
}

function auditCrossAgentDiscrepancies(extraction: any): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Find fields that appear in multiple agents
  const fieldsByAgent = new Map<string, Map<string, any>>();

  for (const agent of extraction.agents || []) {
    const agentFields = new Map<string, any>();
    for (const [field, value] of Object.entries(agent.data || {})) {
      agentFields.set(field, value);
    }
    fieldsByAgent.set(agent.agentId, agentFields);
  }

  // Check for discrepancies
  const allFields = new Set<string>();
  fieldsByAgent.forEach(fields => fields.forEach((_, field) => allFields.add(field)));

  allFields.forEach(field => {
    const values: Array<{ agent: string; value: any }> = [];

    fieldsByAgent.forEach((fields, agentId) => {
      if (fields.has(field)) {
        values.push({ agent: agentId, value: fields.get(field) });
      }
    });

    if (values.length > 1) {
      // Compare values
      const firstValue = JSON.stringify(values[0].value);
      const hasDiscrepancy = values.some(v => JSON.stringify(v.value) !== firstValue);

      if (hasDiscrepancy) {
        issues.push({
          severity: 'HIGH',
          category: 'DISCREPANCY',
          agent: values.map(v => v.agent).join(', '),
          field,
          description: `Field "${field}" has different values across agents: ${values
            .map(v => `${v.agent}=${JSON.stringify(v.value).substring(0, 50)}`)
            .join(', ')}`,
          recommendation: `Reconcile discrepancy in "${field}" across ${values.map(v => v.agent).join(' and ')}`
        });
      }
    }
  });

  return issues;
}

function auditFormatErrors(extraction: any): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const agent of extraction.agents || []) {
    // Check that _tkr fields have corresponding _original fields
    for (const [field, value] of Object.entries(agent.data || {})) {
      if (field.endsWith('_tkr')) {
        const originalField = `${field}_original`;
        if (!(originalField in agent.data)) {
          issues.push({
            severity: 'MEDIUM',
            category: 'FORMAT_ERROR',
            agent: agent.agentId,
            field,
            description: `Field "${field}" is missing corresponding "${originalField}" field`,
            recommendation: `Add original Swedish text for "${field}"`
          });
        }
      }
    }

    // Check evidence_pages format
    if ('evidence_pages' in agent.data) {
      const pages = agent.data.evidence_pages;
      if (!Array.isArray(pages)) {
        issues.push({
          severity: 'HIGH',
          category: 'FORMAT_ERROR',
          agent: agent.agentId,
          field: 'evidence_pages',
          description: 'evidence_pages must be an array',
          recommendation: 'Fix evidence_pages format to be an array of page numbers'
        });
      }
    }
  }

  return issues;
}

// =============================================================================
// MAIN AUDIT FUNCTION
// =============================================================================

async function auditExtraction(inputFile: string, outputFile?: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`EXTRACTION AUDIT`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Input: ${inputFile}\n`);

  // Load extraction results
  const extraction = await fs.readJson(inputFile);

  // Run all audit checks
  const issues: AuditIssue[] = [
    ...auditMissingFields(extraction),
    ...auditLowConfidence(extraction),
    ...auditEvidenceGaps(extraction),
    ...auditCrossAgentDiscrepancies(extraction),
    ...auditFormatErrors(extraction)
  ];

  // Generate statistics
  const statistics = {
    totalFields:
      extraction.agents?.reduce((sum: number, a: any) => sum + Object.keys(a.data || {}).length, 0) || 0,
    missingFields: issues.filter(i => i.category === 'MISSING_FIELD').length,
    lowConfidenceFields: issues.filter(i => i.category === 'LOW_CONFIDENCE').length,
    evidenceGaps: issues.filter(i => i.category === 'EVIDENCE_GAP').length,
    crossAgentDiscrepancies: issues.filter(i => i.category === 'DISCREPANCY').length
  };

  // Calculate overall score
  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const highCount = issues.filter(i => i.severity === 'HIGH').length;
  const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowCount = issues.filter(i => i.severity === 'LOW').length;

  const overallScore = Math.max(
    0,
    100 - criticalCount * 20 - highCount * 10 - mediumCount * 5 - lowCount * 2
  );

  // Determine pass/fail
  let passFailStatus: 'PASS' | 'FAIL' | 'NEEDS_REFINEMENT';
  if (overallScore >= 95 && criticalCount === 0 && highCount === 0) {
    passFailStatus = 'PASS';
  } else if (overallScore < 70 || criticalCount > 0) {
    passFailStatus = 'FAIL';
  } else {
    passFailStatus = 'NEEDS_REFINEMENT';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (statistics.missingFields > 0) {
    recommendations.push(`Extract ${statistics.missingFields} missing fields`);
  }
  if (statistics.lowConfidenceFields > 0) {
    recommendations.push(`Verify and re-extract ${statistics.lowConfidenceFields} low-confidence fields`);
  }
  if (statistics.evidenceGaps > 0) {
    recommendations.push(`Add evidence_pages for ${statistics.evidenceGaps} fields`);
  }
  if (statistics.crossAgentDiscrepancies > 0) {
    recommendations.push(`Resolve ${statistics.crossAgentDiscrepancies} cross-agent discrepancies`);
  }

  // Create audit report
  const report: AuditReport = {
    pdfId: extraction.pdfId,
    auditDate: new Date().toISOString(),
    overallScore,
    issues,
    recommendations,
    passFailStatus,
    statistics
  };

  // Print report
  console.log(`PDF ID: ${report.pdfId}`);
  console.log(`Overall Score: ${report.overallScore}/100`);
  console.log(`Status: ${report.passFailStatus}\n`);

  console.log(`Statistics:`);
  console.log(`  Total Fields: ${statistics.totalFields}`);
  console.log(`  Missing Fields: ${statistics.missingFields}`);
  console.log(`  Low Confidence: ${statistics.lowConfidenceFields}`);
  console.log(`  Evidence Gaps: ${statistics.evidenceGaps}`);
  console.log(`  Discrepancies: ${statistics.crossAgentDiscrepancies}\n`);

  console.log(`Issues by Severity:`);
  console.log(`  CRITICAL: ${criticalCount}`);
  console.log(`  HIGH: ${highCount}`);
  console.log(`  MEDIUM: ${mediumCount}`);
  console.log(`  LOW: ${lowCount}\n`);

  if (issues.length > 0) {
    console.log(`Top 10 Issues:`);
    issues
      .slice(0, 10)
      .forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.agent}.${issue.field}`);
        console.log(`     ${issue.description}`);
        console.log(`     → ${issue.recommendation}\n`);
      });
  }

  if (recommendations.length > 0) {
    console.log(`Recommendations:`);
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log(`\n${'='.repeat(80)}\n`);

  // Save audit report
  if (outputFile) {
    await fs.writeJson(outputFile, report, { spaces: 2 });
    console.log(`Audit report saved to: ${outputFile}\n`);
  }
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('audit-extraction')
  .description('Audit extraction results for completeness, confidence, and accuracy')
  .requiredOption('-i, --input <file>', 'Input extraction JSON file')
  .option('-o, --output <file>', 'Output audit report file')
  .parse();

const options = program.opts();

// Run audit
auditExtraction(options.input, options.output).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
