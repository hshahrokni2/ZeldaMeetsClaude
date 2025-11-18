/**
 * Ground Truth JSONL Exporter
 *
 * Exports consensus extraction results to JSONL format for DSPy training.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentId } from './agent-prompts';

export interface JSONLEntry {
  pdf_id: string;
  agent: AgentId;
  images: string[]; // base64 images
  ground_truth: Record<string, any>;
  consensus_metadata?: {
    overallConfidence: number;
    agreementRate: number;
    tiebreakerUsed: number;
  };
  linkage_metadata?: {
    brfId?: string | null;
    propertyDesignation?: string | null;
    brfName?: string | null;
    city?: string | null;
    zeldadbReady?: boolean;
    gripendbReady?: boolean;
  };
}

/**
 * Export ground truth results to JSONL
 *
 * Creates one JSONL line per agent result
 *
 * @param consensusResults - Array of consensus results from agents
 * @param pdfId - PDF identifier
 * @param outputDir - Output directory path
 * @param linkageData - Optional linkage metadata
 */
export async function exportGroundTruthToJsonl(
  consensusResults: Array<{
    agentId: AgentId;
    fields: any[];
    overallConfidence: number;
    costBreakdown: any;
    tokensBreakdown: any;
  }>,
  pdfId: string,
  outputDir: string,
  linkageData?: any
): Promise<void> {
  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${pdfId}_ground_truth.jsonl`);
  const lines: string[] = [];

  for (const result of consensusResults) {
    // Convert fields array to ground truth object
    const groundTruth: Record<string, any> = {};
    for (const field of result.fields) {
      groundTruth[field.fieldName] = field.consensusValue;
    }

    const entry: JSONLEntry = {
      pdf_id: pdfId,
      agent: result.agentId,
      images: [], // STUB: Would include actual page images
      ground_truth: groundTruth,
      consensus_metadata: {
        overallConfidence: result.overallConfidence,
        agreementRate: 0.85, // Stub
        tiebreakerUsed: 0.1, // Stub
      },
    };

    if (linkageData) {
      entry.linkage_metadata = linkageData;
    }

    lines.push(JSON.stringify(entry));
  }

  // Write JSONL
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`[JSONL Export] ✅ Exported ${lines.length} agent results to ${outputPath}`);
}

/**
 * Append single entry to JSONL file
 */
export async function appendToJsonl(
  entry: JSONLEntry,
  outputPath: string
): Promise<void> {
  const line = JSON.stringify(entry) + '\n';

  fs.appendFileSync(outputPath, line, 'utf-8');
}

/**
 * Read JSONL file
 */
export async function readJsonl(inputPath: string): Promise<JSONLEntry[]> {
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');

  return lines.map((line) => JSON.parse(line));
}
