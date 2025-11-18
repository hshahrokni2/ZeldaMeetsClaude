/**
 * BRF ID Extractor
 *
 * Extracts BRF ID from PDF filename.
 * Pattern: "brf_12345.pdf" → "12345"
 */

export interface BRFIdExtractionResult {
  brfId: string | null;
  source: string;
  confidence: 'high' | 'low';
  extractedFrom: string | null;
}

/**
 * Extract BRF ID from PDF path
 *
 * Patterns matched:
 * - brf_82665.pdf → "82665"
 * - 82665_årsredovisning_*.pdf → "82665"
 * - pdfs/hjorthagen/brf_44232.pdf → "44232"
 *
 * @param pdfPath - Path to PDF file
 * @returns Extraction result with confidence
 */
export function extractBRFId(pdfPath: string): BRFIdExtractionResult {
  const filename = pdfPath.split('/').pop() || '';

  // Pattern 1: brf_NNNNN.pdf (highest confidence)
  const pattern1 = /brf_(\d+)\.pdf/i;
  const match1 = filename.match(pattern1);
  if (match1) {
    return {
      brfId: match1[1],
      source: 'filename',
      confidence: 'high',
      extractedFrom: `Pattern: brf_NNNNN.pdf → ${match1[1]}`,
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
      extractedFrom: `Pattern: NNNNN_*.pdf → ${match2[1]}`,
    };
  }

  // Pattern 3: Any 5-6 digit number in filename
  const pattern3 = /(\d{5,6})/;
  const match3 = filename.match(pattern3);
  if (match3) {
    return {
      brfId: match3[1],
      source: 'filename',
      confidence: 'low',
      extractedFrom: `Pattern: Contains NNNNN → ${match3[1]} (low confidence)`,
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

/**
 * Validate BRF ID format
 *
 * Expected: 5-6 digit number
 */
export function isValidBRFId(brfId: string): boolean {
  return /^\d{5,6}$/.test(brfId);
}
