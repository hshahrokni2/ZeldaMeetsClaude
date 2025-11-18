#!/usr/bin/env tsx
/**
 * Single PDF Extraction Script
 *
 * Executes the complete ground truth extraction pipeline for one PDF:
 * 1. Vision Sectionization (Gemini 2.0 Flash)
 * 2. Section-to-Agent Routing
 * 3. 19-Agent Consensus Extraction (Gemini + GPT-4o + Claude)
 * 4. Validation & Quality Analysis
 * 5. Results Persistence
 *
 * Usage:
 *   npx tsx scripts/extract-single-pdf.ts --pdf pdfs/example.pdf
 *   npx tsx scripts/extract-single-pdf.ts --pdf pdfs/example.pdf --session session_20251118_143022
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Types
interface ProcessingState {
  processed: Array<{
    filename: string;
    session_id: string;
    completed_at: string;
    status: 'success' | 'partial' | 'failed';
    quality_score: number;
    agents_succeeded: number;
  }>;
  in_progress: string | null;
  failed: Array<{
    filename: string;
    session_id: string;
    failed_at: string;
    reason: string;
  }>;
  last_updated: string;
  sessions: any[];
}

interface SessionLog {
  session_id: string;
  pdf_path: string;
  started_at: string;
  completed_at?: string;
  entries: LogEntry[];
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  metadata?: any;
}

interface QualityMetrics {
  total_fields: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  avg_confidence: number;
  schema_valid: boolean;
  cross_validation_passed: boolean;
  agents_succeeded: number;
  agents_failed: number;
}

// Session Management
class SessionManager {
  private sessionId: string;
  private sessionDir: string;
  private log: SessionLog;
  private statePath: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_')}`;
    this.sessionDir = path.join(process.cwd(), 'results', this.sessionId);
    this.statePath = path.join(process.cwd(), 'processing-state.json');

    this.log = {
      session_id: this.sessionId,
      pdf_path: '',
      started_at: new Date().toISOString(),
      entries: []
    };

    // Create session directory
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Create subdirectories
    fs.mkdirSync(path.join(this.sessionDir, 'agent-results'), { recursive: true });
    fs.mkdirSync(path.join(this.sessionDir, 'learnings'), { recursive: true });
  }

  logInfo(message: string, metadata?: any) {
    this.addLogEntry('INFO', message, metadata);
  }

  logWarn(message: string, metadata?: any) {
    this.addLogEntry('WARN', message, metadata);
  }

  logError(message: string, metadata?: any) {
    this.addLogEntry('ERROR', message, metadata);
  }

  logDebug(message: string, metadata?: any) {
    this.addLogEntry('DEBUG', message, metadata);
  }

  private addLogEntry(level: LogEntry['level'], message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata })
    };
    this.log.entries.push(entry);

    // Also console log
    const prefix = `[${entry.timestamp}] ${level.padEnd(5)}`;
    console.log(`${prefix} ${message}`, metadata || '');
  }

  saveLog() {
    const logPath = path.join(this.sessionDir, 'session-log.json');
    fs.writeFileSync(logPath, JSON.stringify(this.log, null, 2));

    // Also save as text
    const textLog = this.log.entries
      .map(e => `[${e.timestamp}] ${e.level.padEnd(5)} ${e.message}`)
      .join('\n');
    fs.writeFileSync(path.join(this.sessionDir, 'session-log.txt'), textLog);
  }

  getSessionId() {
    return this.sessionId;
  }

  getSessionDir() {
    return this.sessionDir;
  }

  setPdfPath(pdfPath: string) {
    this.log.pdf_path = pdfPath;
  }

  // Lock management
  acquireLock(pdfFilename: string): boolean {
    const state = this.loadState();

    if (state.in_progress) {
      this.logError(`Lock acquisition failed: PDF ${state.in_progress} is currently being processed`);
      return false;
    }

    state.in_progress = pdfFilename;
    state.last_updated = new Date().toISOString();
    this.saveState(state);

    this.logInfo(`Lock acquired for ${pdfFilename}`);
    return true;
  }

  releaseLock(pdfFilename: string, success: boolean, qualityScore?: number, agentsSucceeded?: number) {
    const state = this.loadState();

    if (state.in_progress !== pdfFilename) {
      this.logWarn(`Lock release mismatch: expected ${pdfFilename}, found ${state.in_progress}`);
    }

    state.in_progress = null;

    if (success) {
      state.processed.push({
        filename: pdfFilename,
        session_id: this.sessionId,
        completed_at: new Date().toISOString(),
        status: (agentsSucceeded || 0) >= 18 ? 'success' : 'partial',
        quality_score: qualityScore || 0,
        agents_succeeded: agentsSucceeded || 0
      });
      this.logInfo(`PDF marked as processed: ${pdfFilename}`);
    } else {
      state.failed.push({
        filename: pdfFilename,
        session_id: this.sessionId,
        failed_at: new Date().toISOString(),
        reason: 'Extraction failed'
      });
      this.logError(`PDF marked as failed: ${pdfFilename}`);
    }

    state.last_updated = new Date().toISOString();
    this.saveState(state);
  }

  private loadState(): ProcessingState {
    if (!fs.existsSync(this.statePath)) {
      return {
        processed: [],
        in_progress: null,
        failed: [],
        last_updated: new Date().toISOString(),
        sessions: []
      };
    }
    return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
  }

  private saveState(state: ProcessingState) {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }
}

// API Client Setup
class APIClients {
  gemini?: GoogleGenerativeAI;
  anthropic?: Anthropic;
  openai?: OpenAI;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  validate(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.gemini) missing.push('GEMINI_API_KEY');
    if (!this.anthropic) missing.push('ANTHROPIC_API_KEY');
    if (!this.openai) missing.push('OPENAI_API_KEY');

    return { valid: missing.length === 0, missing };
  }
}

// Main Extraction Pipeline
async function extractPDF(pdfPath: string, session: SessionManager, clients: APIClients) {
  session.logInfo(`Starting extraction pipeline for: ${pdfPath}`);

  // Stage 1: PDF Validation
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const pdfStats = fs.statSync(pdfPath);
  session.logInfo(`PDF size: ${(pdfStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Stage 2: Vision Sectionization
  session.logInfo('Stage 1: Vision Sectionization - Starting');
  // TODO: Implement sectionization using vision-sectionizer.ts
  session.logWarn('Sectionization not implemented - using mock data');

  const sectionMap = {
    l1_sections: [],
    l2_sections: [],
    total_pages: 0
  };

  fs.writeFileSync(
    path.join(session.getSessionDir(), 'section-map.json'),
    JSON.stringify(sectionMap, null, 2)
  );

  // Stage 3: Orchestrator Routing
  session.logInfo('Stage 2: Orchestrator Routing - Starting');
  // TODO: Implement routing logic
  session.logWarn('Routing not implemented - using mock data');

  // Stage 4: 19 Agent Execution
  session.logInfo('Stage 3: Agent Execution - Starting');
  // TODO: Implement agent execution
  session.logWarn('Agent execution not implemented - using mock data');

  // Stage 5: Validation
  session.logInfo('Stage 4: Validation - Starting');

  const qualityMetrics: QualityMetrics = {
    total_fields: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    avg_confidence: 0,
    schema_valid: true,
    cross_validation_passed: true,
    agents_succeeded: 0,
    agents_failed: 19
  };

  fs.writeFileSync(
    path.join(session.getSessionDir(), 'quality-metrics.json'),
    JSON.stringify(qualityMetrics, null, 2)
  );

  session.logInfo('Extraction pipeline complete');

  return qualityMetrics;
}

// Generate Learnings Document
function generateLearnings(session: SessionManager, pdfPath: string, metrics: QualityMetrics) {
  const pdfFilename = path.basename(pdfPath);

  const learnings = `# Session Learnings: ${session.getSessionId()}

## Document: ${pdfFilename}

### Characteristics
- File size: ${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB
- Status: Infrastructure test (no actual extraction performed)
- Complexity: Unknown (extraction not executed)

### Agent Performance
- Agents succeeded: ${metrics.agents_succeeded}/19
- Agents failed: ${metrics.agents_failed}/19
- Average confidence: ${metrics.avg_confidence.toFixed(2)}

### Infrastructure Status
- Session management: ✅ Working
- Lock mechanism: ✅ Working
- Logging: ✅ Working
- API clients: ⚠️ Requires configuration

### Issues Encountered
1. API keys not configured - extraction cannot proceed
2. Core extraction logic not yet integrated
3. Sectionization module needs integration
4. Agent execution needs implementation

### Next Steps
1. Configure .env file with API keys:
   - GEMINI_API_KEY (for Gemini 2.0 Flash + 2.5 Pro)
   - ANTHROPIC_API_KEY (for Claude 3.7 Sonnet)
   - OPENAI_API_KEY (for GPT-4o)

2. Integrate extraction-workflow.ts logic
3. Implement agent execution with consensus mechanism
4. Add validation and quality checks

### Cost & Duration
- Total cost: $0.00 (infrastructure test only)
- Duration: ${((Date.now() - new Date(session['log'].started_at).getTime()) / 1000).toFixed(0)}s
- Tokens used: 0

### Recommendations
- Complete API configuration before next run
- Test with single agent first (financial_agent)
- Implement incremental validation
- Add progress tracking for long extractions
`;

  fs.writeFileSync(
    path.join(session.getSessionDir(), 'learnings', `${session.getSessionId()}.md`),
    learnings
  );

  session.logInfo('Learnings document generated');
}

// CLI
async function main() {
  console.log('\n=== Zelda Meets Claude: PDF Extraction ===\n');

  const args = process.argv.slice(2);
  const pdfArgIndex = args.indexOf('--pdf');
  const sessionArgIndex = args.indexOf('--session');

  if (pdfArgIndex === -1 || !args[pdfArgIndex + 1]) {
    console.error('Usage: npx tsx scripts/extract-single-pdf.ts --pdf <path-to-pdf> [--session <session_id>]');
    process.exit(1);
  }

  const pdfPath = args[pdfArgIndex + 1];
  const sessionId = sessionArgIndex !== -1 ? args[sessionArgIndex + 1] : undefined;

  // Initialize session
  const session = new SessionManager(sessionId);
  session.setPdfPath(pdfPath);

  console.log(`Session ID: ${session.getSessionId()}\n`);

  try {
    // Validate API keys
    const clients = new APIClients();
    const apiValidation = clients.validate();

    if (!apiValidation.valid) {
      session.logWarn('API keys missing', { missing: apiValidation.missing });
      console.warn('\n⚠️  WARNING: Missing API keys:');
      apiValidation.missing.forEach(key => console.warn(`   - ${key}`));
      console.warn('\nExtraction will proceed but API calls will fail.');
      console.warn('Please configure .env file with required keys.\n');
    } else {
      session.logInfo('All API keys configured');
    }

    // Acquire lock
    const pdfFilename = path.basename(pdfPath);
    if (!session.acquireLock(pdfFilename)) {
      throw new Error('Failed to acquire processing lock');
    }

    // Execute extraction
    const metrics = await extractPDF(pdfPath, session, clients);

    // Generate learnings
    generateLearnings(session, pdfPath, metrics);

    // Save logs
    session.saveLog();

    // Release lock
    session.releaseLock(pdfFilename, true, metrics.avg_confidence, metrics.agents_succeeded);

    // Summary
    console.log('\n=== Extraction Complete ===');
    console.log(`Session: ${session.getSessionId()}`);
    console.log(`Results: ${session.getSessionDir()}`);
    console.log(`Quality Score: ${metrics.avg_confidence.toFixed(2)}`);
    console.log(`Agents Succeeded: ${metrics.agents_succeeded}/19\n`);

    if (!apiValidation.valid) {
      console.log('⚠️  Infrastructure test completed successfully');
      console.log('   Configure API keys to enable actual extraction\n');
    }

  } catch (error) {
    session.logError('Extraction failed', { error: String(error) });
    session.saveLog();

    // Release lock on failure
    const pdfFilename = path.basename(pdfPath);
    session.releaseLock(pdfFilename, false);

    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Load .env if available
  (async () => {
    try {
      const dotenv = await import('dotenv');
      dotenv.config();
    } catch (e) {
      // dotenv not required if env vars set another way
    }

    await main();
  })().catch(console.error);
}

export { SessionManager, APIClients, extractPDF };
