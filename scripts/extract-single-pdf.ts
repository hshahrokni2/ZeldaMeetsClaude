#!/usr/bin/env tsx
/**
 * Simple PDF Extraction Script
 *
 * Extracts data from a single BRF annual report PDF.
 */

import * as fs from 'fs';
import * as path from 'path';
import { convertPdfToImages, createSimpleSectionMap } from '../lib/pdf-to-images';
import { SimpleOpenRouterClient } from '../lib/simple-openrouter-client';
import { getAgentPrompt, getAllAgentIds, type AgentId } from '../lib/agent-prompts';
import { extractBRFId } from '../lib/brf-id-extractor';

// Priority agents to run (for cost efficiency)
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
    tokens?: number;
    cost?: number;
    error?: string;
  }>;
  summary: {
    totalAgents: number;
    successfulAgents: number;
    failedAgents: number;
    totalCost: number;
    totalTokens: number;
    duration: string;
  };
}

async function executeAgent(
  agentId: AgentId,
  images: string[],
  client: SimpleOpenRouterClient
): Promise<{ data: any; tokens?: number; cost?: number; error?: string }> {
  try {
    console.log(`\n[${agentId}] Extracting data from ${images.length} pages...`);

    // Get agent prompt
    const prompt = getAgentPrompt(agentId);

    // Prepare multimodal content
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];

    content.push({
      type: 'text',
      text: prompt,
    });

    // Add images (limit to first 20 pages for cost)
    const imagesToUse = images.slice(0, 20);
    for (const imageBase64 of imagesToUse) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`,
        },
      });
    }

    // Call vision model
    const response = await client.chat('extraction-script', {
      model: 'google/gemini-2.0-flash-exp:free', // Use free model for testing
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    });

    // Parse JSON response
    let jsonText = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const data = JSON.parse(jsonText);

    console.log(`[${agentId}] ✅ Extracted ${Object.keys(data).length} fields (${response.usage?.total_tokens || 0} tokens, $${response.totalCost?.toFixed(4) || '0.0000'})`);

    return {
      data,
      tokens: response.usage?.total_tokens,
      cost: response.totalCost,
    };
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
  console.log('BRF Annual Report Extraction');
  console.log('='.repeat(60));
  console.log(`PDF: ${pdfPath}`);
  console.log(`Agents: ${PRIORITY_AGENTS.join(', ')}`);
  console.log('='.repeat(60));

  // Extract BRF ID
  const brfIdResult = extractBRFId(pdfPath);
  console.log(`\n[BRF ID] ${brfIdResult.brfId || 'Not found'} (confidence: ${brfIdResult.confidence})`);

  // Convert PDF to images
  console.log('\n[Step 1] Converting PDF to images...');
  const images = await convertPdfToImages(pdfPath);
  console.log(`[Step 1] ✅ Converted ${images.length} pages to images`);

  // Initialize OpenRouter client
  const client = new SimpleOpenRouterClient();

  // Execute agents
  console.log(`\n[Step 2] Executing ${PRIORITY_AGENTS.length} agents...`);
  const agentResults = [];
  let totalCost = 0;
  let totalTokens = 0;
  let successfulAgents = 0;
  let failedAgents = 0;

  for (const agentId of PRIORITY_AGENTS) {
    const result = await executeAgent(agentId, images, client);

    agentResults.push({
      agentId,
      ...result,
    });

    if (result.error) {
      failedAgents++;
    } else {
      successfulAgents++;
      totalCost += result.cost || 0;
      totalTokens += result.tokens || 0;
    }
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
      totalCost,
      totalTokens,
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
  console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
  console.log(`🔢 Total tokens: ${totalTokens.toLocaleString()}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📄 Output: ${outputPath}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
