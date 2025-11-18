/**
 * Ground Truth Consensus System
 *
 * Executes 3-model consensus for ground truth generation:
 * 1. Gemini 2.5 Pro extraction
 * 2. GPT-4o extraction
 * 3. Claude 3.7 Sonnet tiebreaker (if disagreement)
 */

import type { AgentId } from './agent-prompts';
import type { ExtractionField } from './extraction-field-v1.0.0';

export interface FieldConsensus {
  fieldName: string;
  consensusValue: any;
  confidence: number;
  agreementLevel: 'dual' | 'tiebreaker' | 'disagreement';
  modelValues: {
    gemini?: any;
    gpt?: any;
    claude?: any;
  };
  source: string; // Which models agreed
}

export interface ConsensusResult {
  agentId: AgentId;
  consensusData: Record<string, ExtractionField<any>>;
  fields: FieldConsensus[];
  overallConfidence: number;
  agreementRate: number; // % of fields with dual agreement
  tiebreakerUsed: number; // % of fields needing Claude
  tokensBreakdown: {
    gemini: number;
    gpt: number;
    claude: number;
    total: number;
  };
  costBreakdown: {
    gemini: number;
    gpt: number;
    claude: number;
    total: number;
  };
}

/**
 * Execute agent with 3-model consensus
 *
 * STUB VERSION: Single model extraction only
 * Full implementation would call Gemini + GPT + Claude and compare results
 *
 * @param agentId - Agent to execute
 * @param images - Page images
 * @param userId - User ID
 * @returns Consensus result
 */
export async function executeAgentWithConsensus(
  agentId: AgentId,
  images: string[],
  userId: string
): Promise<ConsensusResult> {
  console.log(`[Consensus] STUB: Running single-model extraction for ${agentId}`);

  // STUB: Just run with Gemini (no consensus)
  const { executeAgent } = await import('./extraction-workflow');

  const result = await executeAgent(agentId, images, userId, 'google/gemini-2.0-flash-exp:free');

  // Convert to consensus format (fake consensus with 100% agreement)
  const fields: FieldConsensus[] = Object.keys(result.data).map((fieldName) => ({
    fieldName,
    consensusValue: result.data[fieldName].value,
    confidence: result.data[fieldName].confidence,
    agreementLevel: 'dual' as const,
    modelValues: {
      gemini: result.data[fieldName].value,
    },
    source: 'gemini_only',
  }));

  return {
    agentId,
    consensusData: result.data,
    fields,
    overallConfidence: 0.85, // Stub
    agreementRate: 1.0, // 100% (fake)
    tiebreakerUsed: 0,
    tokensBreakdown: {
      gemini: result.tokens,
      gpt: 0,
      claude: 0,
      total: result.tokens,
    },
    costBreakdown: {
      gemini: result.cost,
      gpt: 0,
      claude: 0,
      total: result.cost,
    },
  };
}

/**
 * Full consensus implementation (TODO)
 *
 * Steps:
 * 1. Call Gemini 2.5 Pro with agent prompt + images
 * 2. Call GPT-4o with same prompt + images
 * 3. Compare field by field:
 *    - If Gemini == GPT → HIGH confidence (dual agreement)
 *    - If Gemini != GPT → Call Claude as tiebreaker
 *      - If Claude == Gemini OR Claude == GPT → MEDIUM confidence
 *      - If all 3 disagree → LOW confidence, flag for review
 * 4. Aggregate consensus values with metadata
 *
 * Consensus rules:
 * - Dual agreement: confidence = 0.9
 * - Tiebreaker match: confidence = 0.7
 * - No agreement: confidence = 0.3, manual review required
 */
