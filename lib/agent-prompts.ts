/**
 * Agent Prompts and Definitions
 *
 * Central registry of all 19 specialist agents with their prompts
 * loaded from agents/*.md files.
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

export const AGENT_IDS: AgentId[] = [
  'chairman_agent',
  'board_members_agent',
  'auditor_agent',
  'financial_agent',
  'balance_sheet_agent',
  'property_agent',
  'fees_agent',
  'cashflow_agent',
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

export const AGENT_ROUTING_DESCRIPTIONS: Record<AgentId, string> = {
  chairman_agent: 'Extracts chairman/CEO information from governance sections',
  board_members_agent: 'Extracts board member details from governance sections',
  auditor_agent: 'Extracts auditor information',
  financial_agent: 'Extracts income statement data (11 _tkr fields)',
  balance_sheet_agent: 'Extracts balance sheet data (assets, liabilities, equity)',
  property_agent: 'Extracts property information (address, designation, building details)',
  fees_agent: 'Extracts fee information (monthly fees, special assessments)',
  cashflow_agent: 'Extracts cash flow statement data',
  operational_agent: 'Extracts operational data',
  notes_depreciation_agent: 'Extracts depreciation notes',
  notes_maintenance_agent: 'Extracts maintenance plan notes',
  notes_tax_agent: 'Extracts tax-related notes',
  events_agent: 'Extracts significant events',
  audit_report_agent: 'Extracts audit report findings',
  loans_agent: 'Extracts loan information',
  reserves_agent: 'Extracts reserve fund information',
  energy_agent: 'Extracts energy certification data',
  operating_costs_agent: 'Extracts detailed operating costs',
  key_metrics_agent: 'Extracts key performance metrics',
  leverantörer_agent: 'Extracts supplier information',
};

/**
 * Load agent prompt from markdown file
 */
export function getAgentPrompt(agentId: AgentId): string {
  const agentsDir = path.join(process.cwd(), 'agents');
  const promptPath = path.join(agentsDir, `${agentId}.md`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Agent prompt file not found: ${promptPath}`);
  }

  const promptContent = fs.readFileSync(promptPath, 'utf-8');

  // Add standard instructions to every prompt
  const standardInstructions = `

## Output Format

You MUST return a JSON object with the following structure:

{
  "field_name_1": value,
  "field_name_2": value,
  "evidence_pages": [page1, page2, ...]
}

Rules:
- Use null for missing fields
- Include evidence_pages array with 1-indexed page numbers
- For currency fields (ending in _tkr), also include _original field with exact text
- Return ONLY valid JSON, no markdown formatting

`;

  return promptContent + standardInstructions;
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds(): AgentId[] {
  return AGENT_IDS;
}

/**
 * Validate agent ID
 */
export function isValidAgentId(agentId: string): agentId is AgentId {
  return AGENT_IDS.includes(agentId as AgentId);
}
