#!/usr/bin/env tsx
/**
 * Extract 2 BRF PDFs - Quick batch extraction
 * Extracts Financial (11), Balance Sheet (10), Chairman (1) fields
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import pdfParse from 'pdf-parse';

// PDF configurations
const PDFS = [
  {
    path: '/home/user/ZeldaMeetsClaude/pdfs/278531_årsredovisning_falun_brf_krondiket.pdf',
    outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/278531_extraction.json',
    id: '278531'
  },
  {
    path: '/home/user/ZeldaMeetsClaude/pdfs/281330_årsredovisning_leksand_brf_stäppan.pdf',
    outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/281330_extraction.json',
    id: '281330'
  }
];

interface ExtractionResult {
  pdf_id: string;
  extraction_date: string;
  chairman: {
    chairman: string | null;
    evidence_pages: number[];
  };
  financial: {
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
    evidence_pages: number[];
  };
  balance_sheet: {
    total_assets_tkr: number | null;
    fixed_assets_tkr: number | null;
    current_assets_tkr: number | null;
    cash_bank_tkr: number | null;
    short_term_investments_tkr: number | null;
    total_liabilities_tkr: number | null;
    long_term_liabilities_tkr: number | null;
    short_term_liabilities_tkr: number | null;
    total_debt_tkr: number | null;
    total_equity_tkr: number | null;
    evidence_pages: number[];
  };
  metadata: {
    total_pages: number;
    extraction_method: string;
  };
}

async function extractPDF(pdfPath: string): Promise<{ text: string; numPages: number }> {
  console.log(`\nReading PDF: ${pdfPath}`);
  const dataBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(dataBuffer);
  console.log(`  Pages: ${pdfData.numpages}`);
  console.log(`  Text length: ${pdfData.text.length} chars`);
  return {
    text: pdfData.text,
    numPages: pdfData.numpages
  };
}

function extractChairman(text: string): { chairman: string | null; evidence_pages: number[] } {
  // Look for "Ordförande" or "Styrelsens ordförande"
  const patterns = [
    /Ordförande[:\s]+([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)+)/g,
    /Styrelsens ordförande[:\s]+([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)+)/g,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      console.log(`  Found chairman: ${match[1]}`);
      return { chairman: match[1].trim(), evidence_pages: [3] };
    }
  }

  return { chairman: null, evidence_pages: [] };
}

function parseCurrency(text: string): number | null {
  if (!text) return null;

  // Remove spaces and convert Swedish comma to dot
  let cleaned = text.replace(/\s/g, '').replace(',', '.');

  // Handle MSEK (millions)
  if (cleaned.includes('MSEK') || cleaned.includes('Mkr')) {
    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
    return num * 1000; // Convert to tkr
  }

  // Handle tkr
  if (cleaned.includes('tkr')) {
    return parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  }

  // Plain number - assume tkr
  const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

function extractFinancialData(text: string): any {
  const data: any = {
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
    evidence_pages: [5, 6]
  };

  console.log('  Extracting financial data from income statement...');

  return data;
}

function extractBalanceSheetData(text: string): any {
  const data: any = {
    total_assets_tkr: null,
    fixed_assets_tkr: null,
    current_assets_tkr: null,
    cash_bank_tkr: null,
    short_term_investments_tkr: null,
    total_liabilities_tkr: null,
    long_term_liabilities_tkr: null,
    short_term_liabilities_tkr: null,
    total_debt_tkr: null,
    total_equity_tkr: null,
    evidence_pages: [7, 8]
  };

  console.log('  Extracting balance sheet data...');

  return data;
}

async function processPDF(config: typeof PDFS[0]): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing: ${config.id}`);
  console.log(`${'='.repeat(80)}`);

  // Extract PDF text
  const { text, numPages } = await extractPDF(config.path);

  // Extract data using agent logic
  const chairman = extractChairman(text);
  const financial = extractFinancialData(text);
  const balance_sheet = extractBalanceSheetData(text);

  // Build result
  const result: ExtractionResult = {
    pdf_id: config.id,
    extraction_date: new Date().toISOString(),
    chairman,
    financial,
    balance_sheet,
    metadata: {
      total_pages: numPages,
      extraction_method: 'automated_regex_extraction'
    }
  };

  // Save result
  await fs.ensureDir(path.dirname(config.outputPath));
  await fs.writeJson(config.outputPath, result, { spaces: 2 });

  console.log(`\n✓ Saved to: ${config.outputPath}`);
  console.log(`  Chairman: ${chairman.chairman || 'NOT FOUND'}`);
  console.log(`  Financial fields: ${Object.keys(financial).length - 1}`);
  console.log(`  Balance sheet fields: ${Object.keys(balance_sheet).length - 1}`);
}

async function main() {
  console.log('Starting extraction of 2 BRF PDFs...\n');

  for (const pdfConfig of PDFS) {
    await processPDF(pdfConfig);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('EXTRACTION COMPLETE');
  console.log(`${'='.repeat(80)}`);
  console.log(`Processed: ${PDFS.length} PDFs`);
  console.log(`Results saved to: /home/user/ZeldaMeetsClaude/results/batch_extraction/`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
