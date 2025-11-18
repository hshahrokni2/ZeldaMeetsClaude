#!/usr/bin/env tsx
/**
 * Initialize Tracking System
 *
 * Scans the pdfs/ directory and creates tracking entries for all PDFs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface PDFStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  locked_at: string | null;
  locked_by: string | null;
  completed_at: string | null;
  session_id: string | null;
  metrics: any | null;
}

interface TrackingData {
  last_updated: string;
  total_pdfs: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  pdfs: Record<string, PDFStatus>;
}

function findAllPDFs(dir: string, baseDir: string = dir): string[] {
  const pdfs: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      pdfs.push(...findAllPDFs(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      const relativePath = path.relative(baseDir, fullPath);
      pdfs.push(relativePath);
    }
  }

  return pdfs;
}

function initializeTracking() {
  const pdfsDir = 'pdfs';
  const trackingDir = 'tracking';
  const trackingFile = path.join(trackingDir, 'processing_status.json');

  // Ensure tracking directory exists
  if (!fs.existsSync(trackingDir)) {
    fs.mkdirSync(trackingDir, { recursive: true });
  }

  // Find all PDFs
  const pdfPaths = findAllPDFs(pdfsDir).sort();

  console.log(`Found ${pdfPaths.length} PDFs`);

  // Create tracking data
  const tracking: TrackingData = {
    last_updated: new Date().toISOString(),
    total_pdfs: pdfPaths.length,
    completed: 0,
    processing: 0,
    pending: pdfPaths.length,
    failed: 0,
    pdfs: {},
  };

  for (const pdfPath of pdfPaths) {
    tracking.pdfs[pdfPath] = {
      status: 'pending',
      locked_at: null,
      locked_by: null,
      completed_at: null,
      session_id: null,
      metrics: null,
    };
  }

  // Write tracking file
  fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2));

  console.log(`✅ Tracking system initialized: ${trackingFile}`);
  console.log(`   Total PDFs: ${pdfPaths.length}`);
  console.log(`   Status: All marked as 'pending'`);

  // Display summary by directory
  const byDir: Record<string, number> = {};
  for (const pdf of pdfPaths) {
    const dir = pdf.includes('/') ? pdf.split('/')[1] : 'root';
    byDir[dir] = (byDir[dir] || 0) + 1;
  }

  console.log('\n📁 PDFs by directory:');
  for (const [dir, count] of Object.entries(byDir).sort()) {
    console.log(`   ${dir}: ${count} PDFs`);
  }
}

if (require.main === module) {
  initializeTracking();
}
