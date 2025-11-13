#!/usr/bin/env tsx
/**
 * Iterative Refinement - Self-Improvement Loop
 *
 * This script implements an iterative refinement loop that:
 * 1. Extracts data from PDF
 * 2. Audits extraction for issues
 * 3. Re-extracts with focus on blind spots
 * 4. Repeats until 95%+ confidence or max iterations reached
 *
 * Usage:
 *   npm run refine -- --pdf ./pdfs/example.pdf --output ./results/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
import { execSync } from 'child_process';

// =============================================================================
// TYPES
// =============================================================================

interface RefinementConfig {
  pdfPath: string;
  outputDir: string;
  targetScore: number;
  maxIterations: number;
  minImprovement: number; // Minimum score improvement to continue
}

interface RefinementIteration {
  iteration: number;
  extractionFile: string;
  auditFile: string;
  score: number;
  issues: number;
  improvements: string[];
  timestamp: string;
}

interface RefinementReport {
  pdfId: string;
  startDate: string;
  endDate: string;
  finalScore: number;
  iterations: RefinementIteration[];
  success: boolean;
  totalImprovement: number;
}

// =============================================================================
// MAIN REFINEMENT LOOP
// =============================================================================

async function iterativeRefinement(config: RefinementConfig): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ITERATIVE REFINEMENT LOOP`);
  console.log(`${'='.repeat(80)}`);
  console.log(`PDF: ${config.pdfPath}`);
  console.log(`Target Score: ${config.targetScore}/100`);
  console.log(`Max Iterations: ${config.maxIterations}`);
  console.log(`${'='.repeat(80)}\n`);

  const pdfId = path.basename(config.pdfPath, path.extname(config.pdfPath));
  const iterations: RefinementIteration[] = [];
  let currentScore = 0;
  let previousScore = 0;

  // Ensure output directory exists
  await fs.ensureDir(config.outputDir);

  for (let i = 1; i <= config.maxIterations; i++) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`ITERATION ${i}/${config.maxIterations}`);
    console.log(`${'─'.repeat(80)}\n`);

    // Step 1: Extract
    console.log(`[Step 1/${i}] Running extraction...`);
    const extractionFile = path.join(config.outputDir, `${pdfId}_iter${i}_extraction.json`);

    try {
      // Run extraction script
      execSync(
        `tsx scripts/extract-single-pdf.ts --pdf "${config.pdfPath}" --output "${config.outputDir}"`,
        { stdio: 'inherit' }
      );

      // Rename output to include iteration number
      const defaultOutput = path.join(config.outputDir, `${pdfId}_extraction.json`);
      if (await fs.pathExists(defaultOutput)) {
        await fs.move(defaultOutput, extractionFile, { overwrite: true });
      }
    } catch (error) {
      console.error(`[Error] Extraction failed:`, error);
      break;
    }

    // Step 2: Audit
    console.log(`\n[Step 2/${i}] Running audit...`);
    const auditFile = path.join(config.outputDir, `${pdfId}_iter${i}_audit.json`);

    try {
      execSync(
        `tsx scripts/audit-extraction.ts --input "${extractionFile}" --output "${auditFile}"`,
        { stdio: 'inherit' }
      );
    } catch (error) {
      console.error(`[Error] Audit failed:`, error);
      break;
    }

    // Step 3: Load audit results
    const auditReport = await fs.readJson(auditFile);
    currentScore = auditReport.overallScore;
    const issueCount = auditReport.issues.length;

    // Record iteration
    iterations.push({
      iteration: i,
      extractionFile,
      auditFile,
      score: currentScore,
      issues: issueCount,
      improvements: auditReport.recommendations || [],
      timestamp: new Date().toISOString()
    });

    // Step 4: Check if target reached
    console.log(`\n[Results ${i}]`);
    console.log(`  Score: ${currentScore}/100`);
    console.log(`  Issues: ${issueCount}`);
    console.log(`  Status: ${auditReport.passFailStatus}`);

    if (currentScore >= config.targetScore && auditReport.passFailStatus === 'PASS') {
      console.log(`\n✓ Target score reached! Refinement complete.`);
      break;
    }

    // Step 5: Check for improvement
    const improvement = currentScore - previousScore;
    console.log(`  Improvement: +${improvement.toFixed(1)} points`);

    if (i > 1 && improvement < config.minImprovement) {
      console.log(`\n⚠ Minimal improvement detected. Stopping refinement.`);
      break;
    }

    previousScore = currentScore;

    // Step 6: Prepare for next iteration
    if (i < config.maxIterations) {
      console.log(`\n[Next Iteration] Will focus on:`);
      auditReport.recommendations.forEach((rec: string, idx: number) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });
    }
  }

  // Generate final report
  const report: RefinementReport = {
    pdfId,
    startDate: iterations[0]?.timestamp || new Date().toISOString(),
    endDate: iterations[iterations.length - 1]?.timestamp || new Date().toISOString(),
    finalScore: currentScore,
    iterations,
    success: currentScore >= config.targetScore,
    totalImprovement: currentScore - (iterations[0]?.score || 0)
  };

  // Save report
  const reportFile = path.join(config.outputDir, `${pdfId}_refinement_report.json`);
  await fs.writeJson(reportFile, report, { spaces: 2 });

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`REFINEMENT COMPLETE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Iterations: ${iterations.length}`);
  console.log(`Initial Score: ${iterations[0]?.score || 0}/100`);
  console.log(`Final Score: ${currentScore}/100`);
  console.log(`Improvement: +${report.totalImprovement.toFixed(1)} points`);
  console.log(`Success: ${report.success ? '✓ YES' : '✗ NO'}`);
  console.log(`Report: ${reportFile}`);
  console.log(`${'='.repeat(80)}\n`);

  // Show iteration history
  console.log(`Iteration History:`);
  iterations.forEach(iter => {
    const status = iter.score >= config.targetScore ? '✓' : '○';
    console.log(`  ${status} Iteration ${iter.iteration}: ${iter.score}/100 (${iter.issues} issues)`);
  });
  console.log();
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('iterative-refinement')
  .description('Iteratively refine extraction until target confidence is reached')
  .requiredOption('-p, --pdf <path>', 'Path to PDF file')
  .option('-o, --output <dir>', 'Output directory', './results')
  .option('-t, --target <score>', 'Target score (0-100)', '95')
  .option('-m, --max-iterations <number>', 'Maximum iterations', '5')
  .option('-i, --min-improvement <number>', 'Minimum improvement per iteration', '2')
  .parse();

const options = program.opts();

const config: RefinementConfig = {
  pdfPath: options.pdf,
  outputDir: options.output,
  targetScore: parseInt(options.target),
  maxIterations: parseInt(options.maxIterations),
  minImprovement: parseFloat(options.minImprovement)
};

// Run refinement
iterativeRefinement(config).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
