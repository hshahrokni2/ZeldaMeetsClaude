/**
 * PDF Tracking System
 * Manages lock files and selection of next unprocessed PDF
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

export interface LockFile {
  session_id: string;
  pdf_path: string;
  started_at: string;
  status: 'processing' | 'failed';
}

export interface PDFStatus {
  pdf_path: string;
  status: 'available' | 'locked' | 'completed';
  lock_file?: string;
  result_file?: string;
}

/**
 * Recursively find all PDFs in a directory
 */
async function findAllPDFs(dir: string, basePath: string = ''): Promise<string[]> {
  const pdfs: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      const subPdfs = await findAllPDFs(fullPath, relativePath);
      pdfs.push(...subPdfs);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      pdfs.push(relativePath);
    }
  }

  return pdfs.sort(); // Alphabetical order
}

/**
 * Get all locked PDFs
 */
async function getLockedPDFs(): Promise<Map<string, string>> {
  const locked = new Map<string, string>();
  const lockDir = '.processing';

  if (!fs.existsSync(lockDir)) {
    return locked;
  }

  const lockFiles = await readdir(lockDir);

  for (const lockFile of lockFiles) {
    if (lockFile.endsWith('.lock')) {
      const lockPath = path.join(lockDir, lockFile);
      try {
        const content = await readFile(lockPath, 'utf-8');
        const lock: LockFile = JSON.parse(content);
        const pdfFilename = lockFile.replace('.lock', '');
        locked.set(pdfFilename, lockPath);
      } catch (err) {
        console.warn(`Invalid lock file: ${lockFile}`, err);
      }
    }
  }

  return locked;
}

/**
 * Get all completed PDFs (with results)
 */
async function getCompletedPDFs(): Promise<Set<string>> {
  const completed = new Set<string>();
  const resultsDir = 'results';

  if (!fs.existsSync(resultsDir)) {
    return completed;
  }

  const resultFiles = await readdir(resultsDir);

  for (const resultFile of resultFiles) {
    if (resultFile.endsWith('_ground_truth.json')) {
      // Extract PDF ID from result filename
      const pdfId = resultFile.replace('_ground_truth.json', '');
      completed.add(pdfId);
    }
  }

  return completed;
}

/**
 * Extract PDF ID from filename
 * Example: "267197_årsredovisning_norrköping_brf_axet_4.pdf" -> "267197"
 */
function extractPdfId(filename: string): string {
  const basename = path.basename(filename, '.pdf');
  // Try to extract leading number
  const match = basename.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  // Fallback to full basename
  return basename;
}

/**
 * Get status of all PDFs
 */
export async function getAllPDFStatus(): Promise<PDFStatus[]> {
  const pdfsDir = 'pdfs';
  const allPdfs = await findAllPDFs(pdfsDir);
  const locked = await getLockedPDFs();
  const completed = await getCompletedPDFs();

  const statuses: PDFStatus[] = [];

  for (const pdfPath of allPdfs) {
    const filename = path.basename(pdfPath);
    const pdfId = extractPdfId(filename);

    let status: PDFStatus['status'] = 'available';
    let lockFile: string | undefined;
    let resultFile: string | undefined;

    // Check if completed
    if (completed.has(pdfId)) {
      status = 'completed';
      resultFile = `results/${pdfId}_ground_truth.json`;
    }
    // Check if locked
    else if (locked.has(filename)) {
      status = 'locked';
      lockFile = locked.get(filename);
    }

    statuses.push({
      pdf_path: path.join(pdfsDir, pdfPath),
      status,
      lock_file: lockFile,
      result_file: resultFile,
    });
  }

  return statuses;
}

/**
 * Select next unprocessed PDF
 */
export async function selectNextPDF(): Promise<string | null> {
  const statuses = await getAllPDFStatus();

  // Find first available PDF
  const available = statuses.find((s) => s.status === 'available');

  return available ? available.pdf_path : null;
}

/**
 * Lock a PDF for processing
 */
export async function lockPDF(
  pdfPath: string,
  sessionId: string
): Promise<void> {
  const filename = path.basename(pdfPath);
  const lockPath = path.join('.processing', `${filename}.lock`);

  const lock: LockFile = {
    session_id: sessionId,
    pdf_path: pdfPath,
    started_at: new Date().toISOString(),
    status: 'processing',
  };

  await writeFile(lockPath, JSON.stringify(lock, null, 2));
  console.log(`🔒 Locked: ${filename}`);
}

/**
 * Unlock a PDF (remove lock file)
 */
export async function unlockPDF(pdfPath: string): Promise<void> {
  const filename = path.basename(pdfPath);
  const lockPath = path.join('.processing', `${filename}.lock`);

  if (fs.existsSync(lockPath)) {
    await unlink(lockPath);
    console.log(`🔓 Unlocked: ${filename}`);
  }
}

/**
 * Update lock status to failed
 */
export async function markLockFailed(pdfPath: string): Promise<void> {
  const filename = path.basename(pdfPath);
  const lockPath = path.join('.processing', `${filename}.lock`);

  if (fs.existsSync(lockPath)) {
    const content = await readFile(lockPath, 'utf-8');
    const lock: LockFile = JSON.parse(content);
    lock.status = 'failed';
    await writeFile(lockPath, JSON.stringify(lock, null, 2));
  }
}

/**
 * Get summary statistics
 */
export async function getStats(): Promise<{
  total: number;
  available: number;
  locked: number;
  completed: number;
}> {
  const statuses = await getAllPDFStatus();

  return {
    total: statuses.length,
    available: statuses.filter((s) => s.status === 'available').length,
    locked: statuses.filter((s) => s.status === 'locked').length,
    completed: statuses.filter((s) => s.status === 'completed').length,
  };
}
