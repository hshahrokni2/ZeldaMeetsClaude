/**
 * Section-to-Agent Routing Logic
 *
 * Maps document sections to specialized extraction agents based on:
 * 1. Section title matching (Swedish keywords)
 * 2. Semantic relevance (what each agent specializes in)
 * 3. Page range optimization (agents only see relevant pages)
 *
 * Used by extraction-workflow.ts to determine which agents run on which pages.
 */

export type AgentId =
  | 'chairman_agent'
  | 'board_members_agent'
  | 'auditor_agent'
  | 'financial_agent'
  | 'balance_sheet_agent'
  | 'cashflow_agent'
  | 'property_agent'
  | 'fees_agent'
  | 'operational_agent'
  | 'notes_depreciation_agent'
  | 'notes_maintenance_agent'
  | 'notes_tax_agent'
  | 'events_agent'
  | 'audit_report_agent'
  | 'loans_agent'
  | 'reserves_agent'
  | 'energy_agent'
  | 'operating_costs_agent'
  | 'key_metrics_agent'
  | 'leverantörer_agent';

export interface SectionInfo {
  title: string;
  start_page: number;
  end_page: number;
  level: 1 | 2 | 3;
}

export interface SectionMap {
  level_1: SectionInfo[];
  level_2?: SectionInfo[];
  level_3?: SectionInfo[];
}

export interface PageRange {
  startPage: number;
  endPage: number;
  section: string;
}

/**
 * Section-to-Agent Routing Map
 *
 * Maps Swedish section titles to relevant agents.
 * Multiple agents can process the same section for redundancy.
 */
export const SECTION_AGENT_ROUTING: Record<string, AgentId[]> = {
  // Governance sections
  'Förvaltningsberättelse': [
    'chairman_agent',
    'board_members_agent',
    'property_agent',
    'events_agent',
    'leverantörer_agent',
  ],
  'Styrelsen': ['chairman_agent', 'board_members_agent'],
  'Styrelse': ['chairman_agent', 'board_members_agent'],
  'Revisorer': ['auditor_agent'],
  'Revisor': ['auditor_agent'],

  // Financial statements
  'Resultaträkning': ['financial_agent', 'key_metrics_agent'],
  'Balansräkning': ['financial_agent', 'balance_sheet_agent', 'key_metrics_agent'],
  'Kassaflödesanalys': ['cashflow_agent'],
  'Kassaflöde': ['cashflow_agent'],

  // Notes
  'Noter': [
    'notes_depreciation_agent',
    'notes_maintenance_agent',
    'notes_tax_agent',
    'loans_agent',
    'operating_costs_agent',
  ],
  'Tilläggsupplysningar': [
    'notes_depreciation_agent',
    'notes_maintenance_agent',
    'notes_tax_agent',
  ],

  // Other sections
  'Revisionsberättelse': ['audit_report_agent'],
  'Energideklaration': ['energy_agent'],
  'Energi': ['energy_agent'],
  'Avgifter': ['fees_agent'],
  'Årsavgift': ['fees_agent'],
  'Avsättningar': ['reserves_agent'],
  'Underhåll': ['notes_maintenance_agent', 'operating_costs_agent'],
  'Driftskostnader': ['operating_costs_agent', 'financial_agent'],
};

/**
 * Route sections to agents
 *
 * Given the detected section map, determines which agents should run
 * and on which page ranges.
 *
 * @param sectionMap - Hierarchical document structure from vision-sectionizer
 * @param requestedAgents - Optional list to filter agents (if not provided, all matched agents run)
 * @returns Map of agentId → page ranges to extract from
 */
