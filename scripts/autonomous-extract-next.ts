#!/usr/bin/env tsx

/**
 * Autonomous PDF Extraction Script
 *
 * Follows AUTONOMOUS_SESSION_PROTOCOL.md to:
 * 1. Select next unprocessed PDF
 * 2. Lock it in processing tracker
 * 3. Run extraction pipeline
 * 4. Validate results
 * 5. Document learnings
 * 6. Commit and push to git
 */

import * as fs from 'fs';
import * as path from 'path';

const SESSION_ID = `session_${new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_')}`;
const SESSION_DIR = path.join(process.cwd(), 'sessions', SESSION_ID);
const TRACKER_PATH = path.join(process.cwd(), 'processing-tracker.json');

interface PDF {
  pdfId: string;
  pdfPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial_success';
  sessionId: string | null;
  lockedAt: string | null;
  completedAt: string | null;
  attempts: number;
}

interface ProcessingTracker {
  version: string;
  lastUpdated: string;
  summary: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    partial_success: number;
  };
  pdfs: PDF[];
}

interface SessionMetadata {
  sessionId: string;
  startTime: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  pdfId: string | null;
  pdfPath: string | null;
  currentStep: string;
  branch: string;
}

/**
 * Print banner
 */
function printBanner(title: string, status: 'START' | 'SUCCESS' | 'ERROR' = 'START') {
  const width = 70;
  const symbol = status === 'SUCCESS' ? '✓' : status === 'ERROR' ? '✗' : '▶';
  console.log('\n' + '═'.repeat(width));
  console.log(`  ${symbol} ${title}`.padEnd(width));
  console.log('═'.repeat(width) + '\n');
}

/**
 * Check prerequisites
 */
