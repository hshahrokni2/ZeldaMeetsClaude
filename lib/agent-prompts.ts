/**
 * Agent Prompts - Loads from markdown files
 *
 * Each agent is defined in agents/{agent_id}.md
 * This module provides dynamic loading and caching.
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
  | 'key_metrics_agent'
  | 'leverantörer_agent';

export const ALL_AGENT_IDS: AgentId[] = [
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
  'key_metrics_agent',
  'leverantörer_agent',
];

/**
 * Agent routing descriptions for LLM-based orchestration
 */
export const AGENT_ROUTING_DESCRIPTIONS: Record<AgentId, string> = {
  chairman_agent: 'Extracts chairman/board chairman information',
  board_members_agent: 'Extracts board member names and roles',
  auditor_agent: 'Extracts auditor information',
  financial_agent: 'Extracts income statement data (resultaträkning)',
  balance_sheet_agent: 'Extracts balance sheet data (balansräkning)',
  property_agent: 'Extracts property information (building details, address)',
  fees_agent: 'Extracts fee structure (monthly fees, avgifter)',
  cashflow_agent: 'Extracts cash flow statement',
  operational_agent: 'Extracts operational costs breakdown',
  notes_depreciation_agent: 'Extracts depreciation notes',
  notes_maintenance_agent: 'Extracts maintenance and repair notes',
  notes_tax_agent: 'Extracts tax-related notes',
  events_agent: 'Extracts significant events from management report',
  audit_report_agent: 'Extracts audit report and opinions',
  loans_agent: 'Extracts loan details and terms',
  reserves_agent: 'Extracts reserve fund information',
  energy_agent: 'Extracts energy consumption and declarations',
  key_metrics_agent: 'Extracts key performance metrics',
  leverantörer_agent: 'Extracts supplier information',
};

// Cache for loaded prompts
const promptCache: Map<AgentId, string> = new Map();

/**
 * Get agent prompt from markdown file
 *
 * @param agentId - Agent identifier
 * @returns Full prompt text
 */
export function getAgentPrompt(agentId: AgentId): string {
  // Check cache first
  if (promptCache.has(agentId)) {
    return promptCache.get(agentId)!;
  }

  // Load from file
  const agentsDir = path.join(process.cwd(), 'agents');
  const promptPath = path.join(agentsDir, `${agentId}.md`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Agent prompt file not found: ${promptPath}`);
  }

  const promptContent = fs.readFileSync(promptPath, 'utf-8');

  // Add standard instructions for ExtractionField output format
  const fullPrompt = `${promptContent}

IMPORTANT: Return ALL fields as ExtractionField objects with this structure:
{
  "field_name": {
    "value": <actual value>,
    "confidence": <0.0-1.0 confidence score>,
    "evidence_pages": [<page numbers where found, 1-indexed>]
  }
}

Confidence Guidelines:
- 1.00: Exact text found, no ambiguity
- 0.95: Clear statement, standard format
- 0.90: Directly stated, minor variations
- 0.80: Clearly inferable from context
- 0.70: Multiple evidence pieces combined
- 0.60: Inferred from indirect evidence
- 0.50: Weak evidence, some uncertainty
- < 0.50: Set to null instead

Anti-Hallucination Rules:
1. If field not found in PDF → return null (not a guess)
2. Every non-null field MUST have evidence_pages
3. Confidence must reflect actual uncertainty
4. Extract exactly as written (no translations/additions)
5. Never assume missing data

Return valid JSON object with ALL target fields.`;

  // Cache and return
  promptCache.set(agentId, fullPrompt);
  return fullPrompt;
}

/**
 * Get all agent prompts
 *
 * @returns Map of agentId → prompt
 */
export function getAllAgentPrompts(): Map<AgentId, string> {
  const prompts = new Map<AgentId, string>();

  for (const agentId of ALL_AGENT_IDS) {
    prompts.set(agentId, getAgentPrompt(agentId));
  }

  return prompts;
}

/**
 * Clear prompt cache (useful for development/testing)
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
