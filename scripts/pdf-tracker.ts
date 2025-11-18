/**
 * PDF Tracker - Manages PDF processing state
 *
 * Tracks which PDFs have been:
 * - Locked (currently processing)
 * - Completed (successfully extracted)
 * - Skipped (invalid/corrupted)
 * - Available (ready for processing)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PDFLock {
  pdf_id: string;
  pdf_path: string;
  session_id: string;
  started_at: string;
  locked_by: string;
  status: 'processing' | 'completed' | 'failed';
  metadata?: {
    file_size_mb: number;
    page_count?: number;
    brf_name?: string;
    city?: string;
  };
}

export interface PDFStatus {
  pdf_id: string;
  pdf_path: string;
  status: 'available' | 'locked' | 'completed' | 'skipped' | 'corrupted';
  lock?: PDFLock;
}

export class PDFTracker {
  private processingDir: string;
  private locksDir: string;
  private completedDir: string;
  private skippedDir: string;
  private corruptedDir: string;

  constructor(baseDir: string = '/home/user/ZeldaMeetsClaude') {
    this.processingDir = path.join(baseDir, 'processing');
    this.locksDir = path.join(this.processingDir, 'locks');
    this.completedDir = path.join(this.processingDir, 'completed');
    this.skippedDir = path.join(this.processingDir, 'skipped');
    this.corruptedDir = path.join(this.processingDir, 'corrupted');

    // Ensure directories exist
    [this.locksDir, this.completedDir, this.skippedDir, this.corruptedDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get all PDFs from the pdfs directory
   */
  getAllPDFs(): string[] {
    const baseDir = path.join(__dirname, '..');
    const pdfsDir = path.join(baseDir, 'pdfs');

    const allPDFs: string[] = [];

    // Scan main pdfs directory
    const mainFiles = fs.readdirSync(pdfsDir);
    for (const file of mainFiles) {
      const fullPath = path.join(pdfsDir, file);
      if (fs.statSync(fullPath).isFile() && file.endsWith('.pdf')) {
        allPDFs.push(fullPath);
      }
    }

    // Scan hjorthagen subdirectory
    const hjorthagenDir = path.join(pdfsDir, 'hjorthagen');
    if (fs.existsSync(hjorthagenDir)) {
      const hjorthagenFiles = fs.readdirSync(hjorthagenDir);
      for (const file of hjorthagenFiles) {
        if (file.endsWith('.pdf')) {
          allPDFs.push(path.join(hjorthagenDir, file));
        }
      }
    }

    // Scan srs subdirectory
    const srsDir = path.join(pdfsDir, 'srs');
    if (fs.existsSync(srsDir)) {
      const srsFiles = fs.readdirSync(srsDir);
      for (const file of srsFiles) {
        if (file.endsWith('.pdf')) {
          allPDFs.push(path.join(srsDir, file));
        }
      }
    }

    return allPDFs.sort();
  }

  /**
   * Get PDF ID from path
   */
  getPDFId(pdfPath: string): string {
    const basename = path.basename(pdfPath, '.pdf');
    return basename;
  }

  /**
   * Check if PDF is locked
   */
  isLocked(pdfId: string): boolean {
    const lockPath = path.join(this.locksDir, `${pdfId}.lock`);
    return fs.existsSync(lockPath);
  }

  /**
   * Check if PDF is completed
   */
  isCompleted(pdfId: string): boolean {
    const donePath = path.join(this.completedDir, `${pdfId}.done`);
    return fs.existsSync(donePath);
  }

  /**
   * Check if PDF is skipped
   */
  isSkipped(pdfId: string): boolean {
    const skipPath = path.join(this.skippedDir, `${pdfId}.skip`);
    return fs.existsSync(skipPath);
  }

  /**
   * Get lock details
   */
  getLock(pdfId: string): PDFLock | null {
    const lockPath = path.join(this.locksDir, `${pdfId}.lock`);
    if (!fs.existsSync(lockPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(lockPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read lock file for ${pdfId}:`, error);
      return null;
    }
  }

  /**
   * Check if lock is stale (>24 hours)
   */
  isLockStale(lock: PDFLock): boolean {
    const startedAt = new Date(lock.started_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  }

  /**
   * Get status of a specific PDF
   */
  getStatus(pdfPath: string): PDFStatus {
    const pdfId = this.getPDFId(pdfPath);

    if (this.isCompleted(pdfId)) {
      return { pdf_id: pdfId, pdf_path: pdfPath, status: 'completed' };
    }

    if (this.isSkipped(pdfId)) {
      return { pdf_id: pdfId, pdf_path: pdfPath, status: 'skipped' };
    }

    if (this.isLocked(pdfId)) {
      const lock = this.getLock(pdfId);
      if (lock && this.isLockStale(lock)) {
        return { pdf_id: pdfId, pdf_path: pdfPath, status: 'available', lock }; // Stale lock = available
      }
      return { pdf_id: pdfId, pdf_path: pdfPath, status: 'locked', lock: lock || undefined };
    }

    return { pdf_id: pdfId, pdf_path: pdfPath, status: 'available' };
  }

  /**
   * Get all PDF statuses
   */
  getAllStatuses(): PDFStatus[] {
    const allPDFs = this.getAllPDFs();
    return allPDFs.map(pdfPath => this.getStatus(pdfPath));
  }

  /**
   * Get next available PDF for processing
   */
  getNextAvailable(): PDFStatus | null {
    const statuses = this.getAllStatuses();
    const available = statuses.filter(s => s.status === 'available');

    if (available.length === 0) {
      return null;
    }

    // Return first available
    return available[0];
  }

  /**
   * Create lock for PDF
   */
  createLock(pdfPath: string, sessionId: string): PDFLock {
    const pdfId = this.getPDFId(pdfPath);
    const stats = fs.statSync(pdfPath);

    const lock: PDFLock = {
      pdf_id: pdfId,
      pdf_path: pdfPath,
      session_id: sessionId,
      started_at: new Date().toISOString(),
      locked_by: 'claude_code_autonomous',
      status: 'processing',
      metadata: {
        file_size_mb: stats.size / (1024 * 1024),
      }
    };

    const lockPath = path.join(this.locksDir, `${pdfId}.lock`);
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));

    console.log(`✓ Lock created: ${pdfId}`);
    return lock;
  }

  /**
   * Update lock
   */
  updateLock(pdfId: string, updates: Partial<PDFLock>): void {
    const lock = this.getLock(pdfId);
    if (!lock) {
      throw new Error(`Lock not found for PDF: ${pdfId}`);
    }

    const updatedLock = { ...lock, ...updates };
    const lockPath = path.join(this.locksDir, `${pdfId}.lock`);
    fs.writeFileSync(lockPath, JSON.stringify(updatedLock, null, 2));
  }

  /**
   * Mark PDF as completed
   */
  markCompleted(pdfId: string, metadata?: any): void {
    // Update lock to completed status
    this.updateLock(pdfId, {
      status: 'completed',
      metadata: {
        ...this.getLock(pdfId)?.metadata,
        completed_at: new Date().toISOString(),
        ...metadata
      }
    });

    // Create .done marker
    const donePath = path.join(this.completedDir, `${pdfId}.done`);
    fs.writeFileSync(donePath, JSON.stringify({
      pdf_id: pdfId,
      completed_at: new Date().toISOString(),
      ...metadata
    }, null, 2));

    console.log(`✓ Marked completed: ${pdfId}`);
  }

  /**
   * Mark PDF as skipped
   */
  markSkipped(pdfId: string, reason: string): void {
    const skipPath = path.join(this.skippedDir, `${pdfId}.skip`);
    fs.writeFileSync(skipPath, JSON.stringify({
      pdf_id: pdfId,
      skipped_at: new Date().toISOString(),
      reason: reason
    }, null, 2));

    // Remove lock if exists
    this.removeLock(pdfId);

    console.log(`⊘ Marked skipped: ${pdfId} (${reason})`);
  }

  /**
   * Remove lock
   */
  removeLock(pdfId: string): void {
    const lockPath = path.join(this.locksDir, `${pdfId}.lock`);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log(`✓ Lock removed: ${pdfId}`);
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    total: number;
    available: number;
    locked: number;
    completed: number;
    skipped: number;
    stale_locks: number;
  } {
    const statuses = this.getAllStatuses();

    return {
      total: statuses.length,
      available: statuses.filter(s => s.status === 'available').length,
      locked: statuses.filter(s => s.status === 'locked' && s.lock && !this.isLockStale(s.lock)).length,
      completed: statuses.filter(s => s.status === 'completed').length,
      skipped: statuses.filter(s => s.status === 'skipped').length,
      stale_locks: statuses.filter(s => s.status === 'locked' && s.lock && this.isLockStale(s.lock)).length,
    };
  }

  /**
   * Print status report
   */
  printStatus(): void {
    const stats = this.getStats();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PDF PROCESSING STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total PDFs:       ${stats.total}`);
    console.log(`Available:        ${stats.available}`);
    console.log(`Locked:           ${stats.locked}`);
    console.log(`Completed:        ${stats.completed}`);
    console.log(`Skipped:          ${stats.skipped}`);
    console.log(`Stale locks:      ${stats.stale_locks}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show progress
    const progress = (stats.completed / stats.total) * 100;
    console.log(`Progress: ${progress.toFixed(1)}% (${stats.completed}/${stats.total})`);

    // Progress bar
    const barLength = 40;
    const filled = Math.floor((progress / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`[${bar}]`);
    console.log('');
  }
}

// CLI usage
if (require.main === module) {
  const tracker = new PDFTracker();

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      tracker.printStatus();
      break;

    case 'next':
      const next = tracker.getNextAvailable();
      if (next) {
        console.log('Next available PDF:');
        console.log(JSON.stringify(next, null, 2));
      } else {
        console.log('No PDFs available for processing');
      }
      break;

    case 'list':
      const statuses = tracker.getAllStatuses();
      console.log(JSON.stringify(statuses, null, 2));
      break;

    default:
      console.log('Usage:');
      console.log('  npx tsx scripts/pdf-tracker.ts status   - Show processing status');
      console.log('  npx tsx scripts/pdf-tracker.ts next     - Get next available PDF');
      console.log('  npx tsx scripts/pdf-tracker.ts list     - List all PDF statuses');
  }
}

export default PDFTracker;
