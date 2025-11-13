/**
 * Base field type with value + confidence + evidence tracking
 */
export interface ExtractionField<T> {
  value: T | null;
  confidence: number; // 0.0-1.0 scale
  evidence_pages: number[]; // 1-based page numbers
  original_string?: string; // For currency fields (_tkr)
  source?: 'gemini' | 'gpt' | 'claude' | 'dual_agreement' | 'tiebreaker';
}

export type OptionalField<T> = ExtractionField<T> | null;
