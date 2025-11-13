/**
 * Vision-Based Sectionizer (2-Round)
 *
 * Analyzes PDF page images to detect document structure:
 * - Round 1: Top-level sections (L1)
 * - Round 2: Subsections (L2/L3)
 *
 * Uses EXACT prompts from Gracian Pipeline (90%+ accuracy)
 *
 * INTEGRATION: Uses Komilion's OpenRouterClient with multi-key pool
 * - Automatic key selection (LRU)
 * - Token/cost tracking
 * - Retry logic on rate limits
 *
 * Reference: PHASE2_GRACIAN_PROMPTS_REFERENCE.md lines 68-180
 */

import { base64ToDataUrl } from './pdf-to-images';

// Environment configuration
const SECTIONIZER_MODEL = process.env.SECTIONIZER_MODEL || 'qwen/qwen3-vl-235b-a22b-instruct';
const SECTIONIZER_PAGES_PER_CALL = parseInt(process.env.SECTIONIZER_PAGES_PER_CALL || '8');
const SECTIONIZER_PACE_MS = parseInt(process.env.SECTIONIZER_PACE_MS || '300');

// Get API key at runtime (not module load time) to support dotenv in tests
function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY || '';
  if (!key) {
    throw new Error('OPENROUTER_API_KEY not found in environment');
  }
  return key;
}

// Section type definitions
interface Section {
  title: string;
  start_page: number;
  end_page: number;
}

interface Subsection extends Section {
  parent: string;
}

interface Level1Result {
  level_1: Section[];
}

interface Level2Result {
  level_2: Subsection[];
  level_3: Subsection[];
}

export interface SectionMap {
  level_1: Section[];
  level_2: Subsection[];
  level_3: Subsection[];
}

export interface SectionizationResult {
  sectionMap: SectionMap;
  cost: number;
  tokens: number;
}

// Gracian Pipeline prompts (EXACT copies - DO NOT MODIFY!)
const SYSTEM_PROMPT = "You are a precise BRF sectionizer. Return strict minified JSON only.";

const ROUND1_PROMPT = (
  "Task: From these BRF report page images, detect ALL top-level (level 1) sections that are actually visible. " +
  "Use Swedish headings and layout cues. Typical L1: Förvaltningsberättelse, Resultaträkning, Balansräkning, Kassaflödesanalys, Noter/Tilläggsupplysningar, Revisionsberättelse, Underskrifter, Stadgar. " +
  "Requirements: (1) Use 1-based GLOBAL page numbers from the provided listing, (2) Do NOT invent titles or pages, (3) If a section spans multiple pages, set start_page and end_page accordingly, (4) If uncertain, omit. " +
  "Return strict minified JSON only: {level_1:[{title,start_page,end_page}]}."
);

const ROUND2_PROMPT = (
  "📋 TASK: Identify ALL subsection headings (level 2 and level 3) with page ranges within this L1 section.\n\n" +

  "🔍 WHAT TO LOOK FOR:\n" +
  "- Level 2 (L2): Main subsections - Medium/large bold headings, may have numbers (e.g., 'Not 1', 'Styrelsens arbete')\n" +
  "- Level 3 (L3): Sub-subsections - Smaller bold headings, often indented or numbered (e.g., '1.1', 'a)', '-')\n" +
  "- Visual cues: Font size changes, bold text, indentation, numbering (1., 2., a), b), -, •)\n" +
  "- Swedish BRF patterns: Noter subsections ('Not 1 Lån', 'Not 2 Avskrivningar'), Styrelsens arbete, Medlemmar\n\n" +

  "📄 PAGE NUMBERS:\n" +
  "- You will see pages labeled 'Page 1, Page 2, etc.' - these are LOCAL to this section\n" +
  "- start_page and end_page should use these LOCAL page numbers (1-based)\n" +
  "- Example: If 'Not 1' starts on Page 2 and ends on Page 3, return start_page:2, end_page:3\n\n" +

  "✅ EXAMPLES:\n" +
  "L2 example: {\"title\":\"Not 1 Lån\",\"start_page\":2,\"end_page\":2}\n" +
  "L3 example: {\"title\":\"Långfristiga skulder\",\"start_page\":2,\"end_page\":2}\n" +
  "Empty: {\"level_2\":[],\"level_3\":[]}\n\n" +

  "⚡ REQUIREMENTS:\n" +
  "1. Return EVERY visible subsection heading - don't skip any\n" +
  "2. Use LOCAL page numbers (1, 2, 3, etc.) as shown in the page labels\n" +
  "3. If a heading spans multiple pages, set end_page accordingly\n" +
  "4. If truly no subsections exist, return empty arrays\n" +
  "5. Return strict minified JSON: {\"level_2\":[{\"title\":str,\"start_page\":int,\"end_page\":int}],\"level_3\":[...]}"
);

