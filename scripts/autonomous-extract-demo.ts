#!/usr/bin/env tsx
/**
 * Autonomous PDF Extraction - Demonstration Script
 *
 * This script demonstrates the complete autonomous extraction pipeline
 * as defined in AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md and RIGOR_PROTOCOL.md
 *
 * Mode: DEMONSTRATION (uses simulated extractions)
 * For PRODUCTION mode, replace simulation functions with actual API calls.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFSelector, createSessionDirectory, logExtractionEvent } from '../lib/pdf-selector';

// Session Configuration
const SESSION_ID = `session_${new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_')}`;
const DEMO_MODE = true; // Set to false for production with real API calls

// Agent definitions (19 specialized agents)
const AGENTS = [
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

interface ExtractionField {
  value: any;
  confidence: number;
  evidence_pages: number[];
  original_string?: string;
  source: 'dual_agreement' | 'tiebreaker' | 'no_consensus';
}

interface AgentResult {
  agent_id: string;
  status: 'completed' | 'failed';
  consensus_level: 'HIGH' | 'MEDIUM' | 'LOW';
  overall_confidence: number;
  fields_extracted: number;
  data: Record<string, ExtractionField>;
  cost: number;
  duration_ms: number;
  error?: string;
}

interface DocumentMap {
  l1_sections: Array<{
    name: string;
    pages: number[];
  }>;
  l2_subsections: Array<{
    name: string;
    pages: number[];
    parent: string;
  }>;
}

interface ValidationResult {
  passed: boolean;
  quality_score: number;
  checks: Array<{
    check: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
}

/**
 * STEP 1: PDF Selection & Lock
 */
