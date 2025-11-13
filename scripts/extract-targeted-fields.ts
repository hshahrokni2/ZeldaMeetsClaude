#!/usr/bin/env tsx
/**
 * Extract Targeted Fields from BRF Annual Reports
 *
 * This script extracts specific fields from BRF annual reports:
 * - Financial fields (11)
 * - Balance Sheet fields (10)
 * - Chairman (1)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import pdfParse from 'pdf-parse';

// =============================================================================
// TYPES
// =============================================================================

interface ExtractionResult {
  pdf_id: string;
  pdf_path: string;
  extraction_date: string;
  financial: FinancialData;
  balance_sheet: BalanceSheetData;
  chairman: ChairmanData;
  overall_confidence: number;
}

interface FinancialData {
  total_revenue_tkr: number | null;
  property_revenue_tkr: number | null;
  interest_revenue_tkr: number | null;
  other_revenue_tkr: number | null;
  total_costs_tkr: number | null;
  operational_costs_tkr: number | null;
  maintenance_costs_tkr: number | null;
  administrative_costs_tkr: number | null;
  interest_costs_tkr: number | null;
  depreciation_tkr: number | null;
  net_result_tkr: number | null;
  confidence: number;
  evidence_pages: number[];
}

interface BalanceSheetData {
  total_assets_tkr: number | null;
  fixed_assets_tkr: number | null;
  current_assets_tkr: number | null;
  cash_bank_tkr: number | null;
  short_term_investments_tkr: number | null;
  total_liabilities_tkr: number | null;
  long_term_liabilities_tkr: number | null;
  short_term_liabilities_tkr: number | null;
  total_equity_tkr: number | null;
  retained_earnings_tkr: number | null;
  confidence: number;
  evidence_pages: number[];
}

interface ChairmanData {
  chairman: string | null;
  confidence: number;
  evidence_pages: number[];
}

// =============================================================================
// PDF PROCESSING
// =============================================================================

async function loadPDF(pdfPath: string): Promise<{ text: string; numPages: number }> {
  console.log(`\nLoading PDF: ${pdfPath}`);

  const dataBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(dataBuffer);

  console.log(`Pages: ${pdfData.numpages}`);
  console.log(`Text length: ${pdfData.text.length} chars`);

  return {
    text: pdfData.text,
    numPages: pdfData.numpages
  };
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

async function extractTargetedFields(
  pdfPath: string,
  outputPath: string
): Promise<ExtractionResult> {
  const { text, numPages } = await loadPDF(pdfPath);
  const pdfId = path.basename(pdfPath, path.extname(pdfPath));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`EXTRACTING TARGETED FIELDS`);
  console.log(`PDF: ${pdfId}`);
  console.log(`${'='.repeat(80)}\n`);

  // Write full text to temp file for manual extraction
  const tempDir = path.join(path.dirname(outputPath), 'temp');
  await fs.ensureDir(tempDir);
  const textFile = path.join(tempDir, `${pdfId}_text.txt`);
  await fs.writeFile(textFile, text);
  console.log(`Full text saved to: ${textFile}`);

  // Create placeholder result structure
  const result: ExtractionResult = {
    pdf_id: pdfId,
    pdf_path: pdfPath,
    extraction_date: new Date().toISOString(),
    financial: {
      total_revenue_tkr: null,
      property_revenue_tkr: null,
      interest_revenue_tkr: null,
      other_revenue_tkr: null,
      total_costs_tkr: null,
      operational_costs_tkr: null,
      maintenance_costs_tkr: null,
      administrative_costs_tkr: null,
      interest_costs_tkr: null,
      depreciation_tkr: null,
      net_result_tkr: null,
      confidence: 0.0,
      evidence_pages: []
    },
    balance_sheet: {
      total_assets_tkr: null,
      fixed_assets_tkr: null,
      current_assets_tkr: null,
      cash_bank_tkr: null,
      short_term_investments_tkr: null,
      total_liabilities_tkr: null,
      long_term_liabilities_tkr: null,
      short_term_liabilities_tkr: null,
      total_equity_tkr: null,
      retained_earnings_tkr: null,
      confidence: 0.0,
      evidence_pages: []
    },
    chairman: {
      chairman: null,
      confidence: 0.0,
      evidence_pages: []
    },
    overall_confidence: 0.0
  };

  console.log(`\nExtraction structure created. Manual extraction required.`);
  console.log(`Please fill in the fields by analyzing the text file.`);

  return result;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const pdfs = [
    {
      path: '/home/user/ZeldaMeetsClaude/pdfs/51223_årsredovisning_jönköping_brf_lönnen.pdf',
      output: '/home/user/ZeldaMeetsClaude/results/batch_extraction/51223_extraction.json'
    },
    {
      path: '/home/user/ZeldaMeetsClaude/pdfs/52476_årsredovisning_kungälv_brf_smultronstället_i_ytterby.pdf',
      output: '/home/user/ZeldaMeetsClaude/results/batch_extraction/52476_extraction.json'
    }
  ];

  console.log('Starting targeted field extraction for 2 PDFs...\n');

  for (const pdf of pdfs) {
    await extractTargetedFields(pdf.path, pdf.output);
  }

  console.log('\n✓ Extraction structure created for all PDFs');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
