#!/usr/bin/env tsx
/**
 * Custom Batch Extraction for 2 BRF PDFs
 * Extracts: Financial (11), Balance Sheet (10), Chairman (1)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import pdfParse from 'pdf-parse';

// Configuration for the 2 PDFs
const PDFS = [
  {
    path: '/home/user/ZeldaMeetsClaude/pdfs/54886_årsredovisning_södertälje_brf_kastanjen_4_5.pdf',
    outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/54886_extraction.json',
    id: '54886'
  },
  {
    path: '/home/user/ZeldaMeetsClaude/pdfs/55218_årsredovisning_jönköping_riksbyggen_brf_lekerydshus_nr_1.pdf',
    outputPath: '/home/user/ZeldaMeetsClaude/results/batch_extraction/55218_extraction.json',
    id: '55218'
  }
];

interface ExtractionResult {
  pdf_id: string;
  pdf_path: string;
  extraction_date: string;
  agents: Agent[];
  summary: Summary;
  audit_report: AuditReport;
}

interface Agent {
  agent_id: string;
  extraction_pass: number;
  confidence: number;
  fields_extracted: number;
  data: any;
}

interface Summary {
  total_fields: number;
  total_agents: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  overall_confidence: number;
}

interface AuditReport {
  cross_validation: any;
  status: string;
  audit_score: number;
}

async function extractPDF(pdfPath: string): Promise<{ text: string; numPages: number }> {
  console.log(`\nReading PDF: ${pdfPath}`);
  const dataBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(dataBuffer);
  console.log(`  Pages: ${pdfData.numpages}`);
  console.log(`  Text length: ${pdfData.text.length} chars`);

  // Save text for manual review
  const textPath = pdfPath.replace('.pdf', '_text.txt');
  await fs.writeFile(textPath, pdfData.text);
  console.log(`  Text saved to: ${textPath}`);

  return {
    text: pdfData.text,
    numPages: pdfData.numpages
  };
}

async function main() {
  console.log('Starting extraction of 2 BRF PDFs...\n');
  console.log('This script will extract PDF text for manual analysis.');
  console.log('Claude will then analyze the text to extract the required fields.\n');

  for (const pdfConfig of PDFS) {
    await extractPDF(pdfConfig.path);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEXT EXTRACTION COMPLETE');
  console.log(`${'='.repeat(80)}`);
  console.log('Text files saved. Ready for Claude analysis.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
