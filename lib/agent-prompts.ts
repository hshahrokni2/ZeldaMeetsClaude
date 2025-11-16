/**
 * Agent Prompt Loader
 *
 * Dynamically loads agent prompts from markdown files in agents/ directory.
 */

import * as fs from 'fs';
import * as path from 'path';

export type AgentId =
  | 'chairman_agent'
  | 'board_members_agent'
  | 'auditor_agent'
  | 'financial_agent'
  | 'balance_sheet_agent'
  | 'property_agent'
  | 'fees_agent'
  | 'cashflow_agent'
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

/**
 * Agent descriptions for routing
 */
export const AGENT_ROUTING_DESCRIPTIONS: Record<AgentId, string> = {
  chairman_agent: 'Extracts chairman information from board section',
  board_members_agent: 'Extracts board member names and roles',
  auditor_agent: 'Extracts auditor information',
  financial_agent: 'Extracts income statement data (revenue, costs, net result)',
  balance_sheet_agent: 'Extracts balance sheet data (assets, liabilities, equity)',
  property_agent: 'Extracts property information (address, designation, building details)',
  fees_agent: 'Extracts membership fees and charges',
  cashflow_agent: 'Extracts cash flow statement data',
  operational_agent: 'Extracts operational statistics',
  notes_depreciation_agent: 'Extracts depreciation notes',
  notes_maintenance_agent: 'Extracts maintenance notes',
  notes_tax_agent: 'Extracts tax notes',
  events_agent: 'Extracts significant events',
  audit_report_agent: 'Extracts audit report findings',
  loans_agent: 'Extracts loan information',
  reserves_agent: 'Extracts reserve fund information',
  energy_agent: 'Extracts energy declaration data',
  operating_costs_agent: 'Extracts detailed operating costs',
  key_metrics_agent: 'Extracts key performance metrics',
  leverantörer_agent: 'Extracts supplier information',
};

/**
 * Load agent prompt from markdown file
 */
export function getAgentPrompt(agentId: AgentId): string {
  try {
    const agentsDir = path.join(process.cwd(), 'agents');
    const promptPath = path.join(agentsDir, `${agentId}.md`);

    if (!fs.existsSync(promptPath)) {
      console.warn(`[Agent Prompts] Warning: ${agentId}.md not found, using default prompt`);
      return `Extract data for ${agentId}. Return JSON with extracted fields.`;
    }

    const prompt = fs.readFileSync(promptPath, 'utf-8');

    // Add standard JSON output instruction
    return `${prompt}

IMPORTANT: Return ONLY valid JSON with the extracted fields. Do not include markdown formatting or explanations.`;
  } catch (error: any) {
    console.error(`[Agent Prompts] Error loading ${agentId}:`, error.message);
    return `Extract data for ${agentId}. Return JSON with extracted fields.`;
  }
}

/**
 * Get all available agent IDs
 */
export function getAllAgentIds(): AgentId[] {
  return Object.keys(AGENT_ROUTING_DESCRIPTIONS) as AgentId[];
}
