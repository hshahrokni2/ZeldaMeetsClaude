/**
 * Extraction Workflow with LangGraph Orchestration
 *
 * Orchestrates the parallel execution of specialist agents:
 * 1. Section-Agent Routing: Maps document sections to relevant agents
 * 2. Image Slicing: Extracts page ranges for each agent
 * 3. Parallel Execution: Runs agents concurrently using multi-key pool
 * 4. Result Aggregation: Combines agent outputs into final schema
 * 5. Validation: Checks for missing/invalid fields
 *
 * Uses LangGraph for state management and dependency tracking.
 */

import type { AgentId } from './agent-prompts';
import { getAgentPrompt, AGENT_ROUTING_DESCRIPTIONS } from './agent-prompts';
import type { SectionMap } from './vision-sectionizer';
import type { ExtractionField } from './extraction-field-v1.0.0';
import { wrapAgentResponse } from './field-wrapper';
import { validateAgentResponse, formatValidationResult, type ValidationResult } from './field-validator';
import { routeSectionsToAgentsWithLLM } from './llm-orchestrator';
import { extractBRFId } from './brf-id-extractor';

/**
 * Repair truncated/malformed JSON from LLM responses
 *
 * Handles mid-field truncation by:
 * 1. Detecting unclosed strings (odd quote count)
 * 2. Removing incomplete fields
 * 3. Finding last complete object
 * 4. Closing unclosed arrays/braces
 *
 * Reuses logic from Phase 2HF-1 sectionizer repair.
 */
