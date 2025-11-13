/**
 * Claude Self-Extraction Adapter
 *
 * This module replaces external API calls (OpenRouter, OpenAI, Gemini) with
 * self-prompting using the Task tool. Claude acts as all 19 agents, extracting
 * data through iterative refinement and self-auditing.
 *
 * Key Features:
 * - Self-prompting: Uses Task tool to create sub-agents
 * - Multi-pass extraction: Extracts, audits, refines until 95%+ confidence
 * - Blind spot detection: Identifies missed fields through cross-validation
 * - Evidence tracking: Tracks page numbers and original text for verification
 */

import * as fs from 'fs-extra';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractionRequest {
  agentId: string;
  agentPrompt: string;
  pdfPath: string;
  pageRange?: [number, number]; // Optional: extract only specific pages
  previousExtraction?: any; // Optional: previous attempt for refinement
  blindSpots?: string[]; // Optional: fields that were missed in previous pass
}

export interface ExtractionResult {
  agentId: string;
  data: any;
  confidence: number;
  evidence_pages: number[];
  extraction_pass: number; // Which iteration (1, 2, 3...)
  blind_spots_found: string[];
  timestamp: string;
}

export interface AuditResult {
  overall_confidence: number;
  field_count: number;
  missing_fields: string[];
  low_confidence_fields: string[];
  evidence_gaps: string[];
  recommendations: string[];
}

// =============================================================================
// SELF-EXTRACTION ENGINE
// =============================================================================

export class ClaudeSelfExtractor {
  private extractionHistory: Map<string, ExtractionResult[]> = new Map();
  private readonly resultsDir: string;

  constructor(resultsDir: string = './results') {
    this.resultsDir = resultsDir;
    fs.ensureDirSync(resultsDir);
  }

  /**
   * Extract data from PDF using self-prompting.
   *
   * This method writes a task file that will be picked up by the main
   * Claude instance to perform extraction as a sub-agent.
   */
  async extractWithAgent(request: ExtractionRequest): Promise<ExtractionResult> {
    console.log(`[Self-Extraction] Agent: ${request.agentId}, Pass: ${this.getPassNumber(request.agentId) + 1}`);

    // Build the extraction task description
    const taskDescription = this.buildExtractionTask(request);

    // Write task file for pickup
    const taskFile = path.join(this.resultsDir, `task_${request.agentId}_${Date.now()}.json`);
    await fs.writeJson(taskFile, {
      agentId: request.agentId,
      pdfPath: request.pdfPath,
      taskDescription,
      timestamp: new Date().toISOString()
    }, { spaces: 2 });

    console.log(`[Self-Extraction] Task file created: ${taskFile}`);
    console.log(`[Self-Extraction] Please process this task and return structured JSON`);

    // In actual implementation, this would trigger the Task tool
    // For now, return placeholder that indicates where extraction should happen
    const result: ExtractionResult = {
      agentId: request.agentId,
      data: {}, // Will be populated by Task tool
      confidence: 0.0,
      evidence_pages: [],
      extraction_pass: this.getPassNumber(request.agentId) + 1,
      blind_spots_found: [],
      timestamp: new Date().toISOString()
    };

    // Store in history
    const history = this.extractionHistory.get(request.agentId) || [];
    history.push(result);
    this.extractionHistory.set(request.agentId, history);

    return result;
  }

  /**
   * Audit extraction results to find blind spots and low-confidence fields.
   */
  async auditExtraction(
    agentId: string,
    extractionResult: ExtractionResult,
    expectedFields: string[]
  ): Promise<AuditResult> {
    console.log(`[Self-Audit] Auditing ${agentId} extraction...`);

    const extractedFields = Object.keys(extractionResult.data);
    const missingFields = expectedFields.filter(f => !extractedFields.includes(f));

    const lowConfidenceFields = extractedFields.filter(field => {
      const value = extractionResult.data[field];
      if (value && typeof value === 'object' && 'confidence' in value) {
        return value.confidence < 0.7;
      }
      return false;
    });

    const evidenceGaps = extractedFields.filter(field => {
      const value = extractionResult.data[field];
      if (value && typeof value === 'object' && 'evidence_pages' in value) {
        return !value.evidence_pages || value.evidence_pages.length === 0;
      }
      return false;
    });

    const recommendations: string[] = [];
    if (missingFields.length > 0) {
      recommendations.push(`Re-extract focusing on: ${missingFields.join(', ')}`);
    }
    if (lowConfidenceFields.length > 0) {
      recommendations.push(`Verify low-confidence fields: ${lowConfidenceFields.join(', ')}`);
    }
    if (evidenceGaps.length > 0) {
      recommendations.push(`Add evidence pages for: ${evidenceGaps.join(', ')}`);
    }

    const overallConfidence = this.calculateOverallConfidence(extractionResult.data);

    return {
      overall_confidence: overallConfidence,
      field_count: extractedFields.length,
      missing_fields: missingFields,
      low_confidence_fields: lowConfidenceFields,
      evidence_gaps: evidenceGaps,
      recommendations
    };
  }

