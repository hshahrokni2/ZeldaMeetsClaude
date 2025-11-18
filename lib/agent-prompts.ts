/**
 * Agent Prompts and Routing Definitions
 *
 * Centralized management of 19 specialist agent prompts.
 * Each agent extracts specific fields from BRF annual reports.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  | 'key_metrics_agent'
  | 'leverantörer_agent';

export const ALL_AGENT_IDS: AgentId[] = [
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
  'key_metrics_agent',
  'leverantörer_agent',
];

/**
 * Agent routing descriptions for LLM-based section routing
 */
export const AGENT_ROUTING_DESCRIPTIONS: Record<AgentId, string[]> = {
  chairman_agent: ['Styrelseordförande', 'Ordförande', 'Styrelse', 'Förvaltning'],
  board_members_agent: ['Styrelse', 'Styrelsemöten', 'Ledamöter', 'Suppleanter'],
  auditor_agent: ['Revisor', 'Revision', 'Auktoriserad revisor'],
  financial_agent: [
    'Resultaträkning',
    'Intäkter',
    'Kostnader',
    'Nettoomsättning',
    'Årets resultat',
    'Rörelseresultat',
  ],
  balance_sheet_agent: [
    'Balansräkning',
    'Tillgångar',
    'Skulder',
    'Eget kapital',
    'Anläggningstillgångar',
    'Omsättningstillgångar',
  ],
  cashflow_agent: ['Kassaflödesanalys', 'Kassaflöde', 'Likvida medel'],
  property_agent: [
    'Fastighet',
    'Byggnad',
    'Energiklass',
    'Uppvärmning',
    'Byggnadsår',
    'Fastighetsbeteckning',
  ],
  fees_agent: ['Årsavgift', 'Avgift', 'Månadsavgift', 'Hyresavgift'],
  operational_agent: ['Drift', 'Driftskostnader', 'Underhåll', 'Förvaltning'],
  notes_depreciation_agent: ['Avskrivningar', 'Avskrivning', 'Noter'],
  notes_maintenance_agent: ['Underhållskostnader', 'Reparationer', 'Underhåll', 'Noter'],
  notes_tax_agent: ['Skatter', 'Inkomstskatt', 'Skatt', 'Noter'],
  events_agent: ['Händelser', 'Väsentliga händelser', 'Efter räkenskapsårets slut'],
  audit_report_agent: ['Revisionsberättelse', 'Revisorernas berättelse'],
  loans_agent: ['Lån', 'Skulder', 'Räntebärande skulder', 'Banklån'],
  reserves_agent: ['Reservfond', 'Fond', 'Fonder', 'Bundet eget kapital'],
  energy_agent: ['Energi', 'El', 'Fjärrvärme', 'Energikostnader'],
  key_metrics_agent: ['Nyckeltal', 'Flerårsöversikt', 'Sammanfattning'],
  leverantörer_agent: ['Leverantörer', 'Styrelsen', 'Firmateckning'],
};

/**
 * Get agent prompt from markdown file
 *
 * @param agentId - Agent identifier
 * @returns Full prompt text from agent markdown file
 */
export function getAgentPrompt(agentId: AgentId): string {
  try {
    const agentFilePath = path.join(process.cwd(), 'agents', `${agentId}.md`);
    const promptText = fs.readFileSync(agentFilePath, 'utf-8');
    return promptText;
  } catch (error) {
    console.error(`[Agent Prompts] Failed to load prompt for ${agentId}:`, error);
    return `# ${agentId}\n\nExtract relevant fields for ${agentId}.`;
  }
}

/**
 * Get all agent prompts
 *
 * @returns Map of agent ID to prompt text
 */
export function getAllAgentPrompts(): Record<AgentId, string> {
  const prompts: Partial<Record<AgentId, string>> = {};
  for (const agentId of ALL_AGENT_IDS) {
    prompts[agentId] = getAgentPrompt(agentId);
  }
  return prompts as Record<AgentId, string>;
}

/**
 * Get agent routing keywords
 *
 * @param agentId - Agent identifier
 * @returns List of Swedish keywords for routing
 */
export function getAgentKeywords(agentId: AgentId): string[] {
  return AGENT_ROUTING_DESCRIPTIONS[agentId] || [];
}
