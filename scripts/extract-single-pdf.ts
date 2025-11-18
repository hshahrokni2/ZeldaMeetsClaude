/**
 * Single PDF Extraction Script
 *
 * Extracts data from one PDF using the 19-agent consensus system.
 * Supports both ground truth mode (3 models) and fast mode (2 models).
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ExtractionConfig {
  pdfPath: string;
  outputPath?: string;
  groundTruth: boolean;
  userId: string;
}

// ============================================================================
// PDF TO IMAGES (requires implementation)
// ============================================================================

async function convertPDFToImages(pdfPath: string): Promise<string[]> {
  console.log(`[PDF] Converting PDF to images...`);

  // TODO: Implement PDF → PNG conversion
  // Options:
  // 1. pdf-lib + canvas (pure JS)
  // 2. pdf2pic (uses GraphicsMagick/ImageMagick)
  // 3. ghostscript via child_process

  // For now, return empty array to indicate not implemented
  console.log('[PDF] ⚠️  PDF conversion not implemented - requires pdf-lib or pdf2pic');
  return [];
}

// ============================================================================
// SECTIONIZER
// ============================================================================

async function sectionizePDF(images: string[], userId: string): Promise<any> {
  console.log(`[Sectionizer] Detecting document structure...`);

  try {
    const { sectionizeWithVision } = await import('../lib/vision-sectionizer');
    return await sectionizeWithVision(images, userId);
  } catch (error: any) {
    console.log('[Sectionizer] ⚠️  Vision sectionizer not available:', error.message);

    // Fallback: Return basic structure
    return {
      level_1: [
        {
          title: 'Förvaltningsberättelse',
          start_page: 1,
          end_page: 4,
          confidence: 0.5,
        },
        {
          title: 'Resultaträkning',
          start_page: 5,
          end_page: 7,
          confidence: 0.5,
        },
        {
          title: 'Balansräkning',
          start_page: 8,
          end_page: 10,
          confidence: 0.5,
        },
        {
          title: 'Noter',
          start_page: 11,
          end_page: images.length,
          confidence: 0.5,
        },
      ],
      level_2: [],
      level_3: [],
      metadata: {
        total_pages: images.length,
        fallback: true,
      },
    };
  }
}

// ============================================================================
// EXTRACTION WORKFLOW
// ============================================================================

async function runExtraction(config: ExtractionConfig): Promise<any> {
  console.log('\n' + '='.repeat(66));
  console.log('PDF EXTRACTION PIPELINE');
  console.log('='.repeat(66));
  console.log(`PDF: ${path.basename(config.pdfPath)}`);
  console.log(`Mode: ${config.groundTruth ? 'GROUND TRUTH (3 models)' : 'FAST (2 models)'}`);
  console.log('='.repeat(66) + '\n');

  const startTime = Date.now();

  // Step 1: Convert PDF to images
  console.log('[Step 1/4] Converting PDF to images...');
  const images = await convertPDFToImages(config.pdfPath);

  if (images.length === 0) {
    throw new Error('PDF conversion failed - no images generated. Please check dependencies.');
  }

  console.log(`[Step 1/4] ✅ Converted to ${images.length} page images\n`);

  // Step 2: Sectionize document
  console.log('[Step 2/4] Detecting document structure...');
  const sectionMap = await sectionizePDF(images, config.userId);
  console.log(`[Step 2/4] ✅ Detected ${sectionMap.level_1.length} main sections\n`);

  // Step 3: Execute agents
  console.log('[Step 3/4] Executing 19 specialist agents...');

  try {
    const { runExtractionWorkflow } = await import('../lib/extraction-workflow');
    const { AGENT_IDS } = await import('../lib/agent-prompts');

    const workflowResult = await runExtractionWorkflow({
      userId: config.userId,
      pdfPath: config.pdfPath,
      images,
      sectionMap,
      agentsToRun: AGENT_IDS as any[],
    }, {
      groundTruth: config.groundTruth,
    });

    console.log(`[Step 3/4] ✅ Completed ${workflowResult.completedAgents.length}/19 agents\n`);

    // Step 4: Generate output
    console.log('[Step 4/4] Generating output JSON...');

    const pdfId = path.basename(config.pdfPath, '.pdf');
    const outputPath = config.outputPath || path.join(process.cwd(), 'results', `${pdfId}_ground_truth.json`);

    const output = {
      pdfId,
      pdfPath: config.pdfPath,
      metadata: workflowResult.metadata,
      extractedData: workflowResult.extractedData,
      agentResults: workflowResult.agentResults,
      summary: {
        totalAgents: 19,
        successfulAgents: workflowResult.completedAgents.length,
        failedAgents: workflowResult.failedAgents.length,
        totalTokens: workflowResult.totalTokens,
        totalCost: workflowResult.totalCost,
        qualityScore: calculateQualityScore(workflowResult),
        duration: Date.now() - startTime,
      },
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`[Step 4/4] ✅ Saved to: ${outputPath}\n`);

    console.log('='.repeat(66));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(66));
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`Agents: ${output.summary.successfulAgents}/${output.summary.totalAgents} successful`);
    console.log(`Quality: ${output.summary.qualityScore.toFixed(2)}`);
    console.log(`Cost: $${output.summary.totalCost.toFixed(2)}`);
    console.log(`Tokens: ${output.summary.totalTokens.toLocaleString()}`);
    console.log('='.repeat(66) + '\n');

    return output;

  } catch (error: any) {
    console.error('[Step 3/4] ❌ Extraction workflow failed:', error.message);
    throw error;
  }
}

function calculateQualityScore(workflowResult: any): number {
  const successRate = workflowResult.completedAgents.length / 19;

  // TODO: Calculate based on confidence scores from extractedData
  // For now, use simple success rate
  return successRate;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Single PDF Extraction Script

Usage:
  npx tsx scripts/extract-single-pdf.ts --pdf <path> [options]

Options:
  --pdf <path>          Path to PDF file (required)
  --output <path>       Output JSON path (default: results/<pdfid>_ground_truth.json)
  --ground-truth        Enable 3-model consensus (default: false)
  --user-id <id>        User ID for API key rotation (default: default)
  --help                Show this help

Examples:
  npx tsx scripts/extract-single-pdf.ts --pdf pdfs/hjorthagen/brf_44232.pdf
  npx tsx scripts/extract-single-pdf.ts --pdf pdfs/test.pdf --ground-truth
  npx tsx scripts/extract-single-pdf.ts --pdf pdfs/test.pdf --output custom_output.json
`);
    process.exit(0);
  }

  const pdfPath = args.find(a => a.startsWith('--pdf='))?.split('=')[1]
    || args[args.indexOf('--pdf') + 1];

  if (!pdfPath) {
    console.error('Error: --pdf argument is required');
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  const config: ExtractionConfig = {
    pdfPath,
    outputPath: args.find(a => a.startsWith('--output='))?.split('=')[1]
      || args[args.indexOf('--output') + 1],
    groundTruth: args.includes('--ground-truth'),
    userId: args.find(a => a.startsWith('--user-id='))?.split('=')[1]
      || args[args.indexOf('--user-id') + 1]
      || 'default',
  };

  try {
    await runExtraction(config);
  } catch (error: any) {
    console.error('\n❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runExtraction };