  /**
   * Perform iterative refinement until 95%+ confidence.
   */
  async iterativeRefinement(
    request: ExtractionRequest,
    expectedFields: string[],
    targetConfidence: number = 0.95,
    maxPasses: number = 5
  ): Promise<ExtractionResult> {
    let currentResult = await this.extractWithAgent(request);
    let pass = 1;

    while (pass <= maxPasses) {
      const audit = await this.auditExtraction(request.agentId, currentResult, expectedFields);

      console.log(`[Iterative Refinement] Pass ${pass}/${maxPasses}`);
      console.log(`  - Confidence: ${(audit.overall_confidence * 100).toFixed(1)}%`);
      console.log(`  - Missing fields: ${audit.missing_fields.length}`);
      console.log(`  - Low confidence: ${audit.low_confidence_fields.length}`);

      if (audit.overall_confidence >= targetConfidence && audit.missing_fields.length === 0) {
        console.log(`[Iterative Refinement] ✓ Target confidence reached!`);
        break;
      }

      if (pass === maxPasses) {
        console.log(`[Iterative Refinement] ⚠ Max passes reached, stopping refinement`);
        break;
      }

      // Prepare refined request with blind spots
      const refinedRequest: ExtractionRequest = {
        ...request,
        previousExtraction: currentResult.data,
        blindSpots: [...audit.missing_fields, ...audit.low_confidence_fields]
      };

      currentResult = await this.extractWithAgent(refinedRequest);
      pass++;
    }

    return currentResult;
  }

  /**
   * Cross-validate extraction across multiple agents to find discrepancies.
   */
  async crossValidate(results: ExtractionResult[]): Promise<Map<string, any[]>> {
    const discrepancies = new Map<string, any[]>();

    // Compare common fields across agents
    const allFields = new Set<string>();
    results.forEach(r => Object.keys(r.data).forEach(k => allFields.add(k)));

    allFields.forEach(field => {
      const values = results
        .filter(r => field in r.data)
        .map(r => r.data[field]);

      if (values.length > 1) {
        const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
        if (uniqueValues.size > 1) {
          discrepancies.set(field, values);
        }
      }
    });

    return discrepancies;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private buildExtractionTask(request: ExtractionRequest): string {
    let task = `You are the ${request.agentId} agent extracting data from a Swedish BRF annual report.\n\n`;
    task += `PDF: ${request.pdfPath}\n`;

    if (request.pageRange) {
      task += `Pages: ${request.pageRange[0]}-${request.pageRange[1]}\n`;
    }

    task += `\n${request.agentPrompt}\n\n`;

    if (request.previousExtraction) {
      task += `PREVIOUS EXTRACTION (for refinement):\n${JSON.stringify(request.previousExtraction, null, 2)}\n\n`;
    }

    if (request.blindSpots && request.blindSpots.length > 0) {
      task += `FOCUS ON THESE MISSED FIELDS:\n${request.blindSpots.join('\n')}\n\n`;
    }

    task += `Return ONLY valid JSON with the extracted data. Include confidence scores and evidence_pages for each field.`;

    return task;
  }

  private getPassNumber(agentId: string): number {
    const history = this.extractionHistory.get(agentId);
    return history ? history.length : 0;
  }

  private calculateOverallConfidence(data: any): number {
    const confidenceValues: number[] = [];

    for (const key in data) {
      const value = data[key];
      if (value && typeof value === 'object' && 'confidence' in value) {
        confidenceValues.push(value.confidence);
      }
    }

    if (confidenceValues.length === 0) return 0.0;

    const sum = confidenceValues.reduce((a, b) => a + b, 0);
    return sum / confidenceValues.length;
  }

  /**
   * Get extraction history for an agent.
   */
  getHistory(agentId: string): ExtractionResult[] {
    return this.extractionHistory.get(agentId) || [];
  }

  /**
   * Clear extraction history.
   */
  clearHistory(agentId?: string): void {
    if (agentId) {
      this.extractionHistory.delete(agentId);
    } else {
      this.extractionHistory.clear();
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ClaudeSelfExtractor;
