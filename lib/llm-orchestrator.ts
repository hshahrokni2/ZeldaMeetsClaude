/**
 * LLM Orchestrator
 *
 * Routes document sections to agents using semantic matching.
 */

import type { AgentId } from './agent-prompts';
import type { SectionMap } from './vision-sectionizer';
import { SECTION_AGENT_ROUTING } from './extraction-workflow';

/**
 * Route sections to agents using LLM-based semantic matching
 *
 * Falls back to string matching if LLM fails.
 */
export async function routeSectionsToAgentsWithLLM(
  sectionMap: SectionMap,
  requestedAgents: AgentId[],
  userId: string
): Promise<Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>>> {
  // For now, use string-based routing
  // TODO: Implement LLM-based semantic routing

  const agentPageRanges: Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>> = {};

  // Process L1 sections
  for (const section of sectionMap.level_1) {
    const matchingAgents: AgentId[] = [];

    // Find matching routing rules (fuzzy match on section title)
    for (const [sectionPattern, agents] of Object.entries(SECTION_AGENT_ROUTING)) {
      if (section.title.includes(sectionPattern) || sectionPattern.includes(section.title)) {
        matchingAgents.push(...(agents as AgentId[]));
      }
    }

    // Add page ranges for each matched agent
    for (const agentId of matchingAgents) {
      // Skip if not in requested agents list
      if (!requestedAgents.includes(agentId)) continue;

      if (!agentPageRanges[agentId]) {
        agentPageRanges[agentId] = [];
      }

      agentPageRanges[agentId].push({
        startPage: section.start_page,
        endPage: section.end_page,
        section: section.title,
      });
    }
  }

  // Fallback: If no sections matched, run all agents on full document
  if (Object.keys(agentPageRanges).length === 0) {
    console.warn('[LLM Orchestrator] No section matches found, running agents on full document');
    for (const agentId of requestedAgents) {
      agentPageRanges[agentId] = [{
        startPage: 1,
        endPage: sectionMap.level_1[sectionMap.level_1.length - 1]?.end_page || 1,
        section: 'Full Document',
      }];
    }
  }

  return agentPageRanges;
}