function checkPrerequisites(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('Missing ANTHROPIC_API_KEY in .env');
  }
  if (!process.env.OPENAI_API_KEY) {
    errors.push('Missing OPENAI_API_KEY in .env');
  }
  if (!process.env.GEMINI_API_KEY) {
    errors.push('Missing GEMINI_API_KEY in .env');
  }

  // Check node_modules
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    errors.push('Dependencies not installed (run: npm install)');
  }

  // Check critical files
  const criticalFiles = [
    'lib/extraction-workflow.ts',
    'schemas/full-extraction-result.ts',
    'processing-tracker.json'
  ];

  for (const file of criticalFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      errors.push(`Missing critical file: ${file}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Load processing tracker
 */
function loadTracker(): ProcessingTracker {
  if (!fs.existsSync(TRACKER_PATH)) {
    throw new Error('processing-tracker.json not found. Run initialization first.');
  }
  return JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf-8'));
}

/**
 * Save processing tracker
 */
function saveTracker(tracker: ProcessingTracker) {
  tracker.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

/**
 * Select next pending PDF
 */
function selectNextPDF(tracker: ProcessingTracker): PDF | null {
  // Find first pending PDF
  const pendingPDFs = tracker.pdfs.filter(pdf => pdf.status === 'pending');

  if (pendingPDFs.length === 0) {
    return null;
  }

  // Check for stale locks (older than 60 minutes)
  const staleThreshold = Date.now() - (60 * 60 * 1000);
  const processingPDFs = tracker.pdfs.filter(pdf => pdf.status === 'processing');

  for (const pdf of processingPDFs) {
    if (pdf.lockedAt && new Date(pdf.lockedAt).getTime() < staleThreshold) {
      console.warn(`[WARNING] Found stale lock on PDF ${pdf.pdfId} (locked at ${pdf.lockedAt})`);
      console.warn(`[WARNING] Stealing lock and re-processing...`);
      return pdf;
    }
  }

  return pendingPDFs[0];
}

/**
 * Lock PDF for processing
 */
function lockPDF(tracker: ProcessingTracker, pdf: PDF): void {
  const pdfIndex = tracker.pdfs.findIndex(p => p.pdfId === pdf.pdfId);

  if (pdfIndex === -1) {
    throw new Error(`PDF ${pdf.pdfId} not found in tracker`);
  }

  tracker.pdfs[pdfIndex].status = 'processing';
  tracker.pdfs[pdfIndex].sessionId = SESSION_ID;
  tracker.pdfs[pdfIndex].lockedAt = new Date().toISOString();
  tracker.pdfs[pdfIndex].attempts += 1;

  // Update summary
  tracker.summary.pending -= 1;
  tracker.summary.processing += 1;

  saveTracker(tracker);

  // Write lock file
  const lockData = {
    pdfId: pdf.pdfId,
    pdfPath: pdf.pdfPath,
    lockedAt: new Date().toISOString(),
    sessionId: SESSION_ID
  };

  fs.writeFileSync(
    path.join(SESSION_DIR, 'pdf_lock.json'),
    JSON.stringify(lockData, null, 2)
  );

  console.log(`[LOCK] PDF ${pdf.pdfId} locked for session ${SESSION_ID}`);
}

/**
 * Unlock PDF (mark as completed/failed)
 */
function unlockPDF(
  tracker: ProcessingTracker,
  pdf: PDF,
  status: 'completed' | 'failed' | 'partial_success',
  summary?: any
): void {
  const pdfIndex = tracker.pdfs.findIndex(p => p.pdfId === pdf.pdfId);

  if (pdfIndex === -1) {
    throw new Error(`PDF ${pdf.pdfId} not found in tracker`);
  }

  tracker.pdfs[pdfIndex].status = status;
  tracker.pdfs[pdfIndex].completedAt = new Date().toISOString();

  // Update summary
  tracker.summary.processing -= 1;
  tracker.summary[status] += 1;

  saveTracker(tracker);

  console.log(`[UNLOCK] PDF ${pdf.pdfId} marked as ${status}`);
}

/**
 * Initialize session
 */
function initializeSession(pdf: PDF): void {
  // Create session directory
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  fs.mkdirSync(path.join(SESSION_DIR, 'agents'), { recursive: true });

  // Get current git branch
  const branch = require('child_process')
    .execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .trim();

  const metadata: SessionMetadata = {
    sessionId: SESSION_ID,
    startTime: new Date().toISOString(),
    status: 'RUNNING',
    pdfId: pdf.pdfId,
    pdfPath: pdf.pdfPath,
    currentStep: 'INITIALIZATION',
    branch
  };

  fs.writeFileSync(
    path.join(SESSION_DIR, 'session.json'),
    JSON.stringify(metadata, null, 2)
  );

  printBanner('AUTONOMOUS SESSION INITIATED');
  console.log(`Session ID: ${SESSION_ID}`);
  console.log(`PDF: ${pdf.pdfId} (${pdf.pdfPath})`);
  console.log(`Branch: ${branch}`);
  console.log(`Mode: FULL AUTOMATION\n`);
}

/**
 * Run extraction (placeholder - requires API keys)
 */
async function runExtraction(pdf: PDF): Promise<any> {
  console.log(`[EXTRACT] Starting extraction for ${pdf.pdfId}...`);

  // This would call lib/extraction-workflow.ts
  // For now, we check if prerequisites are met
  const prereqs = checkPrerequisites();

  if (!prereqs.valid) {
    throw new Error(`Prerequisites not met:\n${prereqs.errors.map(e => `  - ${e}`).join('\n')}`);
  }

  // Placeholder: Would run actual extraction here
  // const result = await runExtractionWorkflow({ ... });

  throw new Error('Extraction pipeline requires API keys and dependencies. See AUTONOMOUS_SESSION_PROTOCOL.md');
}

/**
 * Document learnings
 */
function documentLearnings(pdf: PDF, result: any, errors: string[]): void {
  const learnings = `## Session: ${SESSION_ID}
**PDF**: ${pdf.pdfId} (${pdf.pdfPath})
**Date**: ${new Date().toISOString()}
**Status**: ${errors.length > 0 ? 'BLOCKED' : 'SUCCESS'}

### Prerequisites Check

${errors.length > 0 ? '#### ❌ Missing Prerequisites\n' + errors.map(e => `- ${e}`).join('\n') : '#### ✅ All Prerequisites Met'}

### What Was Attempted
- Session initialization: ✅
- PDF selection and locking: ✅
- Extraction pipeline: ${errors.length > 0 ? '❌ (prerequisites not met)' : '✅'}

### Blockers
${errors.length > 0 ? errors.map(e => `- ${e}`).join('\n') : 'None'}

### Next Steps
${errors.length > 0 ? `
1. Configure .env file with API keys (see .env.example)
2. Run: npm install
3. Run this script again: npx tsx scripts/autonomous-extract-next.ts
` : `
1. Validate extraction results
2. Commit to git
3. Process next PDF
`}

### Autonomous System Status
- AUTONOMOUS_SESSION_PROTOCOL.md: ✅ Created
- RIGOR_PROTOCOL.md: ✅ Created
- processing-tracker.json: ✅ Created (tracking 62 PDFs)
- Session infrastructure: ✅ Working
- Extraction pipeline: ${errors.length > 0 ? '⏸️  Awaiting configuration' : '✅ Ready'}
`;

  fs.writeFileSync(
    path.join(SESSION_DIR, 'learnings.md'),
    learnings
  );

  console.log('[LEARNINGS] Session learnings documented');
}

/**
 * Main execution
 */
async function main() {
  try {
    printBanner('AUTONOMOUS PDF EXTRACTION SYSTEM', 'START');

    // Step 1: Load tracker
    console.log('[STEP 1] Loading processing tracker...');
    const tracker = loadTracker();
    console.log(`[INFO] Found ${tracker.summary.total} PDFs (${tracker.summary.pending} pending, ${tracker.summary.completed} completed)\n`);

    // Step 2: Select next PDF
    console.log('[STEP 2] Selecting next unprocessed PDF...');
    const pdf = selectNextPDF(tracker);

    if (!pdf) {
      console.log('[COMPLETE] All PDFs have been processed!');
      printBanner('NO PENDING PDFS', 'SUCCESS');
      return;
    }

    console.log(`[SELECTED] PDF: ${pdf.pdfId}`);
    console.log(`[PATH] ${pdf.pdfPath}\n`);

    // Step 3: Initialize session
    console.log('[STEP 3] Initializing session...');
    initializeSession(pdf);

    // Step 4: Lock PDF
    console.log('[STEP 4] Acquiring PDF lock...');
    lockPDF(tracker, pdf);
    console.log();

    // Step 5: Check prerequisites
    console.log('[STEP 5] Checking prerequisites...');
    const prereqs = checkPrerequisites();

    if (!prereqs.valid) {
      console.error('\n[ERROR] Prerequisites not met:\n');
      prereqs.errors.forEach(error => console.error(`  ❌ ${error}`));
      console.log('\n[INFO] See .env.example for required configuration');
      console.log('[INFO] Run: npm install\n');

      // Document learnings
      documentLearnings(pdf, null, prereqs.errors);

      // Unlock PDF
      unlockPDF(tracker, pdf, 'failed');

      printBanner('SESSION BLOCKED - CONFIGURATION REQUIRED', 'ERROR');
      console.log('Session ID:', SESSION_ID);
      console.log('Learnings:', path.join(SESSION_DIR, 'learnings.md'));
      console.log('\nNext steps:');
      console.log('1. Configure .env with API keys');
      console.log('2. Run: npm install');
      console.log('3. Run: npx tsx scripts/autonomous-extract-next.ts\n');

      process.exit(1);
    }

    console.log('[PREREQS] ✅ All prerequisites met\n');

    // Step 6: Run extraction
    console.log('[STEP 6] Executing extraction pipeline...');
    const result = await runExtraction(pdf);

    // Step 7: Validate
    console.log('[STEP 7] Validating results...');
    // Validation logic here

    // Step 8: Document learnings
    console.log('[STEP 8] Documenting learnings...');
    documentLearnings(pdf, result, []);

    // Step 9: Unlock PDF
    console.log('[STEP 9] Unlocking PDF...');
    unlockPDF(tracker, pdf, 'completed', result.summary);

    // Step 10: Commit and push
    console.log('[STEP 10] Committing to git...');
    // Git commit logic here

    printBanner('SESSION COMPLETED SUCCESSFULLY', 'SUCCESS');
    console.log(`Session ID: ${SESSION_ID}`);
    console.log(`PDF Processed: ${pdf.pdfId}`);
    console.log(`Results: results/${pdf.pdfId}/ground_truth.json`);
    console.log();

  } catch (error: any) {
    console.error('\n[FATAL ERROR]', error.message);
    printBanner('SESSION FAILED', 'ERROR');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };
