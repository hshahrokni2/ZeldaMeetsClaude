/**
 * Autonomous PDF Processor
 *
 * Implements the AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md
 * Fully autonomous operation with error handling, learning, and git integration.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface ProcessingState {
  version: string;
  created: string;
  lastUpdated: string;
  totalProcessed: number;
  totalFailed: number;
  totalSkipped: number;
  pdfs: Record<string, PDFStatus>;
  locks: Record<string, Lock>;
  metaAnalyses: string[];
}

interface PDFStatus {
  status: 'pending' | 'locked' | 'completed' | 'failed' | 'skipped';
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  agentsCompleted?: number;
  agentsFailed?: number;
  totalCost?: number;
  totalTokens?: number;
  qualityScore?: number;
  resultPath?: string;
  learningPath?: string;
  failureReason?: string;
  retryCount?: number;
}

interface Lock {
  sessionId: string;
  lockedAt: string;
  expiresAt: string;
}

interface SessionConfig {
  sessionId: string;
  groundTruth: boolean;
  maxCostPerPDF: number;
  qualityThreshold: number;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STATE_FILE = path.join(process.cwd(), 'processing_state.json');

function loadState(): ProcessingState {
  if (!fs.existsSync(STATE_FILE)) {
    const initialState: ProcessingState = {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalProcessed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      pdfs: {},
      locks: {},
      metaAnalyses: [],
    };
    saveState(initialState);
    return initialState;
  }

  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state: ProcessingState): void {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function acquireLock(state: ProcessingState, pdfPath: string, sessionId: string): boolean {
  const pdfName = path.basename(pdfPath);

  // Check for existing lock
  const existingLock = state.locks[pdfName];
  if (existingLock) {
    // Check if lock is expired (60 minutes)
    const expiresAt = new Date(existingLock.expiresAt);
    if (expiresAt > new Date()) {
      console.log(`[Lock] PDF ${pdfName} is locked by session ${existingLock.sessionId}`);
      return false;
    }
    console.log(`[Lock] Stale lock detected for ${pdfName}, acquiring...`);
  }

  // Acquire lock
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes

  state.locks[pdfName] = {
    sessionId,
    lockedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveState(state);
  console.log(`[Lock] ✅ Acquired lock for ${pdfName}`);
  return true;
}

function releaseLock(state: ProcessingState, pdfPath: string): void {
  const pdfName = path.basename(pdfPath);
  delete state.locks[pdfName];
  saveState(state);
  console.log(`[Lock] Released lock for ${pdfName}`);
}

// ============================================================================
// PDF SELECTION
// ============================================================================

function getAllPDFs(): string[] {
  const pdfs: string[] = [];

  // Priority 1: Test set (root pdfs/)
  const testDir = path.join(process.cwd(), 'pdfs');
  const testFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(testDir, f));
  pdfs.push(...testFiles);

  // Priority 2: Hjorthagen
  const hjorthagenDir = path.join(testDir, 'hjorthagen');
  if (fs.existsSync(hjorthagenDir)) {
    const hjorthagenFiles = fs.readdirSync(hjorthagenDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => path.join(hjorthagenDir, f));
    pdfs.push(...hjorthagenFiles);
  }

  // Priority 3: SRS
  const srsDir = path.join(testDir, 'srs');
  if (fs.existsSync(srsDir)) {
    const srsFiles = fs.readdirSync(srsDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => path.join(srsDir, f));
    pdfs.push(...srsFiles);
  }

  return pdfs;
}

function selectNextPDF(state: ProcessingState): string | null {
  const allPDFs = getAllPDFs();

  for (const pdfPath of allPDFs) {
    const pdfName = path.basename(pdfPath);
    const status = state.pdfs[pdfName];

    // Skip if already completed or in progress
    if (status?.status === 'completed') continue;
    if (status?.status === 'locked') continue;
    if (status?.status === 'skipped') continue;

    // Skip if failed too many times (max 2 retries)
    if (status?.status === 'failed' && (status.retryCount || 0) >= 2) {
      console.log(`[Selection] Skipping ${pdfName} (failed ${status.retryCount} times)`);
      continue;
    }

    return pdfPath;
  }

  return null;
}

// ============================================================================
// EXTRACTION EXECUTION (STUB - requires lib/ implementation)
// ============================================================================

async function extractPDF(
  pdfPath: string,
  sessionId: string,
  groundTruth: boolean
): Promise<{
  success: boolean;
  agentsCompleted: number;
  agentsFailed: number;
  totalCost: number;
  totalTokens: number;
  qualityScore: number;
  resultPath: string;
  error?: string;
}> {
  console.log(`[Extraction] Starting extraction for ${path.basename(pdfPath)}...`);
  console.log(`[Extraction] Mode: ${groundTruth ? 'GROUND TRUTH (3 models)' : 'FAST (2 models)'}`);

  // TODO: Implement actual extraction using lib/extraction-workflow.ts
  // For now, return a stub that simulates the extraction

  console.log('[Extraction] ❌ Extraction pipeline not yet implemented');
  console.log('[Extraction] Required: lib/extraction-workflow.ts implementation');
  console.log('[Extraction] Required: API keys in .env file');

  return {
    success: false,
    agentsCompleted: 0,
    agentsFailed: 19,
    totalCost: 0,
    totalTokens: 0,
    qualityScore: 0,
    resultPath: '',
    error: 'Extraction pipeline not implemented - requires API keys and lib/ setup',
  };
}

// ============================================================================
// LEARNING DOCUMENTATION
// ============================================================================

function generateLearningDoc(
  sessionId: string,
  pdfPath: string,
  result: {
    agentsCompleted: number;
    agentsFailed: number;
    totalCost: number;
    totalTokens: number;
    qualityScore: number;
  }
): string {
  const pdfName = path.basename(pdfPath);
  const pdfId = pdfName.replace('.pdf', '');

  const learningDir = path.join(process.cwd(), 'learning');
  if (!fs.existsSync(learningDir)) {
    fs.mkdirSync(learningDir, { recursive: true });
  }

  const filename = `session_${sessionId}_${pdfId}.md`;
  const filepath = path.join(learningDir, filename);

  const content = `# Learning Report: ${pdfName}

## Session: ${sessionId}
## PDF: ${pdfName}
## Date: ${new Date().toISOString().split('T')[0]}

### Extraction Summary
- Agents completed: ${result.agentsCompleted}/19
- Agents failed: ${result.agentsFailed}/19
- Quality score: ${result.qualityScore.toFixed(2)}
- Total cost: $${result.totalCost.toFixed(2)}
- Total tokens: ${result.totalTokens.toLocaleString()}

### Key Findings
1. **Successful Patterns**
   - (To be filled by analyzing agent results)

2. **Challenges Encountered**
   - (To be documented from error logs)

3. **Insights**
   - (To be extracted from validation results)

### Recommendations
1. (Based on this extraction's performance)

---
*Generated automatically by autonomous processor*
`;

  fs.writeFileSync(filepath, content);
  console.log(`[Learning] ✅ Generated learning doc: ${filename}`);

  return filepath;
}

// ============================================================================
// META-ANALYSIS
// ============================================================================

function shouldRunMetaAnalysis(state: ProcessingState): boolean {
  const count = state.totalProcessed;
  return count > 0 && count % 10 === 0;
}

function generateMetaAnalysis(state: ProcessingState): string {
  const count = state.totalProcessed;
  const metaDir = path.join(process.cwd(), 'meta_analysis');
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }

  const filename = `meta_analysis_${count}pdfs_${new Date().toISOString().split('T')[0]}.md`;
  const filepath = path.join(metaDir, filename);

  // Calculate aggregate statistics
  const completedPDFs = Object.entries(state.pdfs)
    .filter(([_, status]) => status.status === 'completed')
    .map(([name, status]) => ({ name, ...status }));

  const avgCost = completedPDFs.reduce((sum, p) => sum + (p.totalCost || 0), 0) / completedPDFs.length;
  const avgQuality = completedPDFs.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / completedPDFs.length;
  const avgAgents = completedPDFs.reduce((sum, p) => sum + (p.agentsCompleted || 0), 0) / completedPDFs.length;

  const content = `# Meta-Analysis: First ${count} PDFs

## Date: ${new Date().toISOString().split('T')[0]}
## PDFs Analyzed: 1-${count}

### Aggregate Statistics
- Total completed: ${count}
- Total failed: ${state.totalFailed}
- Average cost: $${avgCost.toFixed(2)}/PDF
- Average quality: ${avgQuality.toFixed(2)}
- Average agents completed: ${avgAgents.toFixed(1)}/19

### Performance Metrics
- Total cost: $${completedPDFs.reduce((sum, p) => sum + (p.totalCost || 0), 0).toFixed(2)}
- Total tokens: ${completedPDFs.reduce((sum, p) => sum + (p.totalTokens || 0), 0).toLocaleString()}
- Success rate: ${((count / (count + state.totalFailed)) * 100).toFixed(1)}%

### Cross-PDF Patterns
1. **Document Structure**
   - (Analysis requires examining all ${count} PDFs)

2. **Agent Performance**
   - (Aggregate agent statistics across all PDFs)

3. **Cost Trends**
   - (Cost optimization opportunities)

### Recommendations
1. (Strategic recommendations for next batch)

### Next ${count} PDFs Strategy
- (Focus areas based on current analysis)

---
*Generated automatically at ${count} PDFs threshold*
`;

  fs.writeFileSync(filepath, content);
  state.metaAnalyses.push(filepath);
  saveState(state);

  console.log(`[Meta-Analysis] ✅ Generated meta-analysis: ${filename}`);
  return filepath;
}

// ============================================================================
// GIT INTEGRATION
// ============================================================================

async function commitResults(
  pdfPath: string,
  sessionId: string,
  result: {
    agentsCompleted: number;
    qualityScore: number;
    totalCost: number;
    resultPath: string;
    learningPath: string;
  }
): Promise<void> {
  const pdfName = path.basename(pdfPath);
  const { execSync } = await import('child_process');

  try {
    // Add files
    execSync(`git add processing_state.json`, { cwd: process.cwd() });
    if (result.resultPath && fs.existsSync(result.resultPath)) {
      execSync(`git add "${result.resultPath}"`, { cwd: process.cwd() });
    }
    if (result.learningPath && fs.existsSync(result.learningPath)) {
      execSync(`git add "${result.learningPath}"`, { cwd: process.cwd() });
    }

    // Commit
    const message = `feat(extraction): Complete PDF - ${pdfName}

Session: ${sessionId}
Agents: ${result.agentsCompleted}/19
Quality: ${result.qualityScore.toFixed(2)}
Cost: $${result.totalCost.toFixed(2)}

- Result: ${result.resultPath || 'N/A'}
- Learning: ${result.learningPath}
`;

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: process.cwd() });
    console.log(`[Git] ✅ Committed results for ${pdfName}`);

  } catch (error: any) {
    console.error(`[Git] ⚠️  Commit failed:`, error.message);
    // Don't throw - continue processing
  }
}

async function commitMetaAnalysis(metaAnalysisPath: string, count: number): Promise<void> {
  const { execSync } = await import('child_process');

  try {
    execSync(`git add "${metaAnalysisPath}"`, { cwd: process.cwd() });
    execSync(`git add processing_state.json`, { cwd: process.cwd() });

    const message = `docs(meta-analysis): ${count} PDFs completed

Generated meta-analysis: ${path.basename(metaAnalysisPath)}
`;

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: process.cwd() });
    console.log(`[Git] ✅ Committed meta-analysis`);

  } catch (error: any) {
    console.error(`[Git] ⚠️  Meta-analysis commit failed:`, error.message);
  }
}

// ============================================================================
// MAIN AUTONOMOUS LOOP
// ============================================================================

async function processNextPDF(config: SessionConfig): Promise<boolean> {
  const state = loadState();

  // Select next PDF
  const pdfPath = selectNextPDF(state);
  if (!pdfPath) {
    console.log('[Processor] ✅ No more PDFs to process!');
    return false;
  }

  const pdfName = path.basename(pdfPath);
  console.log(`\n[Processor] 📄 Selected: ${pdfName}`);

  // Acquire lock
  if (!acquireLock(state, pdfPath, config.sessionId)) {
    console.log(`[Processor] ⚠️  Could not acquire lock for ${pdfName}, skipping`);
    return true; // Continue to next PDF
  }

  // Update state to 'locked'
  state.pdfs[pdfName] = {
    status: 'locked',
    sessionId: config.sessionId,
    startTime: new Date().toISOString(),
  };
  saveState(state);

  try {
    // Execute extraction
    const result = await extractPDF(pdfPath, config.sessionId, config.groundTruth);

    if (result.success && result.qualityScore >= config.qualityThreshold) {
      // Success
      state.pdfs[pdfName] = {
        status: 'completed',
        sessionId: config.sessionId,
        startTime: state.pdfs[pdfName].startTime,
        endTime: new Date().toISOString(),
        agentsCompleted: result.agentsCompleted,
        agentsFailed: result.agentsFailed,
        totalCost: result.totalCost,
        totalTokens: result.totalTokens,
        qualityScore: result.qualityScore,
        resultPath: result.resultPath,
      };
      state.totalProcessed++;

      // Generate learning doc
      const learningPath = generateLearningDoc(config.sessionId, pdfPath, result);
      state.pdfs[pdfName].learningPath = learningPath;

      saveState(state);
      releaseLock(state, pdfPath);

      // Commit to git
      await commitResults(pdfPath, config.sessionId, { ...result, learningPath });

      console.log(`[Processor] ✅ Successfully processed ${pdfName}`);

      // Check for meta-analysis threshold
      if (shouldRunMetaAnalysis(state)) {
        console.log(`\n[Processor] 🎯 Meta-analysis threshold reached (${state.totalProcessed} PDFs)`);
        const metaPath = generateMetaAnalysis(state);
        await commitMetaAnalysis(metaPath, state.totalProcessed);
      }

    } else {
      // Failure
      const retryCount = (state.pdfs[pdfName]?.retryCount || 0) + 1;
      state.pdfs[pdfName] = {
        status: 'failed',
        sessionId: config.sessionId,
        startTime: state.pdfs[pdfName].startTime,
        endTime: new Date().toISOString(),
        agentsCompleted: result.agentsCompleted,
        agentsFailed: result.agentsFailed,
        totalCost: result.totalCost,
        totalTokens: result.totalTokens,
        qualityScore: result.qualityScore,
        failureReason: result.error || 'Low quality or insufficient agents',
        retryCount,
      };
      state.totalFailed++;

      saveState(state);
      releaseLock(state, pdfPath);

      console.log(`[Processor] ❌ Failed to process ${pdfName} (attempt ${retryCount}/2)`);
    }

  } catch (error: any) {
    // Exception during processing
    console.error(`[Processor] 💥 Error processing ${pdfName}:`, error.message);

    const retryCount = (state.pdfs[pdfName]?.retryCount || 0) + 1;
    state.pdfs[pdfName] = {
      status: 'failed',
      sessionId: config.sessionId,
      startTime: state.pdfs[pdfName].startTime,
      endTime: new Date().toISOString(),
      failureReason: error.message,
      retryCount,
    };
    state.totalFailed++;

    saveState(state);
    releaseLock(state, pdfPath);
  }

  return true; // Continue processing
}

async function runAutonomousSession(config: SessionConfig): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     AUTONOMOUS PDF PROCESSING SESSION - PURE CLAUDE MODE      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\nSession ID: ${config.sessionId}`);
  console.log(`Mode: ${config.groundTruth ? 'GROUND TRUTH (3 models)' : 'FAST (2 models)'}`);
  console.log(`Quality Threshold: ${config.qualityThreshold}`);
  console.log(`Max Cost/PDF: $${config.maxCostPerPDF}`);
  console.log('\nProtocols:');
  console.log('  - AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md');
  console.log('  - RIGOR_PROTOCOL.md');
  console.log('\n' + '─'.repeat(66) + '\n');

  const state = loadState();
  console.log(`[State] Loaded processing state`);
  console.log(`  - Total processed: ${state.totalProcessed}`);
  console.log(`  - Total failed: ${state.totalFailed}`);
  console.log(`  - Total PDFs: ${getAllPDFs().length}`);
  console.log(`  - Remaining: ${getAllPDFs().length - state.totalProcessed - state.totalFailed}\n`);

  // Process PDFs one by one
  let continueProcessing = true;
  let count = 0;

  while (continueProcessing && count < 100) { // Safety limit
    continueProcessing = await processNextPDF(config);
    count++;

    // Brief pause between PDFs
    if (continueProcessing) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '─'.repeat(66));
  console.log('[Processor] 🎉 Autonomous session completed!');
  console.log(`[Processor] Processed: ${state.totalProcessed} PDFs`);
  console.log(`[Processor] Failed: ${state.totalFailed} PDFs`);
  console.log('─'.repeat(66) + '\n');
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  const config: SessionConfig = {
    sessionId: args.find(a => a.startsWith('--session='))?.split('=')[1]
      || `session_${new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_')}`,
    groundTruth: args.includes('--ground-truth'),
    maxCostPerPDF: parseFloat(args.find(a => a.startsWith('--max-cost='))?.split('=')[1] || '2.0'),
    qualityThreshold: parseFloat(args.find(a => a.startsWith('--quality='))?.split('=')[1] || '0.75'),
  };

  if (args.includes('--help')) {
    console.log(`
Autonomous PDF Processor - Pure Claude Mode

Usage:
  npx tsx scripts/autonomous-processor.ts [options]

Options:
  --session=ID          Custom session ID (default: auto-generated)
  --ground-truth        Enable 3-model consensus (default: 2-model)
  --max-cost=N          Max cost per PDF in dollars (default: 2.0)
  --quality=N           Min quality score to accept (default: 0.75)
  --help                Show this help

Examples:
  npx tsx scripts/autonomous-processor.ts
  npx tsx scripts/autonomous-processor.ts --ground-truth
  npx tsx scripts/autonomous-processor.ts --quality=0.85
`);
    return;
  }

  await runAutonomousSession(config);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runAutonomousSession, processNextPDF, selectNextPDF, loadState, saveState };
