/**
 * BRF ID Extraction
 *
 * Extracts BRF identifier from PDF filename or path.
 * Used for TIER 1 linkage (zero cost, instant, 100% reliable).
 */

export interface BRFIdResult {
  brfId: string | null;
  confidence: number;
  extractedFrom: 'filename' | 'path' | 'none';
}

/**
 * Extract BRF ID from PDF filename or path
 *
 * Patterns:
 * - brf_12345.pdf → brf_12345
 * - 12345_årsredovisning_*.pdf → brf_12345
 * - *_brf_*.pdf → extracted from filename
 *
 * @param pdfPath - Path to PDF file
 * @returns BRF ID result with confidence score
 */
export function extractBRFId(pdfPath: string): BRFIdResult {
  const filename = pdfPath.split('/').pop() || '';
  const filenameWithoutExt = filename.replace('.pdf', '');

  // Pattern 1: brf_NNNNN format
  const brfPattern = /brf[_-](\d+)/i;
  const brfMatch = filenameWithoutExt.match(brfPattern);
  if (brfMatch) {
    return {
      brfId: `brf_${brfMatch[1]}`,
      confidence: 1.0,
      extractedFrom: 'filename',
    };
  }

  // Pattern 2: Leading number format (NNNNN_årsredovisning_*.pdf)
  const leadingNumberPattern = /^(\d{5,6})_/;
  const leadingMatch = filenameWithoutExt.match(leadingNumberPattern);
  if (leadingMatch) {
    return {
      brfId: `brf_${leadingMatch[1]}`,
      confidence: 0.95,
      extractedFrom: 'filename',
    };
  }

  // Pattern 3: Any number in filename (fallback)
  const anyNumberPattern = /(\d{5,6})/;
  const anyMatch = filenameWithoutExt.match(anyNumberPattern);
  if (anyMatch) {
    return {
      brfId: `brf_${anyMatch[1]}`,
      confidence: 0.75,
      extractedFrom: 'filename',
    };
  }

  // No BRF ID found
  return {
    brfId: null,
    confidence: 0.0,
    extractedFrom: 'none',
  };
}

/**
 * Validate BRF ID format
 *
 * @param brfId - BRF ID to validate
 * @returns True if valid format
 */
export function validateBRFId(brfId: string): boolean {
  return /^brf_\d{5,6}$/.test(brfId);
}
