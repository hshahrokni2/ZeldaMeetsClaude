/**
 * Agent Prompts Registry
 *
 * Loads agent prompt definitions from /agents directory
 * and provides type-safe AgentId enum.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Agent IDs (matches filenames in /agents directory)
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
  | 'energy_agent'
  | 'operating_costs_agent'
  | 'key_metrics_agent'
  | 'leverantörer_agent'
  | 'reserves_agent';

/**
 * All available agents
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
  'energy_agent',
  'operating_costs_agent',
  'key_metrics_agent',
  'leverantörer_agent',
  'reserves_agent',
];

/**
 * Agent routing descriptions (for LLM orchestrator)
 */
export const AGENT_ROUTING_DESCRIPTIONS: Record<AgentId, string> = {
  chairman_agent: 'Extracts chairman name from board section',
  board_members_agent: 'Extracts board member names and roles',
  auditor_agent: 'Extracts auditor name and firm',
  financial_agent: 'Extracts income statement data (revenue, costs, net result)',
  balance_sheet_agent: 'Extracts balance sheet (assets, liabilities, equity)',
  cashflow_agent: 'Extracts cash flow statement',
  property_agent: 'Extracts property information (address, designation, building data)',
  fees_agent: 'Extracts membership fees',
  operational_agent: 'Extracts operational data',
  notes_depreciation_agent: 'Extracts depreciation notes',
  notes_maintenance_agent: 'Extracts maintenance notes',
  notes_tax_agent: 'Extracts tax notes',
  events_agent: 'Extracts significant events',
  audit_report_agent: 'Extracts audit report conclusions',
  loans_agent: 'Extracts loan data',
  energy_agent: 'Extracts energy declaration data',
  operating_costs_agent: 'Extracts operating costs breakdown',
  key_metrics_agent: 'Extracts key metrics',
  leverantörer_agent: 'Extracts supplier information',
  reserves_agent: 'Extracts reserve funds data',
};

/**
 * Load agent prompt from markdown file
 *
 * @param agentId - Agent identifier
 * @returns Full prompt text
 */
export function getAgentPrompt(agentId: AgentId): string {
  const agentsDir = path.join(process.cwd(), 'agents');
  const promptPath = path.join(agentsDir, `${agentId}.md`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`[agent-prompts] Prompt file not found: ${promptPath}`);
  }

  const promptText = fs.readFileSync(promptPath, 'utf-8');

  // Add universal anti-hallucination footer
  const footer = `

**CRITICAL REMINDERS:**
1. Return STRICT VALID JSON only (no markdown fences, no comments)
2. ONLY extract data explicitly visible in provided pages
3. If field not found → OMIT from response (do NOT return null, empty string, or placeholder)
4. NEVER invent data - if uncertain, omit field
5. Include evidence_pages array with 1-based page numbers where data was found
`;

  return promptText + footer;
}

/**
 * Get all agent prompts
 */
export function getAllAgentPrompts(): Record<AgentId, string> {
  const prompts: Partial<Record<AgentId, string>> = {};

  for (const agentId of ALL_AGENTS) {
    try {
      prompts[agentId] = getAgentPrompt(agentId);
    } catch (error) {
      console.warn(`[agent-prompts] Failed to load ${agentId}:`, error);
    }
  }

  return prompts as Record<AgentId, string>;
}

/**
 * Validate agent ID
 */
export function isValidAgentId(id: string): id is AgentId {
  return ALL_AGENTS.includes(id as AgentId);
}
