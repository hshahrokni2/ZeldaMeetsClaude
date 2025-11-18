/**
 * BRF ID Extractor
 *
 * Extracts BRF ID from PDF filename for database linkage.
 * Implements TIER 1 LINKAGE per extraction-workflow.ts
 */

export interface BRFIdResult {
  brfId: string | null;
  source: string;
  confidence: 'high' | 'low';
  extractedFrom: string | null;
}

/**
 * Extract BRF ID from PDF filename
 *
 * Pattern: brf_NNNNNN.pdf or NNNNNN_*.pdf
 *
 * Examples:
 *   - "brf_43334.pdf" → "43334"
 *   - "82665_årsredovisning_lund_brf_vipemöllan_3.pdf" → "82665"
 *   - "random_name.pdf" → null
 */
export function extractBRFId(pdfPath: string): BRFIdResult {
  const filename = pdfPath.split('/').pop() || '';

  // Pattern 1: brf_NNNNNN.pdf
  const pattern1 = /brf_(\d{4,6})\.pdf/i;
  const match1 = filename.match(pattern1);
  if (match1) {
    return {
      brfId: match1[1],
      source: 'filename',
      confidence: 'high',
      extractedFrom: `Pattern: brf_NNNNNN.pdf`,
    };
  }

  // Pattern 2: NNNNNN_*.pdf (leading digits)
  const pattern2 = /^(\d{4,6})_/;
  const match2 = filename.match(pattern2);
  if (match2) {
    return {
      brfId: match2[1],
      source: 'filename',
      confidence: 'high',
      extractedFrom: `Pattern: NNNNNN_*.pdf`,
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
