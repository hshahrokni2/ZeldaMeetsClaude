#!/usr/bin/env tsx
/**
 * Export to JSONL - DSPy Training Format
 *
 * Converts extraction JSON files to JSONL format for DSPy fine-tuning.
 * Each line represents one training example with:
 * - pdf_id: Identifier
 * - agent: Agent type (financial, balance_sheet, chairman)
 * - input: Agent prompt + PDF context
 * - output: Extracted structured data
 * - metadata: Confidence, evidence pages, etc.
 *
 * Usage:
 *   npm run export-jsonl -- --input ./results/batch_extraction/ --output ./training_data/ground_truth.jsonl
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';

// =============================================================================
// TYPES
// =============================================================================

interface TrainingExample {
  pdf_id: string;
  agent: string;
  fiscal_year?: number;
  brf_name?: string;
  input: {
    agent_prompt: string;
    pdf_context: string;
  };
  output: any;
  metadata: {
    confidence: number;
    evidence_pages: number[];
    extraction_date: string;
  };
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

async function exportToJSONL(inputDir: string, outputFile: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`EXPORT TO JSONL FOR DSPY TRAINING`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Input: ${inputDir}`);
  console.log(`Output: ${outputFile}`);
  console.log(`${'='.repeat(80)}\n`);

  // Find all extraction JSON files
  const files = await fs.readdir(inputDir);
  const extractionFiles = files.filter(f =>
    f.endsWith('_extraction.json') && !f.includes('_agent')
  );

  console.log(`Found ${extractionFiles.length} extraction files\n`);

  const trainingExamples: TrainingExample[] = [];

  // Process each extraction file
  for (const file of extractionFiles) {
    const filePath = path.join(inputDir, file);
    const extraction = await fs.readJson(filePath);

    const pdfId = path.basename(file, '_extraction.json');

    console.log(`Processing: ${pdfId}`);

    // Extract agents data
    const agents = extraction.agents || [];

    for (const agent of agents) {
      const example: TrainingExample = {
        pdf_id: pdfId,
        agent: agent.agentId,
        fiscal_year: extraction.fiscal_year,
        brf_name: extraction.brf_name,
        input: {
          agent_prompt: getAgentPrompt(agent.agentId),
          pdf_context: `BRF: ${extraction.brf_name || pdfId}, Fiscal Year: ${extraction.fiscal_year || 'Unknown'}`
        },
        output: agent.data,
        metadata: {
          confidence: agent.confidence || 0,
          evidence_pages: extractEvidencePages(agent.data),
          extraction_date: extraction.extraction_date || new Date().toISOString()
        }
      };

      trainingExamples.push(example);
    }
  }

  // Write JSONL output
  await fs.ensureDir(path.dirname(outputFile));
  const jsonlContent = trainingExamples.map(ex => JSON.stringify(ex)).join('\n');
  await fs.writeFile(outputFile, jsonlContent);

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`EXPORT COMPLETE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Training Examples: ${trainingExamples.length}`);
  console.log(`Output File: ${outputFile}`);
  console.log(`File Size: ${(jsonlContent.length / 1024).toFixed(2)} KB`);

  // Break down by agent
  const byAgent = trainingExamples.reduce((acc, ex) => {
    acc[ex.agent] = (acc[ex.agent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\nExamples by Agent:`);
  Object.entries(byAgent).forEach(([agent, count]) => {
    console.log(`  ${agent}: ${count}`);
  });

  console.log(`${'='.repeat(80)}\n`);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAgentPrompt(agentId: string): string {
  const prompts: Record<string, string> = {
    financial: 'Extract income statement data: total_revenue_tkr, property_revenue_tkr, interest_revenue_tkr, other_revenue_tkr, total_costs_tkr, operational_costs_tkr, maintenance_costs_tkr, administrative_costs_tkr, interest_costs_tkr, depreciation_tkr, net_result_tkr',
    balance_sheet: 'Extract balance sheet data: total_assets_tkr, fixed_assets_tkr, current_assets_tkr, cash_bank_tkr, total_liabilities_tkr, long_term_liabilities_tkr, short_term_liabilities_tkr, total_equity_tkr, retained_earnings_tkr, current_year_result_tkr',
    chairman: 'Extract chairman name from board governance section',
  };

  return prompts[agentId] || `Extract data for ${agentId} agent`;
}

function extractEvidencePages(data: any): number[] {
  const pages = new Set<number>();

  function traverse(obj: any) {
    if (obj && typeof obj === 'object') {
      if ('evidence_pages' in obj && Array.isArray(obj.evidence_pages)) {
        obj.evidence_pages.forEach((p: number) => pages.add(p));
      }
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return Array.from(pages).sort((a, b) => a - b);
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('export-to-jsonl')
  .description('Export extraction results to JSONL format for DSPy training')
  .requiredOption('-i, --input <dir>', 'Input directory with extraction JSON files')
  .option('-o, --output <file>', 'Output JSONL file', './training_data/ground_truth.jsonl')
  .parse();

const options = program.opts();

// Run export
exportToJSONL(options.input, options.output).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
