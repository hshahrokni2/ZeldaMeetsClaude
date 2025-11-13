#!/usr/bin/env tsx
/**
 * Complete Schema Extraction - ALL 19 Agents, 273+ Fields
 *
 * This script performs FULL extraction from Swedish BRF annual reports using
 * Claude as all 19 specialized agents. Extracts 200-273+ fields per PDF.
 *
 * Agents (19 total):
 * 1. financial_agent (11 fields - income statement)
 * 2. balance_sheet_agent (11 fields - balance sheet)
 * 3. cashflow_agent (cash flow analysis)
 * 4. chairman_agent (1 field - chairman name)
 * 5. board_members_agent (array - board members)
 * 6. auditor_agent (auditor name, firm)
 * 7. audit_report_agent (audit opinion)
 * 8. property_agent (20+ fields - property details)
 * 9. operational_agent (11 categories - operating costs)
 * 10. loans_agent (loans array + aggregates)
 * 11. fees_agent (2+ fields - fee structure)
 * 12. reserves_agent (reserves array)
 * 13. key_metrics_agent (depreciation metrics)
 * 14. energy_agent (energy data + trends)
 * 15. events_agent (key events array)
 * 16. leverantörer_agent (suppliers array)
 * 17. notes_depreciation_agent (depreciation notes)
 * 18. notes_maintenance_agent (maintenance notes)
 * 19. notes_tax_agent (tax notes)
 *
 * Usage:
 *   npx tsx scripts/extract-complete-schema.ts --pdf ./pdfs/example.pdf --output ./results/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';

// =============================================================================
// TYPES
// =============================================================================

interface AgentDefinition {
  id: string;
  name: string;
  fields_count: string; // "11 fields", "20+ fields", "array", etc.
  description: string;
}

const ALL_19_AGENTS: AgentDefinition[] = [
  { id: 'financial', name: 'Financial Agent', fields_count: '11 fields', description: 'Income statement (Resultaträkning)' },
  { id: 'balance_sheet', name: 'Balance Sheet Agent', fields_count: '11 fields', description: 'Balance sheet (Balansräkning)' },
  { id: 'cashflow', name: 'Cashflow Agent', fields_count: '~5 fields', description: 'Cash flow analysis (Kassaflödesanalys)' },
  { id: 'chairman', name: 'Chairman Agent', fields_count: '1 field', description: 'Chairman name (Ordförande)' },
  { id: 'board_members', name: 'Board Members Agent', fields_count: '~6-10 members', description: 'Board members array (Styrelsen)' },
  { id: 'auditor', name: 'Auditor Agent', fields_count: '2 fields', description: 'Auditor name and firm (Revisor)' },
  { id: 'audit_report', name: 'Audit Report Agent', fields_count: '3 fields', description: 'Audit opinion (Revisionsberättelse)' },
  { id: 'property', name: 'Property Agent', fields_count: '20+ fields', description: 'Property details (Fastighet, Byggnader)' },
  { id: 'operational', name: 'Operational Agent', fields_count: '11 categories', description: 'Operating costs breakdown (Driftkostnader)' },
  { id: 'loans', name: 'Loans Agent', fields_count: '~3-8 loans', description: 'Loan details (Skulder till kreditinstitut)' },
  { id: 'fees', name: 'Fees Agent', fields_count: '2+ fields', description: 'Fee structure (Årsavgift)' },
  { id: 'reserves', name: 'Reserves Agent', fields_count: '~2-5 funds', description: 'Reserve funds (Fonder)' },
  { id: 'key_metrics', name: 'Key Metrics Agent', fields_count: '4 fields', description: 'Depreciation paradox, soliditet' },
  { id: 'energy', name: 'Energy Agent', fields_count: '~10 fields', description: 'Energy data with trends (Energi)' },
  { id: 'events', name: 'Events Agent', fields_count: '~5-15 events', description: 'Key events (Väsentliga händelser)' },
  { id: 'leverantörer', name: 'Leverantörer Agent', fields_count: '~5-10 suppliers', description: 'Suppliers/contractors (Leverantörer)' },
  { id: 'notes_depreciation', name: 'Notes Depreciation Agent', fields_count: '3 fields', description: 'Depreciation notes (Avskrivningar)' },
  { id: 'notes_maintenance', name: 'Notes Maintenance Agent', fields_count: '~10-20 items', description: 'Maintenance notes (Not 4-5)' },
  { id: 'notes_tax', name: 'Notes Tax Agent', fields_count: '3 fields', description: 'Tax notes (Skatt)' }
];

interface CompleteExtractionResult {
  pdf_id: string;
  pdf_path: string;
  extraction_date: string;

  // Metadata
  metadata: {
    fiscal_year: number | null;
    brf_name: string | null;
    organization_number: string | null;
    pages_total: number;
  };

  // All 19 agent results
  agents: {
    [agentId: string]: {
      agent_id: string;
      extraction_pass: number;
      confidence: number;
      fields_extracted: number;
      data: any;
      evidence_pages: number[];
    };
  };

  // Quality Metrics
  coverage_stats: {
    total_agents: number;
    agents_completed: number;
    total_fields_available: number;
    total_fields_extracted: number;
    coverage_percentage: number; // True coverage: extracted / available
    average_confidence: number;
  };
}

// =============================================================================
// MAIN EXTRACTION LOGIC
// =============================================================================

/**
 * NOTE: This is a TEMPLATE/DEMONSTRATION script.
 *
 * In actual usage, this would:
 * 1. Read PDF using pdf-parse
 * 2. For EACH of the 19 agents:
 *    a. Load agent definition from agents/{agent_id}_agent.md
 *    b. Create agent-specific prompt with:
 *       - Agent's target fields
 *       - Agent's WHERE TO LOOK instructions
 *       - Agent's anti-hallucination rules
 *       - Full PDF text
 *    c. Send to Claude (via Task tool) for extraction
 *    d. Parse and validate extracted data
 *    e. Track confidence scores and evidence pages
 * 3. Aggregate all agent results
 * 4. Calculate true coverage: (fields_extracted / fields_available_in_pdf)
 * 5. Output complete BRF schema JSON
 *
 * For now, this demonstrates the STRUCTURE needed for complete extraction.
 */

