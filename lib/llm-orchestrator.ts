/**
 * LLM-Based Orchestrator
 *
 * Uses LLM to semantically route document sections to appropriate agents.
 * Fallback for when string-based routing fails.
 */

import type { AgentId, AGENT_ROUTING_DESCRIPTIONS } from './agent-prompts';
import type { SectionMap } from './vision-sectionizer';

/**
 * Route sections to agents using LLM
 *
 * STUB VERSION: Falls back to string-based routing
 * Full implementation would use LLM to analyze section content and intelligently route
 *
 * @param sectionMap - Detected sections
 * @param requestedAgents - Agents to run (or null for all)
 * @param userId - User ID for API key selection
 * @returns Agent page ranges
 */
export async function routeSectionsToAgentsWithLLM(
  sectionMap: SectionMap,
  requestedAgents: AgentId[] | undefined,
  userId: string
): Promise<Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>>> {
  console.log('[LLM Orchestrator] STUB: Using string-based fallback routing');

  // STUB: Import and use string-based routing as fallback
  const { routeSectionsToAgents } = await import('./extraction-workflow');
  return routeSectionsToAgents(sectionMap, requestedAgents);
}

/**
 * Full LLM orchestrator implementation (TODO)
 *
 * Would use prompt like:
 * "Given these document sections: {section titles and page ranges},
 *  and these available agents: {agent descriptions},
 *  which agents should analyze which sections?
 *  Return JSON mapping."
 *
 * Benefits over string matching:
 * - Handles non-standard section names
 * - Semantic understanding (e.g., "Ekonomisk översikt" → financial_agent)
 * - Multi-language support
 * - Fuzzy matching
 */