export function routeSectionsToAgents(
  sectionMap: SectionMap,
  requestedAgents?: AgentId[]
): Record<AgentId, PageRange[]> {
  const agentPageRanges: Record<AgentId, PageRange[]> = {};

  // Process L1 sections first
  for (const section of sectionMap.level_1) {
    // Find matching routing rules (fuzzy match on section title)
    const matchingAgents: AgentId[] = [];

    for (const [sectionPattern, agents] of Object.entries(SECTION_AGENT_ROUTING)) {
      if (
        section.title.includes(sectionPattern) ||
        sectionPattern.includes(section.title)
      ) {
        matchingAgents.push(...agents);
      }
    }

    // Add page ranges for each matched agent
    for (const agentId of matchingAgents) {
      // Skip if not in requested agents list
      if (requestedAgents && !requestedAgents.includes(agentId)) continue;

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

  // Process L2/L3 subsections for more granular routing
  if (sectionMap.level_2) {
    for (const section of sectionMap.level_2) {
      const matchingAgents: AgentId[] = [];

      for (const [sectionPattern, agents] of Object.entries(SECTION_AGENT_ROUTING)) {
        if (
          section.title.toLowerCase().includes(sectionPattern.toLowerCase()) ||
          sectionPattern.toLowerCase().includes(section.title.toLowerCase())
        ) {
          matchingAgents.push(...agents);
        }
      }

      for (const agentId of matchingAgents) {
        if (requestedAgents && !requestedAgents.includes(agentId)) continue;

        if (!agentPageRanges[agentId]) {
          agentPageRanges[agentId] = [];
        }

        // Only add if not already covered by L1 section
        const alreadyCovered = agentPageRanges[agentId].some(
          (range) =>
            range.startPage <= section.start_page && range.endPage >= section.end_page
        );

        if (!alreadyCovered) {
          agentPageRanges[agentId].push({
            startPage: section.start_page,
            endPage: section.end_page,
            section: section.title,
          });
        }
      }
    }
  }

  // Fallback: If no sections matched, run all agents on full document
  if (Object.keys(agentPageRanges).length === 0 && requestedAgents) {
    console.warn('[Routing] No section matches found, running agents on full document');
    const lastPage =
      sectionMap.level_1[sectionMap.level_1.length - 1]?.end_page || 1;

    for (const agentId of requestedAgents) {
      agentPageRanges[agentId] = [
        {
          startPage: 1,
          endPage: lastPage,
          section: 'Full Document',
        },
      ];
    }
  }

  return agentPageRanges;
}

/**
 * Get all 19 agent IDs
 */
export const ALL_AGENTS: AgentId[] = [
  'chairman_agent',
  'board_members_agent',
  'auditor_agent',
  'financial_agent',
  'balance_sheet_agent',
  'cashflow_agent',
  'property_agent',
  'fees_agent',
  'operational_agent',
  'notes_depreciation_agent',
  'notes_maintenance_agent',
  'notes_tax_agent',
  'events_agent',
  'audit_report_agent',
  'loans_agent',
  'reserves_agent',
  'energy_agent',
  'operating_costs_agent',
  'key_metrics_agent',
  'leverantörer_agent',
];

/**
 * Extract images for a specific agent based on page ranges
 *
 * @param allImages - All PDF page images (base64)
 * @param pageRanges - Page ranges for this agent
 * @returns Filtered images for the agent
 */
export function extractAgentImages(
  allImages: string[],
  pageRanges: PageRange[]
): string[] {
  const imageSet = new Set<number>();

  // Collect all page numbers for this agent (0-based index)
  for (const range of pageRanges) {
    for (let page = range.startPage; page <= range.endPage; page++) {
      imageSet.add(page - 1); // Convert 1-based to 0-based
    }
  }

  // Extract images in order
  const images: string[] = [];
  const sortedPages = Array.from(imageSet).sort((a, b) => a - b);

  for (const pageIndex of sortedPages) {
    if (pageIndex < allImages.length) {
      images.push(allImages[pageIndex]);
    }
  }

  return images;
}

/**
 * Validate routing results
 *
 * Ensures all requested agents have page ranges assigned.
 */
export function validateRouting(
  routing: Record<AgentId, PageRange[]>,
  requestedAgents: AgentId[]
): { valid: boolean; missingAgents: AgentId[] } {
  const missingAgents = requestedAgents.filter(
    (agentId) => !routing[agentId] || routing[agentId].length === 0
  );

  return {
    valid: missingAgents.length === 0,
    missingAgents,
  };
}