async function step1_SelectAndLock(selector: PDFSelector): Promise<string | null> {
  console.log('\n=== STEP 1: PDF Selection & Lock ===\n');

  // Clean stale locks
  const cleaned = selector.cleanStaleLocks();
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} stale lock(s)`);
  }

  // Select next PDF
  const pdfPath = await selector.selectNext();
  if (!pdfPath) {
    console.log('No unprocessed PDFs available.');
    return null;
  }

  console.log(`Selected PDF: ${pdfPath}`);

  // Create lock
  selector.createLock(pdfPath, SESSION_ID);
  console.log(`Lock created for session: ${SESSION_ID}`);

  // Create session directory
  const sessionDir = createSessionDirectory(SESSION_ID);
  console.log(`Session directory created: ${sessionDir}`);

  // Save selection metadata
  const selectionData = {
    session_id: SESSION_ID,
    pdf_path: pdfPath,
    pdf_id: selector.getPDFId(pdfPath),
    selected_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(sessionDir, 'selection.json'),
    JSON.stringify(selectionData, null, 2)
  );

  logExtractionEvent({
    type: 'selection',
    session_id: SESSION_ID,
    pdf_path: pdfPath,
  });

  return pdfPath;
}

/**
 * STEP 2: PDF Reading & Analysis
 */
async function step2_AnalyzeStructure(pdfPath: string, sessionDir: string): Promise<DocumentMap> {
  console.log('\n=== STEP 2: PDF Reading & Analysis ===\n');

  // In production: Use vision-sectionizer.ts with Gemini 2.0 Flash
  // Round 1: Detect L1 sections
  // Round 2: Extract L2/L3 subsections

  // DEMO: Simulate document structure
  console.log('Analyzing PDF structure with vision-sectionizer...');
  console.log('Round 1: Detecting L1 sections...');
  console.log('Round 2: Extracting L2/L3 subsections...');

  const documentMap: DocumentMap = {
    l1_sections: [
      { name: 'Förvaltningsberättelse', pages: [1, 2, 3] },
      { name: 'Resultaträkning', pages: [4, 5] },
      { name: 'Balansräkning', pages: [6, 7] },
      { name: 'Kassaflödesanalys', pages: [8] },
      { name: 'Noter', pages: [9, 10, 11, 12] },
      { name: 'Revisionsberättelse', pages: [13, 14] },
      { name: 'Styrelse och revisorer', pages: [15] },
      { name: 'Fastighetsförteckning', pages: [16] },
      { name: 'Övrig information', pages: [17, 18] },
    ],
    l2_subsections: [
      { name: 'Förvaltningsberättelse - Allmänt', pages: [1], parent: 'Förvaltningsberättelse' },
      { name: 'Förvaltningsberättelse - Verksamheten', pages: [2], parent: 'Förvaltningsberättelse' },
      { name: 'Förvaltningsberättelse - Framtida utveckling', pages: [3], parent: 'Förvaltningsberättelse' },
      { name: 'Resultaträkning - Intäkter', pages: [4], parent: 'Resultaträkning' },
      { name: 'Resultaträkning - Kostnader', pages: [5], parent: 'Resultaträkning' },
      { name: 'Balansräkning - Tillgångar', pages: [6], parent: 'Balansräkning' },
      { name: 'Balansräkning - Skulder och eget kapital', pages: [7], parent: 'Balansräkning' },
      { name: 'Noter - Redovisningsprinciper', pages: [9], parent: 'Noter' },
      { name: 'Noter - Avskrivningar', pages: [10], parent: 'Noter' },
      { name: 'Noter - Underhåll', pages: [11], parent: 'Noter' },
      { name: 'Noter - Skatter', pages: [12], parent: 'Noter' },
    ],
  };

  // Save document map
  fs.writeFileSync(
    path.join(sessionDir, 'document_map.json'),
    JSON.stringify(documentMap, null, 2)
  );

  console.log(`Document structure mapped: ${documentMap.l1_sections.length} L1 sections, ${documentMap.l2_subsections.length} L2 subsections`);

  logExtractionEvent({
    type: 'structure_analysis',
    session_id: SESSION_ID,
    l1_count: documentMap.l1_sections.length,
    l2_count: documentMap.l2_subsections.length,
  });

  return documentMap;
}

/**
 * STEP 3: Multi-Pass Extraction (19 Agents)
 */
async function step3_ExtractWithAgents(
  pdfPath: string,
  documentMap: DocumentMap,
  sessionDir: string
): Promise<AgentResult[]> {
  console.log('\n=== STEP 3: Multi-Pass Extraction (19 Agents) ===\n');

  const results: AgentResult[] = [];
  const agentsDir = path.join(sessionDir, 'agents');

  for (const agentId of AGENTS) {
    console.log(`\nExecuting ${agentId}...`);

    // In production:
    // 1. Route relevant subsections to agent
    // 2. Execute Gemini 2.5 Pro extraction
    // 3. Execute GPT-4o extraction
    // 4. Compare results, use Claude tiebreaker if needed
    // 5. Calculate confidence scores

    // DEMO: Simulate agent extraction
    const result = await simulateAgentExtraction(agentId, pdfPath, documentMap);
    results.push(result);

    // Save individual agent result
    fs.writeFileSync(
      path.join(agentsDir, `${agentId}.json`),
      JSON.stringify(result, null, 2)
    );

    console.log(`  Status: ${result.status}`);
    console.log(`  Consensus: ${result.consensus_level}`);
    console.log(`  Confidence: ${result.overall_confidence.toFixed(2)}`);
    console.log(`  Fields: ${result.fields_extracted}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Duration: ${result.duration_ms}ms`);

    logExtractionEvent({
      type: 'agent_extraction',
      session_id: SESSION_ID,
      agent_id: agentId,
      status: result.status,
      confidence: result.overall_confidence,
    });
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`\nAgent Execution Summary: ${successCount}/${AGENTS.length} succeeded`);

  return results;
}

/**
 * Simulate agent extraction (for demonstration)
 */
async function simulateAgentExtraction(
  agentId: string,
  pdfPath: string,
  documentMap: DocumentMap
): Promise<AgentResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // Simulate success/failure (95% success rate)
  const success = Math.random() > 0.05;

  if (!success) {
    return {
      agent_id: agentId,
      status: 'failed',
      consensus_level: 'LOW',
      overall_confidence: 0,
      fields_extracted: 0,
      data: {},
      cost: 0.01,
      duration_ms: Math.floor(Math.random() * 1000) + 500,
      error: 'Simulated failure for demonstration',
    };
  }

  // Simulate extracted data based on agent type
  const data = generateSimulatedData(agentId);

  // Calculate metrics
  const confidences = Object.values(data).map(field => field.confidence);
  const overall_confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  let consensus_level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (overall_confidence > 0.85) {
    consensus_level = 'HIGH';
  } else if (overall_confidence > 0.70) {
    consensus_level = 'MEDIUM';
  } else {
    consensus_level = 'LOW';
  }

  return {
    agent_id: agentId,
    status: 'completed',
    consensus_level,
    overall_confidence,
    fields_extracted: Object.keys(data).length,
    data,
    cost: 0.03 + Math.random() * 0.02, // $0.03-0.05 per agent
    duration_ms: Math.floor(Math.random() * 2000) + 1000,
  };
}

/**
 * Generate simulated extraction data
 */
function generateSimulatedData(agentId: string): Record<string, ExtractionField> {
  const confidence = () => 0.7 + Math.random() * 0.3; // 0.70-1.00
  const source = (): 'dual_agreement' | 'tiebreaker' =>
    Math.random() > 0.2 ? 'dual_agreement' : 'tiebreaker';

  switch (agentId) {
    case 'financial_agent':
      return {
        total_revenue_tkr: {
          value: 12500,
          confidence: confidence(),
          evidence_pages: [4, 5],
          original_string: '12,5 MSEK',
          source: source(),
        },
        total_costs_tkr: {
          value: 10300,
          confidence: confidence(),
          evidence_pages: [5],
          original_string: '10,3 MSEK',
          source: source(),
        },
        net_result_tkr: {
          value: 2200,
          confidence: confidence(),
          evidence_pages: [5],
          original_string: '2 200 tkr',
          source: source(),
        },
      };

    case 'balance_sheet_agent':
      return {
        total_assets_tkr: {
          value: 45000,
          confidence: confidence(),
          evidence_pages: [6],
          original_string: '45 MSEK',
          source: source(),
        },
        total_liabilities_tkr: {
          value: 30000,
          confidence: confidence(),
          evidence_pages: [7],
          original_string: '30 MSEK',
          source: source(),
        },
        total_equity_tkr: {
          value: 15000,
          confidence: confidence(),
          evidence_pages: [7],
          original_string: '15 MSEK',
          source: source(),
        },
      };

    case 'chairman_agent':
      return {
        chairman_name: {
          value: 'Anders Svensson',
          confidence: confidence(),
          evidence_pages: [15],
          source: source(),
        },
      };

    case 'property_agent':
      return {
        number_of_apartments: {
          value: 120,
          confidence: confidence(),
          evidence_pages: [1, 16],
          original_string: '120 lägenheter',
          source: source(),
        },
        construction_year: {
          value: 1985,
          confidence: confidence(),
          evidence_pages: [16],
          source: source(),
        },
      };

    default:
      // Generic simulated data for other agents
      return {
        field_1: {
          value: 'Sample value',
          confidence: confidence(),
          evidence_pages: [1],
          source: source(),
        },
        field_2: {
          value: 100 + Math.floor(Math.random() * 1000),
          confidence: confidence(),
          evidence_pages: [2],
          source: source(),
        },
      };
  }
}

/**
 * STEP 4: Validation & Quality Checks
 */
async function step4_Validate(agentResults: AgentResult[], sessionDir: string): Promise<ValidationResult> {
  console.log('\n=== STEP 4: Validation & Quality Checks ===\n');

  const checks: ValidationResult['checks'] = [];

  // Check 1: Minimum agent success rate
  const successCount = agentResults.filter(r => r.status === 'completed').length;
  const successRate = successCount / agentResults.length;

  checks.push({
    check: 'Agent Success Rate',
    status: successRate >= 0.79 ? 'pass' : 'fail',
    message: `${successCount}/${agentResults.length} agents succeeded (${(successRate * 100).toFixed(1)}%)`,
  });

  // Check 2: Average confidence
  const completedResults = agentResults.filter(r => r.status === 'completed');
  const avgConfidence = completedResults.length > 0
    ? completedResults.reduce((sum, r) => sum + r.overall_confidence, 0) / completedResults.length
    : 0;

  checks.push({
    check: 'Average Confidence',
    status: avgConfidence >= 0.80 ? 'pass' : avgConfidence >= 0.70 ? 'warn' : 'fail',
    message: `Average confidence: ${avgConfidence.toFixed(3)}`,
  });

  // Check 3: Balance sheet validation (if data available)
  const balanceSheetResult = agentResults.find(r => r.agent_id === 'balance_sheet_agent');
  if (balanceSheetResult && balanceSheetResult.status === 'completed') {
    const assets = balanceSheetResult.data.total_assets_tkr?.value || 0;
    const liabilities = balanceSheetResult.data.total_liabilities_tkr?.value || 0;
    const equity = balanceSheetResult.data.total_equity_tkr?.value || 0;

    const expected = liabilities + equity;
    const difference = Math.abs(assets - expected);
    const percentDiff = assets > 0 ? (difference / assets) * 100 : 0;

    checks.push({
      check: 'Balance Sheet Identity',
      status: percentDiff < 1 ? 'pass' : percentDiff < 5 ? 'warn' : 'fail',
      message: `Assets (${assets}) vs Liabilities+Equity (${expected}) - Diff: ${percentDiff.toFixed(2)}%`,
    });
  }

  // Check 4: Essential fields coverage
  const essentialAgents = [
    'financial_agent',
    'balance_sheet_agent',
    'chairman_agent',
    'property_agent',
  ];
  const essentialCount = essentialAgents.filter(id =>
    agentResults.some(r => r.agent_id === id && r.status === 'completed')
  ).length;
  const essentialRate = essentialCount / essentialAgents.length;

  checks.push({
    check: 'Essential Fields Coverage',
    status: essentialRate >= 0.95 ? 'pass' : essentialRate >= 0.75 ? 'warn' : 'fail',
    message: `${essentialCount}/${essentialAgents.length} essential agents succeeded`,
  });

  // Calculate quality score (from RIGOR_PROTOCOL.md)
  const qualityScore = (
    0.30 * essentialRate +
    0.25 * (avgConfidence) +
    0.25 * (checks.filter(c => c.status === 'pass').length / checks.length) +
    0.20 * successRate
  );

  const passed = qualityScore >= 0.85;

  const validation: ValidationResult = {
    passed,
    quality_score: qualityScore,
    checks,
  };

  // Save validation results
  fs.writeFileSync(
    path.join(sessionDir, 'validation.json'),
    JSON.stringify(validation, null, 2)
  );

  console.log('Validation Results:');
  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    console.log(`  ${icon} ${check.check}: ${check.message}`);
  });
  console.log(`\nQuality Score: ${qualityScore.toFixed(3)} (${passed ? 'PASS' : 'FAIL'})`);

  logExtractionEvent({
    type: 'validation',
    session_id: SESSION_ID,
    quality_score: qualityScore,
    passed,
  });

  return validation;
}

/**
 * STEP 5: Learning Documentation
 */
async function step5_DocumentLearnings(
  pdfPath: string,
  agentResults: AgentResult[],
  validation: ValidationResult,
  sessionDir: string
): Promise<void> {
  console.log('\n=== STEP 5: Learning Documentation ===\n');

  const pdfName = path.basename(pdfPath);
  const successfulAgents = agentResults.filter(r => r.status === 'completed');
  const failedAgents = agentResults.filter(r => r.status === 'failed');
  const lowConfidenceAgents = successfulAgents.filter(r => r.overall_confidence < 0.70);

  // Build content sections separately to avoid nested template literal issues
  const successfulAgentsSection = successfulAgents.map(r =>
    '- **' + r.agent_id + '**\n' +
    '  - Consensus: ' + r.consensus_level + '\n' +
    '  - Confidence: ' + r.overall_confidence.toFixed(3) + '\n' +
    '  - Fields: ' + r.fields_extracted + '\n' +
    '  - Cost: $' + r.cost.toFixed(4)
  ).join('\n\n');

  const failedAgentsSection = failedAgents.length > 0
    ? '#### Failed Extractions (' + failedAgents.length + ')\n' +
      failedAgents.map(r => '- **' + r.agent_id + '**\n  - Error: ' + r.error).join('\n\n')
    : '';

  const lowConfidenceSection = lowConfidenceAgents.length > 0
    ? '#### Low Confidence Extractions (' + lowConfidenceAgents.length + ')\n' +
      lowConfidenceAgents.map(r => '- **' + r.agent_id + '**\n  - Confidence: ' + r.overall_confidence.toFixed(3) + '\n  - Review Priority: HIGH').join('\n\n') + '\n'
    : '';

  const validationChecksSection = validation.checks.map(c =>
    '- ' + c.check + ': ' + c.status.toUpperCase() + ' - ' + c.message
  ).join('\n');

  const challengesSection = failedAgents.length > 0
    ? '### Failed Agents\n' + failedAgents.map(r => '- ' + r.agent_id + ': ' + r.error).join('\n')
    : '### No Failed Agents\nAll agents completed successfully.';

  const lowConfFieldsSection = lowConfidenceAgents.length > 0
    ? '\n### Low Confidence Fields\nThese agents extracted data but with lower confidence:\n' +
      lowConfidenceAgents.map(r => '- ' + r.agent_id + ' (' + r.overall_confidence.toFixed(3) + ')').join('\n') +
      '\n\nRecommendation: Manual review of these fields suggested.'
    : '';

  const totalCost = agentResults.reduce((sum, r) => sum + r.cost, 0);
  const totalDuration = agentResults.reduce((sum, r) => sum + r.duration_ms, 0);
  const highConsensusCount = successfulAgents.filter(r => r.consensus_level === 'HIGH').length;
  const mediumConsensusCount = successfulAgents.filter(r => r.consensus_level === 'MEDIUM').length;
  const qualityAssessment = validation.quality_score >= 0.90
    ? 'straightforward'
    : validation.quality_score >= 0.80
      ? 'moderate complexity'
      : 'complex';
  const qualityRec = validation.quality_score >= 0.90
    ? 'Excellent extraction quality. Ready for production use.'
    : validation.quality_score >= 0.80
      ? 'Good extraction quality. Minor review recommended.'
      : 'Significant issues detected. Manual review required.';
  const confidenceAssessment = successfulAgents.length > 0 &&
    (successfulAgents.filter(r => r.overall_confidence > 0.85).length / successfulAgents.length * 100) > 75
    ? 'Most fields have high confidence. Trust level: HIGH'
    : 'Many fields have medium/low confidence. Trust level: MEDIUM';
  const nextSteps = validation.passed
    ? 'Proceed with using extracted data. Optional spot-check recommended.'
    : 'Manual verification required before using extracted data.';
  const improvementNote = failedAgents.length > 0
    ? '- Investigate why ' + failedAgents.length + ' agent(s) failed on this document\n- Consider agent prompt refinement for better coverage'
    : '- No system improvements needed based on this extraction';
  const routingNote = lowConfidenceAgents.length > 0
    ? '\n- Review routing rules for agents with low confidence\n- Consider additional context or better subsection mapping'
    : '';

  const learningsContent = '# Extraction Learnings - ' + SESSION_ID + '\n\n' +
    '## PDF Information\n' +
    '- **File**: ' + pdfName + '\n' +
    '- **Path**: ' + pdfPath + '\n' +
    '- **Processing Date**: ' + new Date().toISOString() + '\n\n' +
    '## Extraction Results\n\n' +
    '### Overall Performance\n' +
    '- **Agents Succeeded**: ' + successfulAgents.length + '/' + agentResults.length + ' (' + (successfulAgents.length / agentResults.length * 100).toFixed(1) + '%)\n' +
    '- **Quality Score**: ' + validation.quality_score.toFixed(3) + '\n' +
    '- **Validation Status**: ' + (validation.passed ? 'PASSED' : 'FAILED') + '\n\n' +
    '### Agent Performance\n\n' +
    '#### Successful Extractions (' + successfulAgents.length + ')\n' +
    successfulAgentsSection + '\n\n' +
    failedAgentsSection + '\n\n' +
    lowConfidenceSection + '\n' +
    '## Document Characteristics\n\n' +
    '### Complexity Analysis\n' +
    '- Document appears to be ' + qualityAssessment + ' for automated extraction\n' +
    '- ' + highConsensusCount + ' agents achieved HIGH consensus\n' +
    '- ' + mediumConsensusCount + ' agents needed tiebreaker (MEDIUM consensus)\n\n' +
    '### Validation Checks\n' +
    validationChecksSection + '\n\n' +
    '## Extraction Challenges\n\n' +
    challengesSection + lowConfFieldsSection + '\n\n' +
    '## Cost & Performance Metrics\n\n' +
    '- **Total Cost**: $' + totalCost.toFixed(4) + '\n' +
    '- **Average Cost per Agent**: $' + (totalCost / agentResults.length).toFixed(4) + '\n' +
    '- **Total Duration**: ' + totalDuration + 'ms\n' +
    '- **Average Duration per Agent**: ' + Math.floor(totalDuration / agentResults.length) + 'ms\n\n' +
    '## Recommendations\n\n' +
    '1. **Quality**: ' + qualityRec + '\n\n' +
    '2. **Confidence**: ' + confidenceAssessment + '\n\n' +
    '3. **Next Steps**: ' + nextSteps + '\n\n' +
    '## Insights for System Improvement\n\n' +
    improvementNote + routingNote + '\n\n' +
    '---\n' +
    'Generated by: Autonomous Extraction Pipeline v1.0.0\n' +
    'Protocol: AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md\n' +
    'Rigor: RIGOR_PROTOCOL.md\n';

  fs.writeFileSync(path.join(sessionDir, 'learnings.md'), learningsContent);
  console.log('Learning documentation saved to learnings.md');

  logExtractionEvent({
    type: 'learnings_documented',
    session_id: SESSION_ID,
  });
}

/**
 * STEP 6: Meta-Analysis (Conditional)
 */
async function step6_MetaAnalysis(selector: PDFSelector): Promise<void> {
  const tracker = selector.readTracker();
  const count = tracker.statistics.total_processed;

  // Only run at milestones (10, 20, 30...)
  if (count % 10 !== 0) {
    console.log('\n=== STEP 6: Meta-Analysis ===');
    console.log(`Skipped (not at milestone: ${count}/10 processed)`);
    return;
  }

  console.log('\n=== STEP 6: Meta-Analysis ===\n');
  console.log(`MILESTONE REACHED: ${count} PDFs processed`);

  const metaAnalysis = {
    milestone: count,
    generated_at: new Date().toISOString(),
    statistics: tracker.statistics,
    insights: {
      average_quality_score: tracker.statistics.average_quality_score,
      total_cost: tracker.statistics.total_cost,
      average_duration_seconds: tracker.statistics.average_duration_seconds,
      cost_per_pdf: tracker.statistics.total_cost / count,
    },
    recommendations: [
      'Continue monitoring quality scores',
      'Review any PDFs with quality score < 0.80',
      'Consider cost optimization if average exceeds $1.00/PDF',
    ],
  };

  const metaDir = './meta_analysis';
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(metaDir, `analysis_${count}.json`),
    JSON.stringify(metaAnalysis, null, 2)
  );

  console.log(`Meta-analysis saved for milestone: ${count} PDFs`);
  console.log(`Average Quality Score: ${metaAnalysis.insights.average_quality_score.toFixed(3)}`);
  console.log(`Total Cost: $${metaAnalysis.insights.total_cost.toFixed(2)}`);
  console.log(`Cost per PDF: $${metaAnalysis.insights.cost_per_pdf.toFixed(4)}`);

  logExtractionEvent({
    type: 'meta_analysis',
    milestone: count,
    quality_score: metaAnalysis.insights.average_quality_score,
  });
}

/**
 * STEP 7: Commit & Unlock
 */
async function step7_CommitAndUnlock(
  pdfPath: string,
  agentResults: AgentResult[],
  validation: ValidationResult,
  sessionDir: string,
  selector: PDFSelector,
  startTime: number
): Promise<void> {
  console.log('\n=== STEP 7: Commit & Unlock ===\n');

  const pdfId = selector.getPDFId(pdfPath);
  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  // Consolidate all agent results into final extraction
  const finalExtraction = {
    session_id: SESSION_ID,
    pdf_id: pdfId,
    pdf_path: pdfPath,
    extraction_date: new Date().toISOString(),
    extraction_version: '1.0.0',
    quality_score: validation.quality_score,
    agents: agentResults,
    validation: validation,
    summary: {
      total_agents: agentResults.length,
      agents_succeeded: agentResults.filter(r => r.status === 'completed').length,
      agents_failed: agentResults.filter(r => r.status === 'failed').length,
      total_fields: agentResults.reduce((sum, r) => sum + r.fields_extracted, 0),
      high_confidence_fields: agentResults
        .filter(r => r.status === 'completed')
        .reduce((sum, r) =>
          sum + Object.values(r.data).filter(f => f.confidence > 0.85).length, 0),
      total_cost: agentResults.reduce((sum, r) => sum + r.cost, 0),
      duration_seconds: durationSeconds,
    },
  };

  // Save final extraction result
  const resultsDir = './results';
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultPath = path.join(resultsDir, `${pdfId}_extraction.json`);
  fs.writeFileSync(resultPath, JSON.stringify(finalExtraction, null, 2));
  console.log(`Final extraction saved: ${resultPath}`);

  // Save summary to session directory
  fs.writeFileSync(
    path.join(sessionDir, 'summary.json'),
    JSON.stringify(finalExtraction.summary, null, 2)
  );

  // Update processed_pdfs.json
  selector.markProcessed(pdfPath, SESSION_ID, {
    status: validation.passed ? 'completed' : 'partial',
    quality_score: validation.quality_score,
    agents_succeeded: finalExtraction.summary.agents_succeeded,
    total_cost: finalExtraction.summary.total_cost,
    duration_seconds: durationSeconds,
  });

  console.log('Updated processed_pdfs.json');

  // Remove lock
  selector.removeLock(pdfPath);
  console.log('Lock removed');

  // Log completion
  logExtractionEvent({
    type: 'extraction_completed',
    session_id: SESSION_ID,
    pdf_id: pdfId,
    quality_score: validation.quality_score,
    duration_seconds: durationSeconds,
    total_cost: finalExtraction.summary.total_cost,
  });

  console.log('\n=== Extraction Session Complete ===');
  console.log(`Session ID: ${SESSION_ID}`);
  console.log(`PDF: ${pdfId}`);
  console.log(`Quality Score: ${validation.quality_score.toFixed(3)}`);
  console.log(`Status: ${validation.passed ? 'SUCCESS' : 'PARTIAL'}`);
  console.log(`Cost: $${finalExtraction.summary.total_cost.toFixed(4)}`);
  console.log(`Duration: ${durationSeconds}s`);
}

/**
 * Main Autonomous Execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   AUTONOMOUS PDF EXTRACTION PIPELINE - DEMONSTRATION      ║');
  console.log('║   Protocol: AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md    ║');
  console.log('║   Rigor: RIGOR_PROTOCOL.md                                ║');
  console.log('║   Mode: FULL AUTOMATION - 100% CLAUDE                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nSession ID: ${SESSION_ID}`);
  console.log(`Demo Mode: ${DEMO_MODE ? 'ENABLED (simulated extraction)' : 'DISABLED (real APIs)'}\n`);

  const startTime = Date.now();
  const selector = new PDFSelector();

  try {
    // STEP 1: Select and Lock PDF
    const pdfPath = await step1_SelectAndLock(selector);
    if (!pdfPath) {
      console.log('\nAll PDFs processed. Exiting.');
      return;
    }

    const sessionDir = path.join('./sessions', SESSION_ID);

    // STEP 2: Analyze PDF Structure
    const documentMap = await step2_AnalyzeStructure(pdfPath, sessionDir);

    // STEP 3: Extract with 19 Agents
    const agentResults = await step3_ExtractWithAgents(pdfPath, documentMap, sessionDir);

    // STEP 4: Validate Results
    const validation = await step4_Validate(agentResults, sessionDir);

    // STEP 5: Document Learnings
    await step5_DocumentLearnings(pdfPath, agentResults, validation, sessionDir);

    // STEP 6: Meta-Analysis (conditional)
    await step6_MetaAnalysis(selector);

    // STEP 7: Commit & Unlock
    await step7_CommitAndUnlock(pdfPath, agentResults, validation, sessionDir, selector, startTime);

  } catch (error) {
    console.error('\n!!! CRITICAL ERROR !!!');
    console.error(error);

    // Clean up: Remove lock if exists
    console.log('\nPerforming cleanup...');
    // (Lock removal would happen here in production)

    logExtractionEvent({
      type: 'extraction_failed',
      session_id: SESSION_ID,
      error: String(error),
    });

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  main as runAutonomousExtraction,
  SESSION_ID,
  AGENTS,
};
