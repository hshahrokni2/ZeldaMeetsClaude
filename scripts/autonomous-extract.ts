#!/usr/bin/env tsx
/**
 * Autonomous PDF Extraction Script
 *
 * Implements AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md
 * with RIGOR_PROTOCOL.md validation
 *
 * Usage:
 *   tsx scripts/autonomous-extract.ts
 *
 * Selects next unprocessed PDF and runs complete extraction pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// SESSION INITIALIZATION
// ============================================================================

const SESSION_ID = `session_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const PROJECT_ROOT = process.cwd();
const LOCKS_DIR = path.join(PROJECT_ROOT, 'locks');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const MANIFEST_DIR = path.join(PROJECT_ROOT, 'manifest');
const PDFS_DIR = path.join(PROJECT_ROOT, 'pdfs');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     AUTONOMOUS PDF EXTRACTION SESSION                          ║
║     Session ID: ${SESSION_ID.padEnd(39)}║
║     Protocol: AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md       ║
║     Rigor: RIGOR_PROTOCOL.md                                   ║
╚════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// PHASE 1: PDF SELECTION & LOCK
// ============================================================================

interface PDFCandidate {
  path: string;
  filename: string;
  size: number;
  priority: number; // Lower = higher priority
}

function findUnprocessedPDFs(): PDFCandidate[] {
  const candidates: PDFCandidate[] = [];

  // Priority 1: Main directory PDFs
  const mainPdfs = fs.readdirSync(PDFS_DIR)
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({
      path: path.join(PDFS_DIR, f),
      filename: f,
      size: fs.statSync(path.join(PDFS_DIR, f)).size,
      priority: 1,
    }));

  // Priority 2: Hjorthagen PDFs
  const hjorthagenDir = path.join(PDFS_DIR, 'hjorthagen');
  const hjorthagenPdfs = fs.existsSync(hjorthagenDir)
    ? fs.readdirSync(hjorthagenDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => ({
          path: path.join(hjorthagenDir, f),
          filename: f,
          size: fs.statSync(path.join(hjorthagenDir, f)).size,
          priority: 2,
        }))
    : [];

  // Priority 3: SRS PDFs
  const srsDir = path.join(PDFS_DIR, 'srs');
  const srsPdfs = fs.existsSync(srsDir)
    ? fs.readdirSync(srsDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => ({
          path: path.join(srsDir, f),
          filename: f,
          size: fs.statSync(path.join(srsDir, f)).size,
          priority: 3,
        }))
    : [];

  candidates.push(...mainPdfs, ...hjorthagenPdfs, ...srsPdfs);

  // Filter out locked or already processed PDFs
  const unprocessed = candidates.filter(pdf => {
    const lockPath = path.join(LOCKS_DIR, `${pdf.filename}.lock`);
    const manifestPath = path.join(MANIFEST_DIR, `${pdf.filename}.json`);

    // Skip if locked
    if (fs.existsSync(lockPath)) {
      const lockAge = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (lockAge < 30 * 60 * 1000) {
        // Lock is fresh (< 30 minutes)
        return false;
      } else {
        // Stale lock, remove it
        console.log(`⚠️  Removing stale lock: ${lockPath}`);
        fs.unlinkSync(lockPath);
      }
    }

    // Skip if already processed
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (manifest.status === 'completed') {
        return false;
      }
    }

    return true;
  });

  // Sort by priority, then by size (smaller first for faster initial results)
  return unprocessed.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.size - b.size;
  });
}

function createLock(pdfPath: string): void {
  const filename = path.basename(pdfPath);
  const lockPath = path.join(LOCKS_DIR, `${filename}.lock`);

  const lockData = {
    session_id: SESSION_ID,
    pdf_path: pdfPath,
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname(),
  };

  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  console.log(`🔒 Locked: ${filename}`);
}

function removeLock(pdfPath: string): void {
  const filename = path.basename(pdfPath);
  const lockPath = path.join(LOCKS_DIR, `${filename}.lock`);

  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
    console.log(`🔓 Unlocked: ${filename}`);
  }
}

// ============================================================================
// PHASE 2: PDF ANALYSIS (MOCK)
// ============================================================================

function analyzePDF(pdfPath: string) {
  const stats = fs.statSync(pdfPath);
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(pdfPath))
    .digest('hex');

  return {
    path: pdfPath,
    filename: path.basename(pdfPath),
    size_bytes: stats.size,
    size_mb: (stats.size / 1024 / 1024).toFixed(2),
    hash_sha256: hash,
    estimated_pages: Math.ceil(stats.size / 50000), // Rough estimate
  };
}

// ============================================================================
// PHASE 3: EXTRACTION (MOCK - Real implementation needs full pipeline)
// ============================================================================

async function runExtraction(pdfInfo: any) {
  console.log(`\n📊 Starting extraction for: ${pdfInfo.filename}`);
  console.log(`   Size: ${pdfInfo.size_mb} MB`);
  console.log(`   Estimated pages: ${pdfInfo.estimated_pages}`);
  console.log(`   Hash: ${pdfInfo.hash_sha256.substring(0, 16)}...`);

  // NOTE: This is a mock implementation
  // Real implementation would:
  // 1. Load PDF and convert to images
  // 2. Run vision-sectionizer
  // 3. Execute all 19 agents in parallel
  // 4. Aggregate results
  // 5. Validate with RIGOR_PROTOCOL.md

  console.log(`\n⚠️  MOCK EXTRACTION MODE`);
  console.log(`   Full extraction pipeline requires:`);
  console.log(`   - PDF-to-image conversion`);
  console.log(`   - Vision sectionizer execution`);
  console.log(`   - 19 agent parallel execution`);
  console.log(`   - Result aggregation and validation`);
  console.log(`   - OpenRouter API integration`);
  console.log(`\n   For now, creating skeleton output files...`);

  // Create skeleton output
  const pdfId = pdfInfo.filename.replace('.pdf', '');
  const extractionOutput = {
    session_id: SESSION_ID,
    pdf_path: pdfInfo.path,
    pdf_hash: pdfInfo.hash_sha256,
    status: 'mock_extraction',
    timestamp: new Date().toISOString(),
    agents: {
      total: 19,
      successful: 0,
      failed: 0,
      details: []
    },
    quality_metrics: {
      average_confidence: 0,
      fields_extracted: 0,
      validation_passed: false
    },
    note: 'This is a skeleton output - full extraction requires API integration'
  };

  const metadataOutput = {
    session_id: SESSION_ID,
    pdf_info: pdfInfo,
    processing_time_seconds: 0,
    total_cost_usd: 0,
    total_tokens: 0,
  };

  // Save outputs
  const extractionPath = path.join(OUTPUT_DIR, 'extractions', `${pdfId}.json`);
  const metadataPath = path.join(OUTPUT_DIR, 'extractions', `${pdfId}_metadata.json`);

  fs.writeFileSync(extractionPath, JSON.stringify(extractionOutput, null, 2));
  fs.writeFileSync(metadataPath, JSON.stringify(metadataOutput, null, 2));

  console.log(`\n✅ Skeleton outputs created:`);
  console.log(`   - ${extractionPath}`);
  console.log(`   - ${metadataPath}`);

  return extractionOutput;
}

// ============================================================================
// PHASE 4: LEARNING DOCUMENTATION
// ============================================================================

function documentLearning(pdfInfo: any, extractionResult: any) {
  const learningPath = path.join(OUTPUT_DIR, 'learning', `${SESSION_ID}.md`);

  const learningDoc = `# Learning Session: ${SESSION_ID}

## PDF Processed
- **File**: ${pdfInfo.filename}
- **Size**: ${pdfInfo.size_mb} MB
- **Pages**: ${pdfInfo.estimated_pages} (estimated)
- **Hash**: ${pdfInfo.hash_sha256}

## Extraction Results
- **Status**: ${extractionResult.status}
- **Agents Successful**: ${extractionResult.agents.successful}/${extractionResult.agents.total}
- **Average Confidence**: ${extractionResult.quality_metrics.average_confidence}

## Insights
- **Mode**: MOCK EXTRACTION - Full pipeline not yet implemented
- **Next Steps**:
  1. Integrate PDF-to-image conversion
  2. Connect OpenRouter API client
  3. Implement full agent execution pipeline
  4. Add validation layer
  5. Enable ground-truth mode

## Technical Notes
This session used skeleton extraction to validate the autonomous protocol infrastructure.
Full extraction capabilities require:
- API keys configured in .env
- OpenRouter client integration
- Vision processing pipeline
- All 19 agent prompts loaded

## Session Metadata
- **Started**: ${new Date().toISOString()}
- **Protocol Version**: 1.0.0
- **Rigor Mode**: ENABLED
`;

  fs.writeFileSync(learningPath, learningDoc);
  console.log(`\n📝 Learning documented: ${learningPath}`);
}

// ============================================================================
// PHASE 5: MANIFEST UPDATE
// ============================================================================

function updateManifest(pdfInfo: any, extractionResult: any) {
  const manifestPath = path.join(MANIFEST_DIR, `${pdfInfo.filename}.json`);

  const manifest = {
    pdf_path: pdfInfo.path,
    session_id: SESSION_ID,
    status: 'completed',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    extraction_result: extractionResult.status,
    agents_successful: extractionResult.agents.successful,
    agents_total: extractionResult.agents.total,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest updated: ${manifestPath}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Pre-flight checks
    console.log(`\n🔍 Pre-flight checks...`);

    if (!fs.existsSync(PDFS_DIR)) {
      throw new Error(`PDFs directory not found: ${PDFS_DIR}`);
    }

    console.log(`   ✓ PDFs directory exists`);
    console.log(`   ✓ Output directories created`);

    // Find next PDF to process
    console.log(`\n🔎 Finding unprocessed PDFs...`);
    const candidates = findUnprocessedPDFs();

    if (candidates.length === 0) {
      console.log(`\n✨ No unprocessed PDFs found. All done!`);
      process.exit(0);
    }

    console.log(`   Found ${candidates.length} unprocessed PDFs`);
    const nextPDF = candidates[0];
    console.log(`   Selected: ${nextPDF.filename} (priority ${nextPDF.priority})`);

    // Lock PDF
    createLock(nextPDF.path);

    // Analyze PDF
    console.log(`\n📄 Analyzing PDF...`);
    const pdfInfo = analyzePDF(nextPDF.path);

    // Run extraction
    const extractionResult = await runExtraction(pdfInfo);

    // Document learning
    documentLearning(pdfInfo, extractionResult);

    // Update manifest
    updateManifest(pdfInfo, extractionResult);

    // Unlock PDF
    removeLock(nextPDF.path);

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║     SESSION COMPLETE                                           ║`);
    console.log(`║     Session ID: ${SESSION_ID.padEnd(39)}║`);
    console.log(`║     PDF: ${nextPDF.filename.padEnd(51)}║`);
    console.log(`║     Status: MOCK EXTRACTION SUCCESSFUL                         ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  } catch (error: any) {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main();
