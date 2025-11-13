#!/usr/bin/env tsx
/**
 * Batch Extract Simple - Extract specific fields from BRF PDFs
 *
 * Extracts:
 * - Financial fields (11): total_revenue_tkr, property_revenue_tkr, interest_revenue_tkr,
 *   other_revenue_tkr, total_costs_tkr, operational_costs_tkr, maintenance_costs_tkr,
 *   administrative_costs_tkr, interest_costs_tkr, depreciation_tkr, net_result_tkr
 * - Balance Sheet fields (10): total_assets_tkr, fixed_assets_tkr, current_assets_tkr,
 *   cash_bank_tkr, total_liabilities_tkr, long_term_liabilities_tkr, short_term_liabilities_tkr,
 *   total_equity_tkr, retained_earnings_tkr, current_year_result_tkr
 * - Chairman field (1): chairman_name
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

// =============================================================================
// TYPES
// =============================================================================

interface ExtractionField {
  value: any;
  confidence: number;
  evidence_pages: number[];
  original_string: string;
  notes?: string;
}

interface PDFExtractionTask {
  pdfPath: string;
  outputPath: string;
  pdfId: string;
}

interface ExtractionResult {
  extraction_metadata: {
    document_id: string;
    document_name: string;
    organization_name: string;
    organization_id: string;
    fiscal_year: string;
    extraction_date: string;
    currency: string;
    unit: string;
  };
  financial_agent: {
    total_revenue_tkr: ExtractionField;
    property_revenue_tkr: ExtractionField;
    interest_revenue_tkr: ExtractionField;
    other_revenue_tkr: ExtractionField;
    total_costs_tkr: ExtractionField;
    operational_costs_tkr: ExtractionField;
    maintenance_costs_tkr: ExtractionField;
    administrative_costs_tkr: ExtractionField;
    interest_costs_tkr: ExtractionField;
    depreciation_tkr: ExtractionField;
    net_result_tkr: ExtractionField;
  };
  balance_sheet_agent: {
    total_assets_tkr: ExtractionField;
    fixed_assets_tkr: ExtractionField;
    current_assets_tkr: ExtractionField;
    cash_bank_tkr: ExtractionField;
    total_liabilities_tkr: ExtractionField;
    long_term_liabilities_tkr: ExtractionField;
    short_term_liabilities_tkr: ExtractionField;
    total_equity_tkr: ExtractionField;
    retained_earnings_tkr: ExtractionField;
    current_year_result_tkr: ExtractionField;
  };
  chairman_agent: {
    chairman_name: ExtractionField;
  };
}

// =============================================================================
// PDF PROCESSING
// =============================================================================

async function convertPDFToImages(pdfPath: string): Promise<string[]> {
  console.log(`[PDF] Loading: ${pdfPath}`);

  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const numPages = pdfDoc.getPageCount();

  console.log(`[PDF] Pages: ${numPages}`);

  // Return empty array - we'll use PDF text extraction instead
  // In a real implementation, we'd convert pages to images here
  return [];
}

// =============================================================================
// MAIN EXTRACTION
// =============================================================================

async function extractPDF(task: PDFExtractionTask): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing: ${task.pdfId}`);
  console.log(`PDF: ${task.pdfPath}`);
  console.log(`Output: ${task.outputPath}`);
  console.log(`${'='.repeat(80)}\n`);

  // Convert PDF to images
  const images = await convertPDFToImages(task.pdfPath);

  console.log(`[${task.pdfId}] Extraction will be performed by Claude...`);
  console.log(`[${task.pdfId}] Please process this PDF and extract the required fields.`);

  // Create placeholder structure
  const result: ExtractionResult = {
    extraction_metadata: {
      document_id: task.pdfId,
      document_name: path.basename(task.pdfPath),
      organization_name: "",
      organization_id: "",
      fiscal_year: "",
      extraction_date: new Date().toISOString().split('T')[0],
      currency: "SEK",
      unit: "tkr"
    },
    financial_agent: {
      total_revenue_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      property_revenue_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      interest_revenue_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      other_revenue_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      total_costs_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      operational_costs_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      maintenance_costs_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      administrative_costs_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      interest_costs_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      depreciation_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      net_result_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" }
    },
    balance_sheet_agent: {
      total_assets_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      fixed_assets_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      current_assets_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      cash_bank_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      total_liabilities_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      long_term_liabilities_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      short_term_liabilities_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      total_equity_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      retained_earnings_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" },
      current_year_result_tkr: { value: 0, confidence: 0, evidence_pages: [], original_string: "" }
    },
    chairman_agent: {
      chairman_name: { value: "", confidence: 0, evidence_pages: [], original_string: "" }
    }
  };

  // This will be populated by manual extraction
  console.log(`[${task.pdfId}] Placeholder created. Extraction needed.`);

  return;
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

async function main() {
  const tasks: PDFExtractionTask[] = [
    {
      pdfPath: '/home/user/ZeldaMeetsClaude/pdfs/44549_årsredovisning_stockholm_brf_yk_huset.pdf',
      outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/44549_extraction.json',
      pdfId: '44549'
    },
    {
      pdfPath: '/home/user/ZeldaMeetsClaude/pdfs/49908_årsredovisning_sundbyberg_brf_stugan_2.pdf',
      outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/49908_extraction.json',
      pdfId: '49908'
    }
  ];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH EXTRACTION: ${tasks.length} PDFs`);
  console.log(`${'='.repeat(80)}\n`);

  for (const task of tasks) {
    await extractPDF(task);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH PROCESSING COMPLETE`);
  console.log(`Ready for manual extraction via Claude Code`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
