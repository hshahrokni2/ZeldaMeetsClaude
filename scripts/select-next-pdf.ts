#!/usr/bin/env tsx
/**
 * Select Next PDF - Autonomous Session
 *
 * Selects the next unprocessed PDF according to AUTONOMOUS_SESSION_PROTOCOL.md
 */

import { selectNextPDF, getStats, getAllPDFStatus } from '../lib/pdf-tracker';

async function main() {
  console.log('📊 PDF Processing Statistics\n');

  const stats = await getStats();

  console.log(`Total PDFs: ${stats.total}`);
  console.log(`✅ Completed: ${stats.completed}`);
  console.log(`🔒 Locked: ${stats.locked}`);
  console.log(`📄 Available: ${stats.available}`);
  console.log(`📈 Progress: ${Math.round((stats.completed / stats.total) * 100)}%\n`);

  const nextPdf = await selectNextPDF();

  if (nextPdf) {
    console.log(`✨ Next PDF to process:`);
    console.log(`   ${nextPdf}\n`);
  } else {
    console.log('🎉 All PDFs processed!\n');
  }

  // Show first 10 available PDFs
  const allStatuses = await getAllPDFStatus();
  const available = allStatuses.filter(s => s.status === 'available').slice(0, 10);

  if (available.length > 0) {
    console.log('Next 10 available PDFs:');
    available.forEach((pdf, i) => {
      console.log(`${i + 1}. ${pdf.pdf_path}`);
    });
  }
}

main().catch(console.error);
