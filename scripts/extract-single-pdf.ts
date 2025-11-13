#!/usr/bin/env tsx
/**
 * Extract Single PDF - Claude Self-Extraction Pipeline
 *
 * This script extracts structured data from a single Swedish BRF annual report
 * using Claude as the extraction agent. It performs iterative refinement and
 * self-auditing to achieve 95%+ accuracy.
 *
 * Usage:
 *   npm run extract-single -- --pdf ./pdfs/example.pdf --output ./results/
 *
 * Process:
 * 1. Load PDF and extract text/images
 * 2. For each of 19 agents:
 *    - Extract data using Claude (via Task tool)
 *    - Audit results for completeness and confidence
 *    - Refine if needed (focus on blind spots)
 * 3. Aggregate all agent results
 * 4. Output final JSON with ground truth data
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
import pdfParse from 'pdf-parse';

// =============================================================================
// TYPES
// =============================================================================

interface AgentDefinition {
  id: string;
  name: string;
  promptFile: string;
  expectedFields: string[];
}

interface ExtractionOutput {
  pdfId: string;
  pdfPath: string;
  extractionDate: string;
  agents: AgentResult[];
  summary: {
    totalFields: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    overallConfidence: number;
  };
}

interface AgentResult {
  agentId: string;
  data: any;
  confidence: number;
  pass: number;
  timestamp: string;
}

// =============================================================================
// AGENT DEFINITIONS
// =============================================================================

const AGENTS: AgentDefinition[] = [
  {
    id: 'chairman',
    name: 'Chairman Agent',
    promptFile: 'agents/chairman_agent.md',
    expectedFields: ['chairman_name', 'evidence_pages']
  },
  {
    id: 'financial',
    name: 'Financial Agent',
    promptFile: 'agents/financial_agent.md',
    expectedFields: [
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
      'net_result_tkr'
    ]
  },
  {
    id: 'balance_sheet',
    name: 'Balance Sheet Agent',
    promptFile: 'agents/balance_sheet_agent.md',
    expectedFields: [
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
    ]
  },
  // Add remaining 16 agents...
  {
    id: 'board_members',
    name: 'Board Members Agent',
    promptFile: 'agents/board_members_agent.md',
    expectedFields: ['board_members', 'evidence_pages']
  },
  {
    id: 'auditor',
    name: 'Auditor Agent',
    promptFile: 'agents/auditor_agent.md',
    expectedFields: ['auditor_name', 'auditor_firm', 'evidence_pages']
  }
  // TODO: Add remaining 14 agents
];

// =============================================================================
// PDF PROCESSING
// =============================================================================

async function loadPDF(pdfPath: string): Promise<{ text: string; numPages: number }> {
  console.log(`\n[PDF] Loading: ${pdfPath}`);

  const dataBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(dataBuffer);

  console.log(`[PDF] Pages: ${pdfData.numpages}`);
  console.log(`[PDF] Text length: ${pdfData.text.length} chars`);

  return {
    text: pdfData.text,
    numPages: pdfData.numpages
  };
}

// =============================================================================
// EXTRACTION ENGINE
// =============================================================================

async function extractWithAgent(
  agent: AgentDefinition,
  pdfText: string,
  pdfPath: string,
  pass: number = 1,
  previousData?: any,
  blindSpots?: string[]
): Promise<AgentResult> {
  console.log(`\n[${ agent.name}] Pass ${pass}`);

  // Load agent prompt
  const agentPromptPath = path.join(process.cwd(), agent.promptFile);
  const agentPrompt = await fs.readFile(agentPromptPath, 'utf-8');

  // Build extraction instructions
  let instructions = `You are extracting data from a Swedish BRF annual report as the ${agent.name}.\n\n`;
  instructions += `PDF: ${path.basename(pdfPath)}\n\n`;
  instructions += `=== AGENT INSTRUCTIONS ===\n${agentPrompt}\n\n`;
  instructions += `=== PDF TEXT ===\n${pdfText.substring(0, 50000)}\n\n`; // First 50k chars

  if (previousData) {
    instructions += `=== PREVIOUS EXTRACTION (refine this) ===\n${JSON.stringify(previousData, null, 2)}\n\n`;
  }

  if (blindSpots && blindSpots.length > 0) {
    instructions += `=== FOCUS ON THESE MISSING/LOW-CONFIDENCE FIELDS ===\n${blindSpots.join('\n')}\n\n`;
  }

  instructions += `IMPORTANT:\n`;
  instructions += `1. Extract ONLY the fields listed in the agent instructions\n`;
  instructions += `2. Return VALID JSON only (no markdown fences)\n`;
  instructions += `3. For each numeric field ending in _tkr, include a corresponding _original field\n`;
  instructions += `4. Include evidence_pages array with page numbers where data was found\n`;
  instructions += `5. If a field is not found, omit it (don't include null)\n\n`;
  instructions += `Return your extraction now as JSON:`;

  // Write task file for manual processing
  const taskDir = path.join(process.cwd(), 'results', 'tasks');
  await fs.ensureDir(taskDir);
  const taskFile = path.join(taskDir, `${agent.id}_pass${pass}_${Date.now()}.txt`);
  await fs.writeFile(taskFile, instructions);

  console.log(`[${agent.name}] Task written to: ${taskFile}`);
  console.log(`[${agent.name}] ⚠ Manual extraction required - process this task and save JSON to results/`);

  // Placeholder result (will be populated when task is processed)
  return {
    agentId: agent.id,
    data: {},
    confidence: 0.0,
    pass,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// AUDIT ENGINE
// =============================================================================

function auditExtraction(result: AgentResult, expectedFields: string[]): {
  confidence: number;
  missingFields: string[];
  lowConfidenceFields: string[];
  recommendations: string[];
} {
  const extractedFields = Object.keys(result.data);
  const missingFields = expectedFields.filter(f => !extractedFields.includes(f));

  const lowConfidenceFields = extractedFields.filter(field => {
    const value = result.data[field];
    if (value && typeof value === 'object' && 'confidence' in value) {
      return value.confidence < 0.7;
    }
    return false;
  });

  // Calculate confidence
  let totalConfidence = 0;
  let fieldCount = 0;

  for (const field of extractedFields) {
    const value = result.data[field];
    if (value && typeof value === 'object' && 'confidence' in value) {
      totalConfidence += value.confidence;
      fieldCount++;
    }
  }

  const confidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

  const recommendations: string[] = [];
  if (missingFields.length > 0) {
    recommendations.push(`Extract missing fields: ${missingFields.join(', ')}`);
  }
  if (lowConfidenceFields.length > 0) {
    recommendations.push(`Verify low-confidence fields: ${lowConfidenceFields.join(', ')}`);
  }

  return { confidence, missingFields, lowConfidenceFields, recommendations };
}

// =============================================================================
// MAIN EXTRACTION PIPELINE
// =============================================================================

async function extractSinglePDF(
  pdfPath: string,
  outputDir: string,
  targetConfidence: number = 0.95,
  maxPasses: number = 3
): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`CLAUDE SELF-EXTRACTION PIPELINE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Target Confidence: ${(targetConfidence * 100).toFixed(0)}%`);
  console.log(`Max Passes: ${maxPasses}`);
  console.log(`${'='.repeat(80)}\n`);

  // Load PDF
  const { text, numPages } = await loadPDF(pdfPath);
  const pdfId = path.basename(pdfPath, path.extname(pdfPath));

  // Extract with each agent
  const results: AgentResult[] = [];

  for (const agent of AGENTS) {
    let currentResult = await extractWithAgent(agent, text, pdfPath, 1);
    let pass = 1;

    // Iterative refinement
    while (pass <= maxPasses) {
      const audit = auditExtraction(currentResult, agent.expectedFields);

      console.log(`[${agent.name}] Audit Results:`);
      console.log(`  - Confidence: ${(audit.confidence * 100).toFixed(1)}%`);
      console.log(`  - Missing: ${audit.missingFields.length} fields`);
      console.log(`  - Low confidence: ${audit.lowConfidenceFields.length} fields`);

      if (audit.confidence >= targetConfidence && audit.missingFields.length === 0) {
        console.log(`[${agent.name}] ✓ Target confidence reached!`);
        break;
      }

      if (pass === maxPasses) {
        console.log(`[${agent.name}] ⚠ Max passes reached`);
        break;
      }

      // Refine
      const blindSpots = [...audit.missingFields, ...audit.lowConfidenceFields];
      currentResult = await extractWithAgent(agent, text, pdfPath, pass + 1, currentResult.data, blindSpots);
      pass++;
    }

    results.push(currentResult);
  }

  // Aggregate results
  const output: ExtractionOutput = {
    pdfId,
    pdfPath,
    extractionDate: new Date().toISOString(),
    agents: results,
    summary: {
      totalFields: results.reduce((sum, r) => sum + Object.keys(r.data).length, 0),
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      overallConfidence: 0
    }
  };

  // Calculate summary stats
  let totalConfidence = 0;
  let confidenceCount = 0;

  results.forEach(r => {
    Object.values(r.data).forEach((value: any) => {
      if (value && typeof value === 'object' && 'confidence' in value) {
        const conf = value.confidence;
        totalConfidence += conf;
        confidenceCount++;

        if (conf >= 0.9) output.summary.highConfidence++;
        else if (conf >= 0.7) output.summary.mediumConfidence++;
        else output.summary.lowConfidence++;
      }
    });
  });

  output.summary.overallConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

  // Save output
  await fs.ensureDir(outputDir);
  const outputFile = path.join(outputDir, `${pdfId}_extraction.json`);
  await fs.writeJson(outputFile, output, { spaces: 2 });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`EXTRACTION COMPLETE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Total Fields: ${output.summary.totalFields}`);
  console.log(`Overall Confidence: ${(output.summary.overallConfidence * 100).toFixed(1)}%`);
  console.log(`  High (≥90%): ${output.summary.highConfidence}`);
  console.log(`  Medium (70-89%): ${output.summary.mediumConfidence}`);
  console.log(`  Low (<70%): ${output.summary.lowConfidence}`);
  console.log(`${'='.repeat(80)}\n`);
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('extract-single-pdf')
  .description('Extract structured data from a single Swedish BRF annual report using Claude self-extraction')
  .requiredOption('-p, --pdf <path>', 'Path to PDF file')
  .option('-o, --output <dir>', 'Output directory', './results')
  .option('-c, --confidence <number>', 'Target confidence (0.0-1.0)', '0.95')
  .option('-m, --max-passes <number>', 'Maximum refinement passes', '3')
  .parse();

const options = program.opts();

// Run extraction
extractSinglePDF(
  options.pdf,
  options.output,
  parseFloat(options.confidence),
  parseInt(options.maxPasses)
).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