function repairTruncatedJSON(jsonText: string, context: string = 'Agent'): string {
  let repaired = jsonText;

  // Step 1: Handle mid-field truncation (most common case)
  // Pattern: {"field":"partial_val (truncated mid-value)

  // Find all unclosed strings by counting quotes
  const quotes = repaired.match(/"/g) || [];
  const hasUnclosedString = quotes.length % 2 === 1;

  if (hasUnclosedString) {
    console.warn(`[${context}] Detected unclosed string (mid-field truncation)`);

    // Find position of the last opening quote (start of incomplete value)
    const lastQuoteIndex = repaired.lastIndexOf('"');

    // Look backwards to find the field name before this incomplete value
    // Pattern: ,"field_name":"incomplete_val
    const beforeLastQuote = repaired.substring(0, lastQuoteIndex);
    const colonIndex = beforeLastQuote.lastIndexOf(':');

    if (colonIndex !== -1) {
      // Find the comma before the incomplete field
      const commaIndex = beforeLastQuote.lastIndexOf(',', colonIndex);

      if (commaIndex !== -1) {
        // Remove everything from the comma onwards (entire incomplete field)
        repaired = repaired.substring(0, commaIndex);
        console.warn(`[${context}] Removed incomplete field from position ${commaIndex}`);
      } else {
        // No comma means this is the first field in the object
        // Find the opening brace and keep only that
        const openBraceIndex = beforeLastQuote.lastIndexOf('{');
        if (openBraceIndex !== -1) {
          repaired = repaired.substring(0, openBraceIndex + 1);
          console.warn(`[${context}] Removed first incomplete field, keeping from position ${openBraceIndex}`);
        }
      }
    }
  }

  // Step 2: Find last complete object
  const lastCompleteObject = repaired.lastIndexOf('}');
  if (lastCompleteObject !== -1) {
    repaired = repaired.substring(0, lastCompleteObject + 1);
  }

  // Step 3: Close all unclosed arrays
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  const missingCloseBrackets = openBrackets - closeBrackets;
  if (missingCloseBrackets > 0) {
    repaired += ']'.repeat(missingCloseBrackets);
    console.warn(`[${context}] Added ${missingCloseBrackets} closing array bracket(s)`);
  }

  // Step 4: Close all unclosed objects
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const missingCloseBraces = openBraces - closeBraces;
  if (missingCloseBraces > 0) {
    repaired += '}'.repeat(missingCloseBraces);
    console.warn(`[${context}] Added ${missingCloseBraces} closing brace(s)`);
  }

  return repaired;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  // Input
  userId: string;
  pdfPath: string;
  images: string[]; // All page images (base64)
  sectionMap: SectionMap;
  agentsToRun: AgentId[];

  // Progress
  currentStep: string;
  completedAgents: AgentId[];
  failedAgents: Array<{ agentId: AgentId; error: string }>;
  agentResults: Record<AgentId, any>;

  // Costs & tokens
  totalTokens: number;
  totalCost: number;
  agentCosts: Record<AgentId, { tokens: number; cost: number }>;

  // Final output
  extractedData: Record<string, any>;
  metadata: {
    totalPages: number;
    successfulAgents: number;
    failedAgents: number;
    executionTime: number;

    // ⭐ Dual linkage fields (database integration)
    brfId?: string | null;                    // From filename: "brf_43334.pdf" → "43334"
    propertyDesignation?: string | null;      // From PDF: "Skytten 2" (95%+ gripendb linkage)
    brfName?: string | null;                  // From PDF: "BRF Husarvikens Brygga"
    city?: string | null;                     // From PDF: "Stockholm"

    // Linkage metadata (for quality tracking)
    linkageMetadata?: {
      brfId?: {
        value: string | null;
        source: string;                      // "filename"
        confidence: string;                  // "high" | "low"
        extractedFrom: string | null;        // Pattern matched
      };
      propertyDesignation?: {
        value: string | null;
        source: string;                      // "property_agent"
        confidence: number | null;           // Agent consensus confidence
      };
    };
  };
}

/**
 * Section-to-Agent routing rules
 *
 * Maps Swedish section titles to specialist agents.
 * Agents can be mapped to multiple sections.
 */
export const SECTION_AGENT_ROUTING: Record<string, AgentId[]> = {
  // Governance sections
  'Förvaltningsberättelse': ['chairman_agent', 'board_members_agent', 'property_agent', 'events_agent', 'leverantörer_agent'],
  'Styrelsen': ['chairman_agent', 'board_members_agent'],
  'Revisorer': ['auditor_agent'],

  // Financial statements
  'Resultaträkning': ['financial_agent', 'key_metrics_agent'],
  'Balansräkning': ['financial_agent', 'balance_sheet_agent', 'key_metrics_agent'],
  'Kassaflödesanalys': ['cashflow_agent'],

  // Notes
  'Noter': ['notes_depreciation_agent', 'notes_maintenance_agent', 'notes_tax_agent', 'loans_agent', 'operating_costs_agent'],
  'Tilläggsupplysningar': ['notes_depreciation_agent', 'notes_maintenance_agent', 'notes_tax_agent'],

  // Other sections
  'Revisionsberättelse': ['audit_report_agent'], // Renamed from audit_agent to avoid confusion
  'Energideklaration': ['energy_agent'],
  'Avgifter': ['fees_agent'],
  'Avsättningar': ['reserves_agent'],
};

/**
 * Route sections to agents
 *
 * Given the detected section map, determines which agents should run
 * and on which page ranges.
 *
 * @returns Map of agentId → page ranges to extract from
 */
export function routeSectionsToAgents(
  sectionMap: SectionMap,
  requestedAgents?: AgentId[]
): Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>> {
  const agentPageRanges: Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>> = {};

  // Process L1 sections first
  for (const section of sectionMap.level_1) {
    // Find matching routing rules (fuzzy match on section title)
    const matchingAgents: AgentId[] = [];

    for (const [sectionPattern, agents] of Object.entries(SECTION_AGENT_ROUTING)) {
      if (section.title.includes(sectionPattern) || sectionPattern.includes(section.title)) {
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

  // TODO: Process L2/L3 subsections for more granular routing

  // Fallback: If no sections matched, run all agents on full document
  if (Object.keys(agentPageRanges).length === 0 && requestedAgents) {
    console.warn('[Routing] No section matches found, running agents on full document');
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

/**
 * Extract page images for agent
 *
 * Slices the full image array to get only the pages needed for this agent.
 * Combines multiple page ranges if agent needs to look at multiple sections.
 *
 * @param allImages - All page images (1-indexed)
 * @param pageRanges - Page ranges to extract
 * @returns Array of base64 image strings
 */
export function extractAgentImages(
  allImages: string[],
  pageRanges: Array<{ startPage: number; endPage: number }>
): string[] {
  const agentImages: string[] = [];

  for (const range of pageRanges) {
    // Convert 1-indexed page numbers to 0-indexed array indices
    const startIdx = range.startPage - 1;
    const endIdx = range.endPage; // slice() is exclusive on end

    agentImages.push(...allImages.slice(startIdx, endIdx));
  }

  return agentImages;
}

/**
 * Execute single agent
 *
 * Calls the vision model with agent-specific prompt and page images.
 * Returns extracted JSON data.
 *
 * @param agentId - Agent to execute
 * @param images - Page images for this agent
 * @param userId - User ID (for multi-key pool selection)
 * @returns Extracted data from agent
 */
export async function executeAgent(
  agentId: AgentId,
  images: string[],
  userId: string,
  model?: string  // ✅ Add parameter instead of reading from env var
): Promise<{
  data: Record<string, ExtractionField<any>>;
  tokens: number;
  cost: number;
  validation: ValidationResult;
}> {
  console.log(`[Agent ${agentId}] Executing on ${images.length} pages for user ${userId}...`);

  // 1. Get agent prompt
  const agentPrompt = getAgentPrompt(agentId);

  // 2. Prepare multimodal content (text + images)
  const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];

  // Add agent prompt
  content.push({
    type: 'text',
    text: agentPrompt,
  });

  // Add page images
  for (const imageBase64 of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${imageBase64}`,
      },
    });
  }

  // 3. Call vision model using OpenRouter client
  const { OpenRouterClient } = await import('../openrouter-client');
  const client = new OpenRouterClient();

  // ✅ Use parameter instead of reading from env var (prevents race condition)
  const selectedModel = model || process.env.AGENT_MODEL || 'google/gemini-2.5-pro';

  const response = await client.chat(userId, {
    model: selectedModel,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_tokens: 8000, // Increased from 2048 to accommodate 10+ fields with ExtractionField wrappers
  });

  // 4. Parse JSON response (robust parsing with multiple strategies)
  let jsonText = response.choices[0].message.content.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let data: any;

  // Strategy 1: Direct parse
  try {
    data = JSON.parse(jsonText);
  } catch (e1) {
    // Strategy 2: Extract first complete JSON object using balanced braces
    try {
      let depth = 0;
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === '{') {
          if (depth === 0) startIndex = i;
          depth++;
        } else if (jsonText[i] === '}') {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            endIndex = i + 1;
            break;
          }
        }
      }

      if (startIndex !== -1 && endIndex !== -1) {
        const extracted = jsonText.substring(startIndex, endIndex);
        data = JSON.parse(extracted);
      } else {
        throw new Error('No valid JSON object found');
      }
    } catch (e2) {
      // Strategy 3: Try to fix common JSON errors (trailing commas, quotes)
      try {
        let fixed = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        fixed = fixed.replace(/'/g, '"'); // Fix single quotes
        data = JSON.parse(fixed);
      } catch (e3) {
        // Strategy 4: Apply JSON repair for truncated responses (reuse Phase 2HF-1 logic)
        console.warn(`[Agent ${agentId}] All parse attempts failed, trying JSON repair...`);
        try {
          const repaired = repairTruncatedJSON(jsonText, `Agent ${agentId}`);
          data = JSON.parse(repaired);
          console.warn(`[Agent ${agentId}] ✅ JSON repaired successfully! Salvaged ${Object.keys(data).length} fields`);
        } catch (e4) {
          console.error(`[Agent ${agentId}] Could not parse JSON even after repair:`, jsonText.substring(0, 500));
          throw new Error(`Agent ${agentId} returned invalid JSON that could not be repaired`);
        }
      }
    }
  }

  // 5. Wrap plain JSON in ExtractionField types with confidence + normalization
  const evidencePages = data.evidence_pages || [];
  const modelUsed = selectedModel;  // ✅ Use the model we actually called

  const wrappedData = wrapAgentResponse(data, {
    agentId,
    modelUsed,
    defaultEvidencePages: evidencePages,
  });

  // 6. Validate response (LENIENT mode - warn, don't block)
  const validationResult = validateAgentResponse(agentId, data, {
    strictMode: false, // Lenient by default
    allowNulls: true, // Nulls are valid
    requireEvidence: false, // Evidence is optional
  });

  // Log validation results (errors + warnings)
  if (!validationResult.valid || validationResult.warnings.length > 0) {
    console.log(formatValidationResult(validationResult, agentId));
  }

  // If CRITICAL errors exist, log them (but don't throw - graceful degradation)
  if (validationResult.errors.length > 0) {
    console.error(`[Agent ${agentId}] ⚠️  ${validationResult.errors.length} CRITICAL validation errors (continuing with partial data)`);
  }

  // 7. Track tokens and cost
  const tokens = response.usage?.total_tokens || 0;
  const cost = response.totalCost || 0;

  console.log(
    `[Agent ${agentId}] ✅ Extracted ${Object.keys(wrappedData).length} fields with confidence tracking (${tokens} tokens, $${cost.toFixed(4)}) - Validation: ${validationResult.valid ? '✅' : '⚠️'} (${validationResult.warnings.length} warnings)`
  );

  return {
    data: wrappedData,
    tokens,
    cost,
    validation: validationResult,
  };
}

/**
 * Execute all agents in parallel
 *
 * Uses multi-key pool to run agents concurrently without rate limiting.
 * Each agent gets its own OpenRouter key for true parallelism.
 *
 * @param state - Workflow state
 * @param groundTruth - Enable 3-model consensus (Gemini + GPT + Claude)
 * @returns Updated state with agent results
 */
export async function executeAgentsParallel(
  state: WorkflowState,
  groundTruth: boolean = false
): Promise<Partial<WorkflowState>> {
  console.log(`[Workflow] Executing agents in parallel ${groundTruth ? '(GROUND TRUTH MODE - 3 models)' : ''}...`);

  // 1. Route sections to agents using LLM orchestrator (Phase 2 HF-DIRECT-5)
  let agentRouting: Record<AgentId, Array<{ startPage: number; endPage: number; section: string }>>;

  try {
    // Try LLM-based semantic routing first
    agentRouting = await routeSectionsToAgentsWithLLM(state.sectionMap, state.agentsToRun, state.userId);
    console.log(`[Workflow] Routing: ${Object.keys(agentRouting).length} agents mapped to sections`);
  } catch (error) {
    console.error('[Workflow] LLM orchestrator failed, falling back to string matching:', error);
    // Fallback to string-based routing
    agentRouting = routeSectionsToAgents(state.sectionMap, state.agentsToRun);
    console.log(`[Workflow] Routing (fallback): ${Object.keys(agentRouting).length} agents mapped to sections`);
  }

  // 2. Execute agents in parallel
  const agentPromises = Object.entries(agentRouting).map(async ([agentId, pageRanges]) => {
    try {
      // Extract images for this agent
      const agentImages = extractAgentImages(state.images, pageRanges);

      // Execute agent (with ground truth if enabled)
      if (groundTruth) {
        const { executeAgentWithConsensus } = await import('./ground-truth-consensus');
        const consensusResult = await executeAgentWithConsensus(
          agentId as AgentId,
          agentImages,
          state.userId
        );

        return {
          agentId: agentId as AgentId,
          success: true,
          data: consensusResult.consensusData,
          tokens: consensusResult.tokensBreakdown.total,
          cost: consensusResult.costBreakdown.total,
          groundTruth: {
            fields: consensusResult.fields,
            overallConfidence: consensusResult.overallConfidence,
          },
        };
      } else {
        const result = await executeAgent(agentId as AgentId, agentImages, state.userId);

        return {
          agentId: agentId as AgentId,
          success: true,
          data: result.data,
          tokens: result.tokens,
          cost: result.cost,
        };
      }
    } catch (error: any) {
      console.error(`[Agent ${agentId}] Error:`, error.message);
      return {
        agentId: agentId as AgentId,
        success: false,
        error: error.message,
      };
    }
  });

  const results = await Promise.all(agentPromises);

  // 3. Aggregate results
  const agentResults: Record<AgentId, any> = {};
  const agentCosts: Record<AgentId, { tokens: number; cost: number }> = {};
  const completedAgents: AgentId[] = [];
  const failedAgents: Array<{ agentId: AgentId; error: string }> = [];
  let totalTokens = state.totalTokens;
  let totalCost = state.totalCost;

  // Collect ground truth consensus results (if in ground truth mode)
  const consensusResults: any[] = [];

  for (const result of results) {
    if (result.success) {
      agentResults[result.agentId] = result.data;
      agentCosts[result.agentId] = { tokens: result.tokens || 0, cost: result.cost || 0 };
      completedAgents.push(result.agentId);
      totalTokens += result.tokens || 0;
      totalCost += result.cost || 0;

      // Collect consensus data for JSONL export
      if (groundTruth && result.groundTruth) {
        consensusResults.push({
          agentId: result.agentId,
          fields: result.groundTruth.fields,
          overallConfidence: result.groundTruth.overallConfidence,
          costBreakdown: {
            gemini: 0, // Cost is aggregated, not per-model in this structure
            gpt: 0,
            claude: 0,
            total: result.cost || 0
          },
          tokensBreakdown: {
            gemini: 0,
            gpt: 0,
            claude: 0,
            total: result.tokens || 0
          }
        });
      }
    } else {
      failedAgents.push({ agentId: result.agentId, error: result.error || 'Unknown error' });
    }
  }

  console.log(`[Workflow] Completed ${completedAgents.length}/${results.length} agents successfully`);

  // 4. Export ground truth training data to JSONL (if in ground truth mode)
  if (groundTruth && consensusResults.length > 0) {
    try {
      const { exportGroundTruthToJsonl } = await import('./ground-truth-exporter');

      // Generate PDF ID from path
      const pdfId = state.pdfPath.split('/').pop()?.replace('.pdf', '') || 'unknown';

      // ⭐ Prepare dual linkage metadata for JSONL export
      const linkageData = state.metadata.linkageMetadata ? {
        brfId: state.metadata.brfId,
        brfName: state.metadata.brfName,
        propertyDesignation: state.metadata.propertyDesignation,
        city: state.metadata.city,
        zeldadbReady: !!state.metadata.brfId,
        gripendbReady: !!state.metadata.propertyDesignation,
        linkageSources: {
          brfId: state.metadata.linkageMetadata.brfId,
          propertyDesignation: state.metadata.linkageMetadata.propertyDesignation,
        }
      } : undefined;

      console.log(`[Workflow] Exporting ground truth to JSONL for ${consensusResults.length} agents...`);
      await exportGroundTruthToJsonl(consensusResults, pdfId, 'training_data', linkageData);
      console.log(`[Workflow] ✅ Ground truth training data exported to training_data/`);
    } catch (error: any) {
      console.error('[Workflow] Failed to export ground truth JSONL:', error.message);
      // Don't fail the whole extraction if export fails - just log it
    }
  }

  return {
    currentStep: 'agents_completed',
    completedAgents,
    failedAgents,
    agentResults,
    agentCosts,
    totalTokens,
    totalCost,
  };
}

/**
 * Aggregate agent results into final schema
 *
 * Combines all agent outputs into a single JSON object.
 * Handles field conflicts and missing data.
 *
 * @param state - Workflow state with agent results
 * @returns Final extracted data
 */
export function aggregateResults(state: WorkflowState): Record<string, any> {
  console.log('[Workflow] Aggregating agent results...');

  const aggregated: Record<string, any> = {};

  // Flatten all agent results into single object
  for (const [agentId, data] of Object.entries(state.agentResults)) {
    Object.assign(aggregated, data);
  }

  console.log(`[Workflow] Aggregated ${Object.keys(aggregated).length} fields from ${state.completedAgents.length} agents`);

  return aggregated;
}

/**
 * LangGraph workflow definition
 *
 * Orchestrates the extraction pipeline with state management.
 */
export const extractionWorkflow = {
  // State schema
  stateSchema: {} as WorkflowState,

  // Nodes (steps in the workflow)
  nodes: {
    route_agents: (state: WorkflowState) => ({
      currentStep: 'routing_agents',
    }),

    execute_agents: executeAgentsParallel,

    aggregate_results: (state: WorkflowState) => ({
      currentStep: 'aggregating_results',
      extractedData: aggregateResults(state),
    }),

    finalize: (state: WorkflowState) => ({
      currentStep: 'completed',
      metadata: {
        totalPages: state.images.length,
        successfulAgents: state.completedAgents.length,
        failedAgents: state.failedAgents.length,
        executionTime: 0, // Set by caller
      },
    }),
  },

  // Edges (transitions between nodes)
  edges: {
    route_agents: 'execute_agents',
    execute_agents: 'aggregate_results',
    aggregate_results: 'finalize',
  },
};

/**
 * Run extraction workflow
 *
 * Executes the complete extraction pipeline using LangGraph.
 *
 * @param initialState - Initial workflow state
 * @param options - Workflow options (groundTruth, etc.)
 * @returns Final workflow state with extracted data
 */
export async function runExtractionWorkflow(
  initialState: Omit<WorkflowState, 'currentStep' | 'completedAgents' | 'failedAgents' | 'agentResults' | 'totalTokens' | 'totalCost' | 'agentCosts' | 'extractedData' | 'metadata'>,
  options: { groundTruth?: boolean } = {}
): Promise<WorkflowState> {
  console.log(`[Workflow] Starting extraction workflow ${options.groundTruth ? '(GROUND TRUTH MODE)' : ''}...`);

  // ⭐ TIER 1 LINKAGE: Extract BRF ID from filename (zero cost, instant, 100% reliable)
  const brfIdResult = extractBRFId(initialState.pdfPath);
  if (brfIdResult.brfId) {
    console.log(`[Workflow] ⭐ BRF ID extracted: ${brfIdResult.brfId} (confidence: ${brfIdResult.confidence}, source: ${brfIdResult.extractedFrom})`);
  } else {
    console.warn(`[Workflow] ⚠️  No BRF ID found in filename: ${initialState.pdfPath}`);
  }

  // Initialize state
  let state: WorkflowState = {
    ...initialState,
    currentStep: 'initializing',
    completedAgents: [],
    failedAgents: [],
    agentResults: {},
    totalTokens: 0,
    totalCost: 0,
    agentCosts: {},
    extractedData: {},
    metadata: {
      totalPages: 0,
      successfulAgents: 0,
      failedAgents: 0,
      executionTime: 0,
    },
  };

  const startTime = Date.now();

  try {
    // Execute workflow nodes sequentially
    // Note: execute_agents node gets special handling for groundTruth
    for (const [nodeName, nodeFunc] of Object.entries(extractionWorkflow.nodes)) {
      console.log(`[Workflow] Executing node: ${nodeName}`);

      // Pass groundTruth flag to execute_agents node
      const updates = nodeName === 'execute_agents'
        ? await executeAgentsParallel(state, options.groundTruth || false)
        : await nodeFunc(state);

      state = { ...state, ...updates };
    }

    // Update execution time
    state.metadata.executionTime = Date.now() - startTime;

    // ⭐ TIER 2 LINKAGE: Aggregate property data from property_agent results
    const propertyAgentResult = state.agentResults['property_agent'];
    const propertyDesignation = propertyAgentResult?.property_designation || null;
    const city = propertyAgentResult?.city || null;
    const brfName = propertyAgentResult?.address || null; // Best proxy we have for now

    // Add linkage metadata to state
    state.metadata.brfId = brfIdResult.brfId;
    state.metadata.propertyDesignation = propertyDesignation;
    state.metadata.brfName = brfName;
    state.metadata.city = city;

    state.metadata.linkageMetadata = {
      brfId: {
        value: brfIdResult.brfId,
        source: brfIdResult.source,
        confidence: brfIdResult.confidence,
        extractedFrom: brfIdResult.extractedFrom,
      },
      propertyDesignation: {
        value: propertyDesignation,
        source: 'property_agent',
        confidence: propertyAgentResult?.confidence || null,
      },
    };

    // Log linkage summary
    console.log(`[Workflow] ⭐ Linkage Summary:`);
    console.log(`  - BRF ID: ${brfIdResult.brfId || 'not found'}`);
    console.log(`  - Property Designation: ${propertyDesignation || 'not found'} ${propertyDesignation ? '(95%+ gripendb linkage)' : ''}`);
    console.log(`  - City: ${city || 'not found'}`);
    console.log(`  - zeldadb ready: ${!!brfIdResult.brfId}`);
    console.log(`  - gripendb ready: ${!!propertyDesignation}`);

    console.log(`[Workflow] Completed in ${state.metadata.executionTime}ms`);
    console.log(`[Workflow] Results: ${state.completedAgents.length} successful, ${state.failedAgents.length} failed`);

    return state;

  } catch (error: any) {
    console.error('[Workflow] Fatal error:', error);
    throw error;
  }
}
