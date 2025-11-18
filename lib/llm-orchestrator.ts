/**
 * LLM Orchestrator
 *
 * Uses LLM to semantically route document sections to specialist agents.
 * Fallback to string-based routing if LLM fails.
 */

import type { AgentId } from './agent-prompts';
import type { SectionMap } from './vision-sectionizer';

/**
 * Route sections to agents using LLM semantic understanding
 *
 * This is an enhanced version of string-based routing that uses
 * an LLM to understand which sections are relevant for which agents.
 *
 * @param sectionMap - Detected sections from PDF
 * @param agentsToRun - List of agent IDs to route to
 * @param userId - User ID for API key rotation
 * @returns Map of agentId → page ranges
 */
export async function routeSectionsToAgentsWithLLM(
  sectionMap: SectionMap,
  agentsToRun: AgentId[],
  userId: string
): Promise<Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>>> {
  // For now, fall back to string-based routing
  // TODO: Implement LLM-based routing using GPT-4o or Claude

  console.log('[LLM Orchestrator] Using fallback string-based routing (LLM routing not implemented)');

  const { routeSectionsToAgents } = await import('./extraction-workflow');
  return routeSectionsToAgents(sectionMap, agentsToRun);
}
