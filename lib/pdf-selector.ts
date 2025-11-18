/**
 * PDF Selection and Locking System
 *
 * Manages PDF queue, locking, and tracking for autonomous processing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface ProcessedPDF {
  pdf_id: string;
  session_id: string;
  processed_at: string;
  status: 'completed' | 'partial' | 'failed';
  quality_score: number;
  agents_succeeded: number;
  total_cost: number;
  duration_seconds: number;
  pdf_path: string;
}

export interface ProcessingTracker {
  processed: ProcessedPDF[];
  statistics: {
    total_processed: number;
    total_cost: number;
    average_quality_score: number;
    average_duration_seconds: number;
  };
  last_updated: string;
}

export interface LockFile {
  session_id: string;
  locked_at: string;
  pdf_path: string;
}

export class PDFSelector {
  private trackerPath: string;
  private locksDir: string;
  private pdfsDir: string;

  constructor(
    trackerPath: string = './processed_pdfs.json',
    locksDir: string = './.locks',
    pdfsDir: string = './pdfs'
  ) {
    this.trackerPath = trackerPath;
    this.locksDir = locksDir;
    this.pdfsDir = pdfsDir;

    // Ensure directories exist
    if (!fs.existsSync(this.locksDir)) {
      fs.mkdirSync(this.locksDir, { recursive: true });
    }
  }

  /**
   * Get all PDF files recursively from pdfs directory
   */
  async getAllPDFs(): Promise<string[]> {
    const pattern = path.join(this.pdfsDir, '**/*.pdf');
    const pdfs = await glob(pattern);
    return pdfs.sort(); // Consistent ordering
  }

  /**
   * Read processing tracker
   */
  readTracker(): ProcessingTracker {
    if (!fs.existsSync(this.trackerPath)) {
      return {
        processed: [],
        statistics: {
          total_processed: 0,
          total_cost: 0,
          average_quality_score: 0,
          average_duration_seconds: 0,
        },
        last_updated: new Date().toISOString(),
      };
    }

    const data = fs.readFileSync(this.trackerPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Write processing tracker
   */
  writeTracker(tracker: ProcessingTracker): void {
    tracker.last_updated = new Date().toISOString();
    fs.writeFileSync(this.trackerPath, JSON.stringify(tracker, null, 2));
  }

  /**
   * Get PDF ID from file path
   */
  getPDFId(pdfPath: string): string {
    const basename = path.basename(pdfPath, '.pdf');
    return basename;
  }

  /**
   * Check if PDF is already processed
   */
  isProcessed(pdfPath: string): boolean {
    const tracker = this.readTracker();
    const pdfId = this.getPDFId(pdfPath);
    return tracker.processed.some(p => p.pdf_id === pdfId && p.status === 'completed');
  }

  /**
   * Check if PDF is currently locked
   */
  isLocked(pdfPath: string): boolean {
    const basename = path.basename(pdfPath);
    const lockPath = path.join(this.locksDir, `${basename}.lock`);
    return fs.existsSync(lockPath);
  }

  /**
   * Create lock file for PDF
   */
  createLock(pdfPath: string, sessionId: string): void {
    const basename = path.basename(pdfPath);
    const lockPath = path.join(this.locksDir, `${basename}.lock`);

    const lockData: LockFile = {
      session_id: sessionId,
      locked_at: new Date().toISOString(),
      pdf_path: pdfPath,
    };

    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  }

  /**
   * Remove lock file for PDF
   */
  removeLock(pdfPath: string): void {
    const basename = path.basename(pdfPath);
    const lockPath = path.join(this.locksDir, `${basename}.lock`);

    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }

  /**
   * Select next unprocessed PDF
   */
  async selectNext(): Promise<string | null> {
    const allPDFs = await this.getAllPDFs();

    for (const pdfPath of allPDFs) {
      if (!this.isProcessed(pdfPath) && !this.isLocked(pdfPath)) {
        return pdfPath;
      }
    }

    return null; // All PDFs processed
  }

  /**
   * Mark PDF as processed
   */
  markProcessed(pdfPath: string, sessionId: string, result: Partial<ProcessedPDF>): void {
    const tracker = this.readTracker();
    const pdfId = this.getPDFId(pdfPath);

    const processed: ProcessedPDF = {
      pdf_id: pdfId,
      session_id: sessionId,
      processed_at: new Date().toISOString(),
      status: result.status || 'completed',
      quality_score: result.quality_score || 0,
      agents_succeeded: result.agents_succeeded || 0,
      total_cost: result.total_cost || 0,
      duration_seconds: result.duration_seconds || 0,
      pdf_path: pdfPath,
    };

    tracker.processed.push(processed);

    // Update statistics
    tracker.statistics.total_processed = tracker.processed.length;
    tracker.statistics.total_cost = tracker.processed.reduce((sum, p) => sum + p.total_cost, 0);
    tracker.statistics.average_quality_score =
      tracker.processed.reduce((sum, p) => sum + p.quality_score, 0) / tracker.processed.length;
    tracker.statistics.average_duration_seconds =
      tracker.processed.reduce((sum, p) => sum + p.duration_seconds, 0) / tracker.processed.length;

    this.writeTracker(tracker);
  }

  /**
   * Get processing statistics
   */
  getStatistics(): ProcessingTracker['statistics'] {
    const tracker = this.readTracker();
    return tracker.statistics;
  }

  /**
   * Clean up stale locks (older than 1 hour)
   */
  cleanStaleLocks(): number {
    if (!fs.existsSync(this.locksDir)) {
      return 0;
    }

    const lockFiles = fs.readdirSync(this.locksDir);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const lockFile of lockFiles) {
      const lockPath = path.join(this.locksDir, lockFile);
      const stat = fs.statSync(lockPath);

      if (stat.mtimeMs < oneHourAgo) {
        fs.unlinkSync(lockPath);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Create session directory structure
 */
export function createSessionDirectory(sessionId: string): string {
  const sessionDir = path.join('./sessions', sessionId);
  const agentsDir = path.join(sessionDir, 'agents');

  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

  return sessionDir;
}

/**
 * Log extraction event to JSONL log
 */
export function logExtractionEvent(event: any): void {
  const logPath = './extraction_log.jsonl';
  const logEntry = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });

  fs.appendFileSync(logPath, logEntry + '\n');
}
