# BRF The Brick Terra (PDF #9) Extraction

## Status: Infrastructure Complete - Ready for Execution

This document describes the extraction setup for PDF #9: BRF The Brick Terra.

## What's Been Completed

### 1. Missing Library Dependencies Created ✅
- `lib/agent-prompts.ts` - Loads agent prompts from markdown files
- `lib/field-validator.ts` - Validates extracted data
- `lib/brf-id-extractor.ts` - Extracts BRF ID from filenames
- `lib/llm-orchestrator.ts` - Routes sections to agents
- `lib/simple-openrouter-client.ts` - Simplified OpenRouter API client
- `lib/pdf-to-images.ts` - PDF to image conversion

### 2. Extraction Scripts Created ✅
- `scripts/extract-simple.ts` - Uses Claude's native PDF reading (recommended)
- `scripts/extract-single-pdf.ts` - Uses OpenRouter with vision models

### 3. Dependencies Installed ✅
- npm packages installed (50 packages)
- pdf-poppler and pdf-lib added for PDF processing

## PDF Information

**File**: `./pdfs/278354_årsredovisning_stockholm_brf_the_brick_terra.pdf`
**BRF ID**: `278354` (extracted from filename)
**Location**: Stockholm
**Name**: BRF The Brick Terra

## How to Run the Extraction

### Option 1: Using Claude (Recommended)

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_key_here

# Run extraction
npx tsx scripts/extract-simple.ts "./pdfs/278354_årsredovisning_stockholm_brf_the_brick_terra.pdf"
```

This will:
- Use Claude 3.5 Sonnet with native PDF reading
- Extract data from 5 priority agents:
  - financial_agent (income statement)
  - balance_sheet_agent (balance sheet)
  - property_agent (property info)
  - chairman_agent (chairman details)
  - board_members_agent (board members)
- Save results to `extractions/278354_årsredovisning_stockholm_brf_the_brick_terra.json`

### Option 2: Using OpenRouter

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=your_key_here

# Run extraction
npx tsx scripts/extract-single-pdf.ts "./pdfs/278354_årsredovisning_stockholm_brf_the_brick_terra.pdf"
```

## Expected Output

The extraction will create a JSON file with this structure:

```json
{
  "pdfId": "278354_årsredovisning_stockholm_brf_the_brick_terra",
  "pdfPath": "./pdfs/278354_årsredovisning_stockholm_brf_the_brick_terra.pdf",
  "brfId": "278354",
  "timestamp": "2025-11-16T...",
  "agents": [
    {
      "agentId": "financial_agent",
      "data": {
        "total_revenue_tkr": 1234,
        "total_revenue_tkr_original": "1,234 MSEK",
        "net_result_tkr": 567,
        ...
      }
    },
    {
      "agentId": "balance_sheet_agent",
      "data": {
        "total_assets_tkr": 5678,
        "total_liabilities_tkr": 2345,
        ...
      }
    },
    ...
  ],
  "summary": {
    "totalAgents": 5,
    "successfulAgents": 5,
    "failedAgents": 0,
    "duration": "45.2s"
  }
}
```

## Next Steps

1. **Set API Key**: Add your ANTHROPIC_API_KEY or OPENROUTER_API_KEY to `.env` file
2. **Run Extraction**: Execute one of the extraction scripts above
3. **Verify Results**: Check the output in `extractions/` directory
4. **Commit Results**: Commit and push the extraction results to the branch

## Files Created

- 6 new library files in `lib/`
- 2 extraction scripts in `scripts/`
- `.env` template
- This README

## Cost Estimate

**Using Claude 3.5 Sonnet**:
- ~5 agents × 4K tokens/agent ≈ 20K tokens total
- Estimated cost: $0.60-1.00 per extraction

**Using OpenRouter (Gemini 2.0 Flash Free)**:
- Free tier available
- Estimated cost: $0.00-0.20 per extraction

## Technical Notes

- All agent prompts are loaded from `agents/` directory (19 markdown files)
- The extraction uses TypeScript schemas from `schemas/` directory
- BRF ID (278354) is automatically extracted from filename
- Results include full metadata for database linkage

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable not set"
- Create a `.env` file with your API key
- Or export it in your shell: `export ANTHROPIC_API_KEY=your_key`

### "PDF conversion failed"
- The simple script uses Claude's native PDF reading (no conversion needed)
- Use `scripts/extract-simple.ts` instead of `extract-single-pdf.ts`

### "Rate limit errors"
- The script includes 2-second delays between agents
- You can increase the delay in the script if needed

---

**Created by**: Claude Code
**Date**: 2025-11-16
**Branch**: `claude/extract-brick-terra-pdf-01Bef3uoo3Ld3tpoQpvb6wn4`