async function extractCompleteBRFSchema(pdfPath: string, outputDir: string): Promise<void> {
  console.log('='.repeat(80));
  console.log('COMPLETE BRF SCHEMA EXTRACTION - ALL 19 AGENTS');
  console.log('='.repeat(80));
  console.log();
  console.log(`PDF: ${pdfPath}`);
  console.log(`Output: ${outputDir}`);
  console.log();

  const pdfId = path.basename(pdfPath, '.pdf');

  // Create result structure
  const result: CompleteExtractionResult = {
    pdf_id: pdfId,
    pdf_path: pdfPath,
    extraction_date: new Date().toISOString(),
    metadata: {
      fiscal_year: null,
      brf_name: null,
      organization_number: null,
      pages_total: 0
    },
    agents: {},
    coverage_stats: {
      total_agents: 19,
      agents_completed: 0,
      total_fields_available: 273, // Estimated from schema
      total_fields_extracted: 0,
      coverage_percentage: 0,
      average_confidence: 0
    }
  };

  console.log('Agents to Process (19 total):');
  console.log('-'.repeat(80));
  ALL_19_AGENTS.forEach((agent, idx) => {
    console.log(`${String(idx + 1).padStart(2)}. ${agent.name.padEnd(30)} ${agent.fields_count.padEnd(15)} - ${agent.description}`);
  });
  console.log();

  console.log('⚠️  NOTE: This is a TEMPLATE script.');
  console.log('⚠️  Actual extraction requires implementing:');
  console.log('   1. PDF text extraction (pdf-parse)');
  console.log('   2. Agent prompt generation from agents/*.md files');
  console.log('   3. Claude extraction via Task tool for each agent');
  console.log('   4. Data validation and aggregation');
  console.log('   5. Coverage calculation');
  console.log();
  console.log('Next Steps:');
  console.log('1. Read first PDF: 267197_årsredovisning_norrköping_brf_axet_4.pdf');
  console.log('2. Extract with ALL 19 agents manually (via direct prompting)');
  console.log('3. Verify 200+ fields extracted');
  console.log('4. Calculate true coverage percentage');
  console.log('5. Then batch process all 20 PDFs');
  console.log();

  // Save template
  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${pdfId}_complete_extraction_TEMPLATE.json`);
  await fs.writeJSON(outputPath, result, { spaces: 2 });

  console.log(`✅ Template saved: ${outputPath}`);
  console.log();
  console.log('='.repeat(80));
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('extract-complete-schema')
  .description('Extract COMPLETE BRF schema with ALL 19 agents (273+ fields)')
  .requiredOption('--pdf <path>', 'Path to PDF file')
  .requiredOption('--output <dir>', 'Output directory')
  .parse();

const options = program.opts();

extractCompleteBRFSchema(options.pdf, options.output)
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
