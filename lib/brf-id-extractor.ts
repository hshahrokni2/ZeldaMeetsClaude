/**
 * BRF ID Extractor
 *
 * Extracts BRF ID from PDF filename for database linkage.
 */

export interface BRFIdResult {
  brfId: string | null;
  source: string;
  confidence: 'high' | 'low';
  extractedFrom: string | null;
}

/**
 * Extract BRF ID from filename
 *
 * Patterns:
 * - brf_12345.pdf → "12345"
 * - 12345_årsredovisning_*.pdf → "12345"
 */
export function extractBRFId(pdfPath: string): BRFIdResult {
  const filename = pdfPath.split('/').pop() || '';

  // Pattern 1: brf_NNNNN.pdf
  const pattern1 = /brf_(\d+)\.pdf/i;
  const match1 = filename.match(pattern1);

  if (match1) {
    return {
      brfId: match1[1],
      source: 'filename',
      confidence: 'high',
      extractedFrom: pattern1.source,
    };
  }

  // Pattern 2: NNNNN_årsredovisning_*.pdf
  const pattern2 = /^(\d+)_/;
  const match2 = filename.match(pattern2);

  if (match2) {
    return {
      brfId: match2[1],
      source: 'filename',
      confidence: 'high',
      extractedFrom: pattern2.source,
    };
  }

  // No match
  return {
    brfId: null,
    source: 'filename',
    confidence: 'low',
    extractedFrom: null,
  };
}
