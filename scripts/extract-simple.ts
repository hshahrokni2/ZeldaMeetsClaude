#!/usr/bin/env tsx
/**
 * Simplified PDF Extraction Script (No PDF-to-Image conversion)
 *
 * Uses Claude's native PDF reading capability via Anthropic SDK.
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { getAgentPrompt, type AgentId } from '../lib/agent-prompts';
import { extractBRFId } from '../lib/brf-id-extractor';

// Priority agents to run
const PRIORITY_AGENTS: AgentId[] = [
  'financial_agent',
  'balance_sheet_agent',
  'property_agent',
  'chairman_agent',
  'board_members_agent',
];

interface ExtractionResult {
  pdfId: string;
  pdfPath: string;
  brfId: string | null;
  timestamp: string;
  agents: Array<{
    agentId: string;
    data: any;
    error?: string;
  }>;
  summary: {
    totalAgents: number;
    successfulAgents: number;
    failedAgents: number;
    duration: string;
  };
}

async function executeAgent(
  agentId: AgentId,
  pdfBase64: string,
  client: Anthropic
): Promise<{ data: any; error?: string }> {
  try {
    console.log(`\n[${agentId}] Extracting data from PDF...`);

    // Get agent prompt
    const prompt = getAgentPrompt(agentId);

    // Call Claude with PDF
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt + '\n\nReturn ONLY valid JSON with the extracted fields.',
            },
          ],
        },
      ],
    });

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    let jsonText = responseText.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    // Find JSON object
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd);
    }

    const data = JSON.parse(jsonText);

    console.log(`[${agentId}] ✅ Extracted ${Object.keys(data).length} fields`);

    return { data };
  } catch (error: any) {
    console.error(`[${agentId}] ❌ Error: ${error.message}`);
    return {
      data: {},
      error: error.message,
    };
  }
}

async function main() {
  const startTime = Date.now();

  // Parse command line arguments
  const pdfPath = process.argv[2] || './pdfs/278354_årsredovisning_stockholm_brf_the_brick_terra.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: PDF not found at ${pdfPath}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('BRF Annual Report Extraction (Claude Native PDF)');
  console.log('='.repeat(60));
  console.log(`PDF: ${pdfPath}`);
  console.log(`Agents: ${PRIORITY_AGENTS.join(', ')}`);
  console.log('='.repeat(60));

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set your Anthropic API key:');
    console.error('  export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  // Extract BRF ID
  const brfIdResult = extractBRFId(pdfPath);
  console.log(`\n[BRF ID] ${brfIdResult.brfId || 'Not found'} (confidence: ${brfIdResult.confidence})`);

  // Read PDF as base64
  console.log('\n[Step 1] Reading PDF...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');
  const sizeKB = (pdfBuffer.length / 1024).toFixed(1);
  console.log(`[Step 1] ✅ Loaded PDF (${sizeKB} KB)`);

  // Initialize Anthropic client
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Execute agents
  console.log(`\n[Step 2] Executing ${PRIORITY_AGENTS.length} agents...`);
  const agentResults = [];
  let successfulAgents = 0;
  let failedAgents = 0;

  for (const agentId of PRIORITY_AGENTS) {
    const result = await executeAgent(agentId, pdfBase64, client);

    agentResults.push({
      agentId,
      ...result,
    });

    if (result.error) {
      failedAgents++;
    } else {
      successfulAgents++;
    }

    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate duration
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Prepare final result
  const extractionResult: ExtractionResult = {
    pdfId: path.basename(pdfPath, '.pdf'),
    pdfPath,
    brfId: brfIdResult.brfId,
    timestamp: new Date().toISOString(),
    agents: agentResults,
    summary: {
      totalAgents: PRIORITY_AGENTS.length,
      successfulAgents,
      failedAgents,
      duration: `${duration}s`,
    },
  };

  // Save results
  const outputDir = path.join(process.cwd(), 'extractions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${extractionResult.pdfId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(extractionResult, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successful agents: ${successfulAgents}/${PRIORITY_AGENTS.length}`);
  console.log(`❌ Failed agents: ${failedAgents}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📄 Output: ${outputPath}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
