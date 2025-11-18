/**
 * LLM Orchestrator
 *
 * Uses LLM to intelligently route document sections to specialist agents.
 * Provides smart routing based on section content and agent capabilities.
 */

import type { AgentId } from './agent-prompts';
import { AGENT_ROUTING_DESCRIPTIONS } from './agent-prompts';
import type { SectionMap } from './vision-sectionizer';

export interface SectionRouting {
  agentId: AgentId;
  sections: Array<{
    sectionTitle: string;
    sectionLevel: number;
    pages: number[];
  }>;
}

/**
 * Route sections to agents using keyword matching
 *
 * This is a rule-based fallback that routes sections based on Swedish keywords.
 * In production, this could be enhanced with LLM-based routing for better accuracy.
 *
 * @param sectionMap - Document sections from vision sectionizer
 * @returns Routing map of agent ID to sections
 */
export function routeSectionsToAgentsWithLLM(
  sectionMap: SectionMap
): Record<AgentId, SectionRouting> {
  const routing: Partial<Record<AgentId, SectionRouting>> = {};

  // Initialize routing for all agents
  for (const agentId of Object.keys(AGENT_ROUTING_DESCRIPTIONS) as AgentId[]) {
    routing[agentId] = {
      agentId,
      sections: [],
    };
  }

  // Iterate through all sections and match to agents
  for (const section of sectionMap.sections) {
    const sectionTitle = section.title.toLowerCase();

    // Try to match section to agents based on keywords
    for (const [agentId, keywords] of Object.entries(AGENT_ROUTING_DESCRIPTIONS)) {
      const hasMatch = keywords.some((keyword) =>
        sectionTitle.includes(keyword.toLowerCase())
      );

      if (hasMatch && routing[agentId as AgentId]) {
        routing[agentId as AgentId]!.sections.push({
          sectionTitle: section.title,
          sectionLevel: section.level,
          pages: section.pages,
        });
      }
    }
  }

  // Ensure critical agents get document-wide access if no specific section matched
  const criticalAgents: AgentId[] = ['financial_agent', 'balance_sheet_agent', 'property_agent'];

  for (const agentId of criticalAgents) {
    if (routing[agentId] && routing[agentId]!.sections.length === 0) {
      // Give access to all pages as fallback
      routing[agentId]!.sections.push({
        sectionTitle: 'Full Document',
        sectionLevel: 0,
        pages: Array.from({ length: sectionMap.totalPages }, (_, i) => i + 1),
      });
    }
  }

  return routing as Record<AgentId, SectionRouting>;
}

/**
 * Get page ranges for an agent based on routing
 *
 * @param routing - Section routing for agent
 * @returns Array of page numbers (1-based)
 */
export function getAgentPages(routing: SectionRouting): number[] {
  const pages = new Set<number>();

  for (const section of routing.sections) {
    for (const page of section.pages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Get routing summary for logging
 *
 * @param routing - Complete routing map
 * @returns Formatted routing summary
 */
export function getRoutingSummary(routing: Record<AgentId, SectionRouting>): string {
  const lines = ['Section Routing Summary:'];

  for (const [agentId, agentRouting] of Object.entries(routing)) {
    const sectionCount = agentRouting.sections.length;
    const pageCount = getAgentPages(agentRouting).length;

    if (sectionCount > 0) {
      lines.push(
        `  ${agentId}: ${sectionCount} section(s), ${pageCount} page(s)`
      );
    }
  }

  return lines.join('\n');
}
