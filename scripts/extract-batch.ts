#!/usr/bin/env tsx
/**
 * Extract Batch - Process Multiple PDFs
 *
 * This script processes all PDFs in a directory using the iterative
 * refinement pipeline. It tracks progress, aggregates results, and
 * generates a summary report.
 *
 * Usage:
 *   npm run extract-batch -- --input ./pdfs/ --output ./results/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
import { execSync } from 'child_process';
import cliProgress from 'cli-progress';

// =============================================================================
// TYPES
// =============================================================================

interface BatchConfig {
  inputDir: string;
  outputDir: string;
  targetScore: number;
  maxIterations: number;
  parallel: number; // Number of PDFs to process in parallel
}

interface PDFResult {
  pdfId: string;
  pdfPath: string;
  finalScore: number;
  iterations: number;
  success: boolean;
  duration: number; // milliseconds
  error?: string;
}

interface BatchReport {
  startDate: string;
  endDate: string;
  totalPDFs: number;
  successCount: number;
  failureCount: number;
  averageScore: number;
  averageIterations: number;
  totalDuration: number;
  results: PDFResult[];
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

async function processBatch(config: BatchConfig): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH EXTRACTION PIPELINE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Input: ${config.inputDir}`);
  console.log(`Output: ${config.outputDir}`);
  console.log(`Target Score: ${config.targetScore}/100`);
  console.log(`Max Iterations: ${config.maxIterations}`);
  console.log(`${'='.repeat(80)}\n`);

  // Find all PDFs
  const pdfFiles = await findPDFs(config.inputDir);
  console.log(`Found ${pdfFiles.length} PDF files\n`);

  if (pdfFiles.length === 0) {
    console.log('No PDF files found. Exiting.');
    return;
  }

  // Ensure output directory
  await fs.ensureDir(config.outputDir);

  // Process each PDF
  const results: PDFResult[] = [];
  const startTime = Date.now();

  // Create progress bar
  const progressBar = new cliProgress.SingleBar(
    {
      format: 'Progress |{bar}| {percentage}% | {value}/{total} PDFs | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(pdfFiles.length, 0);

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const pdfId = path.basename(pdfPath, path.extname(pdfPath));

    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`Processing ${i + 1}/${pdfFiles.length}: ${pdfId}`);
    console.log(`${'═'.repeat(80)}\n`);

    const pdfStartTime = Date.now();

    try {
      // Run iterative refinement for this PDF
      execSync(
        `tsx scripts/iterative-refinement.ts ` +
          `--pdf "${pdfPath}" ` +
          `--output "${config.outputDir}" ` +
          `--target ${config.targetScore} ` +
          `--max-iterations ${config.maxIterations}`,
        { stdio: 'inherit' }
      );

      // Load refinement report
      const reportFile = path.join(config.outputDir, `${pdfId}_refinement_report.json`);
      const report = await fs.readJson(reportFile);

      results.push({
        pdfId,
        pdfPath,
        finalScore: report.finalScore,
        iterations: report.iterations.length,
        success: report.success,
        duration: Date.now() - pdfStartTime
      });
    } catch (error) {
      console.error(`\n✗ Error processing ${pdfId}:`, error);
      results.push({
        pdfId,
        pdfPath,
        finalScore: 0,
        iterations: 0,
        success: false,
        duration: Date.now() - pdfStartTime,
        error: String(error)
      });
    }

    progressBar.update(i + 1);
  }

  progressBar.stop();

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // Generate batch report
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  const averageScore =
    results.reduce((sum, r) => sum + r.finalScore, 0) / results.length;
  const averageIterations =
    results.reduce((sum, r) => sum + r.iterations, 0) / results.length;

  const report: BatchReport = {
    startDate: new Date(startTime).toISOString(),
    endDate: new Date(endTime).toISOString(),
    totalPDFs: results.length,
    successCount,
    failureCount,
    averageScore,
    averageIterations,
    totalDuration,
    results
  };

  // Save batch report
  const batchReportFile = path.join(config.outputDir, 'batch_report.json');
  await fs.writeJson(batchReportFile, report, { spaces: 2 });

  // Print summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`BATCH PROCESSING COMPLETE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total PDFs: ${report.totalPDFs}`);
  console.log(`Success: ${successCount} (${((successCount / report.totalPDFs) * 100).toFixed(1)}%)`);
  console.log(`Failures: ${failureCount}`);
  console.log(`Average Score: ${averageScore.toFixed(1)}/100`);
  console.log(`Average Iterations: ${averageIterations.toFixed(1)}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`Report: ${batchReportFile}`);
  console.log(`${'='.repeat(80)}\n`);

  // Show individual results
  console.log(`Individual Results:`);
  console.log(`${'─'.repeat(80)}`);
  console.log(
    `${'PDF ID'.padEnd(40)} | ${'Score'.padEnd(10)} | ${'Iterations'.padEnd(12)} | ${'Status'}`
  );
  console.log(`${'─'.repeat(80)}`);

  results.forEach(result => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const score = `${result.finalScore}/100`;
    console.log(
      `${result.pdfId.padEnd(40)} | ${score.padEnd(10)} | ${String(result.iterations).padEnd(12)} | ${status}`
    );
  });

  console.log(`${'─'.repeat(80)}\n`);

  // Show failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`Failed PDFs (${failures.length}):`);
    failures.forEach(f => {
      console.log(`  ✗ ${f.pdfId}: ${f.finalScore}/100`);
      if (f.error) {
        console.log(`    Error: ${f.error.substring(0, 100)}`);
      }
    });
    console.log();
  }

  // Show high performers
  const highPerformers = results.filter(r => r.finalScore >= config.targetScore).sort((a, b) => b.finalScore - a.finalScore);
  if (highPerformers.length > 0) {
    console.log(`High Performers (≥${config.targetScore}/100):`);
    highPerformers.slice(0, 10).forEach(r => {
      console.log(`  ✓ ${r.pdfId}: ${r.finalScore}/100 (${r.iterations} iterations)`);
    });
    console.log();
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function findPDFs(dir: string): Promise<string[]> {
  const pdfs: string[] = [];

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  }

  await scan(dir);
  return pdfs.sort();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('extract-batch')
  .description('Process multiple PDFs using iterative refinement pipeline')
  .requiredOption('-i, --input <dir>', 'Input directory containing PDFs')
  .option('-o, --output <dir>', 'Output directory', './results')
  .option('-t, --target <score>', 'Target score (0-100)', '95')
  .option('-m, --max-iterations <number>', 'Maximum iterations per PDF', '5')
  .option('-p, --parallel <number>', 'Number of parallel processes', '1')
  .parse();

const options = program.opts();

const config: BatchConfig = {
  inputDir: options.input,
  outputDir: options.output,
  targetScore: parseInt(options.target),
  maxIterations: parseInt(options.maxIterations),
  parallel: parseInt(options.parallel)
};

// Run batch processing
processBatch(config).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