/**
 * Call vision model using OpenRouterClient with multi-key pool
 *
 * INTEGRATION: Uses Komilion's OpenRouterClient for:
 * - Multi-key rotation (10 subkeys) to avoid rate limits
 * - Automatic token tracking and cost calculation
 * - User balance management with Prisma
 */
interface VisionModelResponse {
  result: any;
  cost: number;
  tokens: number;
}

async function callVisionModel(
  images: string[],
  prompt: string,
  userId: string = 'sectionizer-service',
  attempt: number = 0
): Promise<VisionModelResponse> {
  const maxAttempts = 5;

  try {
    // Prepare multimodal content (text + images)
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];

    // Add page listing + prompt
    const pageLabels = images.map((_, i) => `Page ${i + 1}`).join(', ');
    content.push({
      type: 'text',
      text: `Section pages (local numbering): ${pageLabels}\n\n${prompt}`
    });

    // Add images (as data URLs)
    for (const image of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: base64ToDataUrl(image, 'png')
        }
      });
    }

    // Use OpenRouterClient with multi-key pool
    const { OpenRouterClient } = await import('../openrouter-client');
    const client = new OpenRouterClient();

    const response = await client.chat(userId, {
      model: SECTIONIZER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: content }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 8192  // Increased from 2048 - Round 2 needs ~3000+ for detailed L2/L3 hierarchies
    });

    // OpenRouterClient returns the parsed response directly
    const choice = response.choices[0];
    const finishReason = choice.finish_reason;
    const messageContent = choice.message.content;

    // Capture cost and tokens for tracking
    const visionCost = response.totalCost || 0;
    const visionTokens = response.usage?.total_tokens || 0;

    // Log token usage (automatically tracked by OpenRouterClient)
    if (response.usage) {
      console.log(`[Sectionizer] Tokens used: ${visionTokens} (prompt: ${response.usage.prompt_tokens}, completion: ${response.usage.completion_tokens}), Cost: $${visionCost.toFixed(4)}`);
    }

    // CRITICAL: Check if response was truncated (hit max_tokens limit)
    if (finishReason === 'length' && attempt === 0) {
      console.warn('[Sectionizer] ⚠️  Response truncated (max_tokens hit), retrying with simplified prompt...');

      // Retry with prompt asking for LESS detail to avoid truncation
      const simplifiedPrompt = prompt +
        "\n\nCRITICAL: Response MUST be under 2000 tokens to avoid truncation. " +
        "Keep ALL titles SHORT (max 4 words). NO descriptions or extra fields. " +
        "Return ONLY: title, start_page, end_page for each section.";

      return callVisionModel(images, simplifiedPrompt, userId, attempt + 1);
    }

    // Parse JSON response (robust - handle markdown code blocks and malformed JSON)
    let jsonText = messageContent.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Try multiple parsing strategies
    let parsed: any;

    // Strategy 1: Direct parse (if already clean JSON)
    try {
      parsed = JSON.parse(jsonText);
      return { result: parsed, cost: visionCost, tokens: visionTokens };
    } catch (e) {
      // Log truncation issue for debugging
      if (e instanceof SyntaxError && (e.message.includes('position') || e.message.includes('Unexpected end'))) {
        console.warn(`[Sectionizer] ⚠️  JSON parsing failed (truncated or malformed), attempting repair...`);
        console.warn(`[Sectionizer] First 300 chars: ${jsonText.substring(0, 300)}`);
        console.warn(`[Sectionizer] Last 200 chars: ${jsonText.substring(Math.max(0, jsonText.length - 200))}`);
      }
      // Continue to next strategy
    }

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
        parsed = JSON.parse(extracted);
        return { result: parsed, cost: visionCost, tokens: visionTokens };
      }
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 3: Try to fix common JSON errors
    try {
      // Remove trailing commas
      let fixed = jsonText.replace(/,(\s*[}\]])/g, '$1');
      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');
      parsed = JSON.parse(fixed);
      return { result: parsed, cost: visionCost, tokens: visionTokens };
    } catch (e) {
      // Continue to error
    }

    // Strategy 4: JSON repair for truncated responses (last resort)
    try {
      console.warn('[Sectionizer] Attempting JSON repair for truncated/malformed response...');

      let repaired = jsonText;

      // Step 1: Handle mid-field truncation (most common case)
      // Pattern: {"level_2":[{"parent":"Förvaltn  (truncated mid-value)

      // Find all unclosed strings by counting quotes
      const quotes = repaired.match(/"/g) || [];
      const hasUnclosedString = quotes.length % 2 === 1;

      if (hasUnclosedString) {
        console.warn('[Sectionizer]   Detected unclosed string (mid-field truncation)');

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
            console.warn(`[Sectionizer]   Removed incomplete field from position ${commaIndex}`);
          } else {
            // No comma means this is the first field in the object
            // Find the opening brace and keep only that
            const openBraceIndex = beforeLastQuote.lastIndexOf('{');
            if (openBraceIndex !== -1) {
              repaired = repaired.substring(0, openBraceIndex + 1);
              console.warn(`[Sectionizer]   Removed first incomplete field, keeping from position ${openBraceIndex}`);
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
        console.warn(`[Sectionizer]   Added ${missingCloseBrackets} closing array bracket(s)`);
      }

      // Step 4: Close all unclosed objects
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const missingCloseBraces = openBraces - closeBraces;
      if (missingCloseBraces > 0) {
        repaired += '}'.repeat(missingCloseBraces);
        console.warn(`[Sectionizer]   Added ${missingCloseBraces} closing brace(s)`);
      }

      // Step 5: Try to parse repaired JSON
      parsed = JSON.parse(repaired);
      const level2Count = parsed.level_2?.length || 0;
      const level3Count = parsed.level_3?.length || 0;
      console.warn(`[Sectionizer] ✅ JSON repaired successfully!`);
      console.warn(`[Sectionizer]   Salvaged: ${level2Count} L2 + ${level3Count} L3 subsections`);
      console.warn(`[Sectionizer]   Note: Some subsections may be lost due to truncation`);
      return { result: parsed, cost: visionCost, tokens: visionTokens };
    } catch (e) {
      // Repair failed, continue to error
      console.warn('[Sectionizer] ❌ JSON repair failed:', e instanceof Error ? e.message : e);
    }

    // All strategies failed
    console.error('[Sectionizer] Could not parse JSON response:', messageContent.substring(0, 500));
    console.error('[Sectionizer] Cleaned text:', jsonText.substring(0, 500));
    console.error('[Sectionizer] finish_reason:', finishReason);
    throw new Error('Could not parse JSON from model response');

  } catch (error: any) {
    // Retry on rate limits
    if (error.message?.includes('429') && attempt < maxAttempts - 1) {
      const backoffMs = 800 * (attempt + 1);
      console.warn(`[Sectionizer] Rate limit hit, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return callVisionModel(images, prompt, userId, attempt + 1);
    }

    console.error('[Sectionizer] Vision model call failed:', error.message);
    throw error;
  }
}

/**
 * Round 1: Detect top-level (L1) sections
 *
 * @param images - All page images (base64-encoded PNGs)
 * @returns Level 1 sections with cost and tokens
 */
export async function detectLevel1Sections(
  images: string[],
  userId: string = 'sectionizer-service'
): Promise<{ sections: Section[]; cost: number; tokens: number }> {
  console.log(`[Sectionizer Round 1] Detecting L1 sections from ${images.length} pages...`);

  const allSections: Section[] = [];
  let totalCost = 0;
  let totalTokens = 0;

  // Process images in batches
  for (let i = 0; i < images.length; i += SECTIONIZER_PAGES_PER_CALL) {
    const batchImages = images.slice(i, Math.min(i + SECTIONIZER_PAGES_PER_CALL, images.length));
    const batchNum = Math.floor(i / SECTIONIZER_PAGES_PER_CALL) + 1;
    const totalBatches = Math.ceil(images.length / SECTIONIZER_PAGES_PER_CALL);

    console.log(`[Sectionizer Round 1] Processing batch ${batchNum}/${totalBatches} (pages ${i + 1}-${i + batchImages.length})...`);

    try {
      const response = await callVisionModel(batchImages, ROUND1_PROMPT, userId);
      const result: Level1Result = response.result;

      // Aggregate cost and tokens
      totalCost += response.cost;
      totalTokens += response.tokens;

      if (result.level_1 && Array.isArray(result.level_1)) {
        // Adjust page numbers if this is not the first batch
        const adjustedSections = result.level_1.map(section => ({
          ...section,
          start_page: section.start_page + i,
          end_page: section.end_page + i
        }));

        allSections.push(...adjustedSections);
      }

      // Rate limiting pace
      if (i + SECTIONIZER_PAGES_PER_CALL < images.length) {
        await new Promise(resolve => setTimeout(resolve, SECTIONIZER_PACE_MS));
      }

    } catch (error) {
      console.error(`[Sectionizer Round 1] Error processing batch ${batchNum}:`, error);
      throw error;
    }
  }

  console.log(`[Sectionizer Round 1] ✅ Detected ${allSections.length} L1 sections`);
  console.log(`[Sectionizer Round 1] 💰 Cost: $${totalCost.toFixed(4)}, Tokens: ${totalTokens}\n`);

  return { sections: allSections, cost: totalCost, tokens: totalTokens };
}

/**
 * Round 2: Detect subsections (L2/L3) within L1 sections
 *
 * @param images - All page images
 * @param level1Sections - Level 1 sections from Round 1
 * @returns Level 2 and Level 3 subsections with cost and tokens
 */
export async function detectSubsections(
  images: string[],
  level1Sections: Section[],
  userId: string = 'sectionizer-service'
): Promise<{ level_2: Subsection[]; level_3: Subsection[]; cost: number; tokens: number }> {
  console.log(`[Sectionizer Round 2] Detecting L2/L3 subsections for ${level1Sections.length} L1 sections...`);

  const allLevel2: Subsection[] = [];
  const allLevel3: Subsection[] = [];
  let totalCost = 0;
  let totalTokens = 0;

  for (let i = 0; i < level1Sections.length; i++) {
    const section = level1Sections[i];
    console.log(`[Sectionizer Round 2] Processing section ${i + 1}/${level1Sections.length}: "${section.title}" (pages ${section.start_page}-${section.end_page})...`);

    try {
      // Extract images for this section (0-indexed)
      const sectionImages = images.slice(section.start_page - 1, section.end_page);

      const response = await callVisionModel(sectionImages, ROUND2_PROMPT, userId);
      const result: Level2Result = response.result;

      // Aggregate cost and tokens
      totalCost += response.cost;
      totalTokens += response.tokens;

      if (result.level_2 && Array.isArray(result.level_2)) {
        // Adjust page numbers relative to entire document
        const adjustedL2 = result.level_2.map(subsection => ({
          ...subsection,
          parent: section.title,
          start_page: subsection.start_page + section.start_page - 1,
          end_page: subsection.end_page + section.start_page - 1
        }));

        allLevel2.push(...adjustedL2);
      }

      if (result.level_3 && Array.isArray(result.level_3)) {
        // Adjust page numbers relative to entire document
        const adjustedL3 = result.level_3.map(subsection => ({
          ...subsection,
          parent: section.title,
          start_page: subsection.start_page + section.start_page - 1,
          end_page: subsection.end_page + section.start_page - 1
        }));

        allLevel3.push(...adjustedL3);
      }

      // Rate limiting pace
      if (i < level1Sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, SECTIONIZER_PACE_MS));
      }

    } catch (error) {
      // Make Round 2 failures non-fatal - just log warning and continue
      console.warn(`[Sectionizer Round 2] ⚠️  Failed to detect subsections in "${section.title}", skipping (L1 sections still available)`);
      console.warn(`[Sectionizer Round 2] Error:`, error instanceof Error ? error.message : error);
      // Continue to next section instead of throwing
    }
  }

  console.log(`[Sectionizer Round 2] ✅ Detected ${allLevel2.length} L2 + ${allLevel3.length} L3 subsections`);
  console.log(`[Sectionizer Round 2] 💰 Cost: $${totalCost.toFixed(4)}, Tokens: ${totalTokens}\n`);

  return {
    level_2: allLevel2,
    level_3: allLevel3,
    cost: totalCost,
    tokens: totalTokens
  };
}

/**
 * Full 2-round sectionization
 *
 * @param images - All page images (base64-encoded PNGs)
 * @returns Complete section map with L1, L2, L3 and cost tracking
 *
 * @example
 * const images = await convertPdfToImages('/path/to/document.pdf', { dpi: 170 });
 * const result = await sectionizePdf(images.images);
 * console.log(`Found ${result.sectionMap.level_1.length} top-level sections`);
 * console.log(`Sectionization cost: $${result.cost.toFixed(4)}`);
 */
export async function sectionizePdf(images: string[], userId: string = 'sectionizer-service'): Promise<SectionizationResult> {
  console.log(`[Sectionizer] Starting 2-round sectionization for ${images.length} pages...\n`);

  // Round 1: Detect L1 sections
  const round1Result = await detectLevel1Sections(images, userId);
  const level1 = round1Result.sections;
  let totalCost = round1Result.cost;
  let totalTokens = round1Result.tokens;

  // Round 2: Detect L2/L3 subsections (with safety net try/catch)
  let level_2: Subsection[] = [];
  let level_3: Subsection[] = [];

  try {
    const round2Result = await detectSubsections(images, level1, userId);
    level_2 = round2Result.level_2;
    level_3 = round2Result.level_3;
    totalCost += round2Result.cost;
    totalTokens += round2Result.tokens;
  } catch (error) {
    // Safety net: Even if detectSubsections internal catch fails, don't crash
    console.warn('[Sectionizer] ⚠️  Round 2 failed entirely, proceeding with L1 sections only');
    console.warn('[Sectionizer] Error:', error instanceof Error ? error.message : error);
    // Continue with empty L2/L3 arrays
  }

  const sectionMap: SectionMap = {
    level_1: level1,
    level_2: level_2,
    level_3: level_3
  };

  console.log(`[Sectionizer] ✅ Sectionization complete!`);
  console.log(`[Sectionizer] L1: ${level1.length}, L2: ${level_2.length}, L3: ${level_3.length}`);
  console.log(`[Sectionizer] 💰 Total Cost: $${totalCost.toFixed(4)}, Total Tokens: ${totalTokens}\n`);

  return {
    sectionMap,
    cost: totalCost,
    tokens: totalTokens
  };
}
