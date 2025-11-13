# Zelda Meets Claude: Autonomous Ground Truth Generation System

**Purpose**: Enable Claude (via Claude Code) to autonomously extract structured data from Swedish BRF (housing cooperative) annual reports using a 19-agent consensus system.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BRF Annual Report PDF                     │
│              (Swedish housing cooperative docs)              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Step 1: Vision Sectionizer                     │
│  - Round 1: Gemini 2.0 Flash detects L1 sections            │
│  - Round 2: Gemini 2.0 Flash extracts L2+L3 subsections     │
│  - Output: Hierarchical document map (9 L1 + 50+ L2/L3)     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Step 2: Orchestrator                          │
│  - Routes subsections to specialized agents                  │
│  - Maps 109 subsections → 19 agents                         │
│  - Example: "Styrelse" → chairman_agent + board_members     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Step 3: 19 Specialist Agents (Consensus)            │
│                                                              │
│  For EACH agent (e.g., financial_agent):                    │
│    1. Gemini 2.5 Pro extracts fields → JSON                 │
│    2. GPT-4o extracts fields → JSON                         │
│    3. Claude 3.7 Sonnet acts as tiebreaker if needed        │
│                                                              │
│  Consensus Rules:                                            │
│    - Dual agreement (Gemini + GPT agree) → HIGH confidence  │
│    - Claude tiebreaker → MEDIUM confidence                  │
│    - No agreement → LOW confidence                          │
│                                                              │
│  19 Agents:                                                  │
│    - chairman_agent, board_members_agent, auditor_agent     │
│    - financial_agent, balance_sheet_agent, cashflow_agent   │
│    - property_agent, fees_agent, operational_agent          │
│    - notes_*, events_agent, audit_agent, loans_agent        │
│    - energy_agent, operating_costs_agent, key_metrics       │
│    - leverantörer_agent, reserves_agent                     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Step 4: Auditor Agent                          │
│  - Cross-field validation (e.g., assets = liabilities)      │
│  - Sanity checks (revenue > 0, year = 2023-2024)           │
│  - Swedish format validation (org numbers, postal codes)    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Output: Ground Truth JSON                   │
│  - 95+ fields extracted with confidence scores              │
│  - Evidence pages tracked (1-based page numbers)            │
│  - Consensus metadata (which models agreed)                 │
│  - Ready for DSPy training or validation                    │
└─────────────────────────────────────────────────────────────┘
```

## Dataset

This repository contains **62 Swedish BRF annual reports (282 MB)** organized into three clusters:

### Test Set (20 PDFs)
Located in: `pdfs/` (root level)
- **Selection**: Systematic sampling (every 10th PDF from 200-PDF training set)
- **Diversity**: 100% cluster coverage across all 20 K-means clusters
- **Distribution**: 55% comprehensive reports, 30% visual summaries, 15% financial heavy
- **Purpose**: Balanced test set for ground truth extraction validation
- **Source**: K-means clustering from 26,342 BRF corpus
- **Metadata**: `pdfs/selected_20_pdfs.json`

### Hjorthagen Cluster (15 PDFs)
Located in: `pdfs/hjorthagen/`
- **Geographic Cluster**: Hjorthagen district in Stockholm
- **Use Case**: Homogeneous training set (same neighborhood, similar characteristics)
- **Purpose**: Initial model training and baseline accuracy measurement
- **Characteristics**: Consistent document structure, similar BRF sizes

### SRS Cluster (27 PDFs)
Located in: `pdfs/srs/`
- **Geographic Cluster**: Diverse Stockholm locations (SRS district focus)
- **Use Case**: Heterogeneous validation set
- **Purpose**: Generalization testing across different BRF types and formats
- **Characteristics**: Varied document complexity and reporting styles

**Total**: 62 PDFs (20 test + 15 Hjorthagen + 27 SRS) = 282 MB

## Pydantic Schemas (v2)

Located in: `schemas/`

### Core Models
- `ExtractionField` - Base field with value + confidence + evidence
- `FinancialData` - 11 _tkr fields (revenue, costs, etc.)
- `BalanceSheet` - Assets, liabilities, equity
- `GovernanceData` - Board members, chairman, auditor
- `PropertyData` - Building info, energy class, heating
- `FullExtractionResult` - Complete output schema

**Key Features**:
- Optional fields (nulls allowed for missing data)
- Confidence tracking (0.0-1.0 scale)
- Evidence pages (1-based page numbers)
- Swedish format validators (org numbers: NNNNNN-NNNN)

## Agent Prompts

Located in: `agents/`

Each agent prompt includes:
1. **Role definition**: What the agent specializes in
2. **Target fields**: Exact Pydantic fields to extract
3. **Swedish keywords**: "Styrelseordförande", "Årsavgift", etc.
4. **WHERE TO LOOK**: Specific sections to scan
5. **Anti-hallucination rules**: Only extract if explicitly visible
6. **JSON structure**: Example output with _original pairing

Example: `financial_agent.md` extracts 11 _tkr fields with currency normalization.

## Orchestrator Logic

Located in: `orchestrator/`

**Routing Algorithm**:
```python
def route_subsections_to_agents(subsections):
    routing = {
        "chairman_agent": subsections matching ["Styrelse", "Förvaltning"],
        "financial_agent": subsections matching ["Resultat", "Intäkter", "Kostnader"],
        "balance_sheet_agent": subsections matching ["Balans", "Tillgångar", "Skulder"],
        # ... 16 more agents
    }
    return routing
```

**Smart Routing**:
- One subsection → multiple agents (e.g., "Styrelse" → chairman + board_members)
- Overlapping coverage for redundancy
- Page range optimization (agents only see relevant pages)

## Running the System

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Add your API keys:
# - ANTHROPIC_API_KEY (for Claude 3.7 Sonnet)
# - OPENAI_API_KEY (for GPT-4o)
# - GEMINI_API_KEY (for Gemini 2.5 Pro + 2.0 Flash)
```

### Extract Single PDF

```bash
# Run ground truth extraction on one PDF
npx tsx scripts/extract-single-pdf.ts \
  --pdf pdfs/hjorthagen/brf_example.pdf \
  --output results/brf_example_ground_truth.json
```

**Expected Output**:
```json
{
  "pdfId": "brf_example",
  "agents": [
    {
      "agentId": "financial_agent",
      "consensusLevel": "HIGH",
      "overallConfidence": 0.92,
      "data": {
        "total_revenue_tkr": {
          "value": 12500,
          "confidence": 0.95,
          "evidence_pages": [5, 6],
          "source": "dual_agreement",
          "original_string": "12,5 MSEK"
        }
        // ... 10 more fields
      }
    }
    // ... 18 more agents
  ],
  "summary": {
    "totalFields": 95,
    "highConfidence": 78,
    "mediumConfidence": 12,
    "lowConfidence": 5,
    "totalCost": 0.87,
    "duration": "8m 32s"
  }
}
```

### Batch Extract All PDFs

```bash
# Extract all 20 PDFs (Hjorthagen + NDS)
npx tsx scripts/extract-batch.ts \
  --input pdfs/ \
  --output results/ground_truth_batch/
```

**Expected**:
- Duration: ~3 hours (20 PDFs × 8-10 min each)
- Cost: ~$15-20 ($0.75-1.00 per PDF)
- Output: 20 JSON files with complete ground truth data

## Cost Breakdown

**Per PDF** (~$0.75-1.00):
- Step 1 (Sectionizer): $0.05 (Gemini 2.0 Flash, 2 rounds)
- Step 2 (Orchestrator): $0.00 (rule-based, no LLM)
- Step 3 (19 Agents × 2 models): $0.65 (Gemini 2.5 Pro + GPT-4o)
  - 18 agents: Gemini + GPT only (dual agreement)
  - 1 agent: +Claude tiebreaker if disagreement
- Step 4 (Auditor): $0.05 (validation rules)

**Batch (20 PDFs)**: $15-20

## Success Metrics

**Target Accuracy**: 95%+ field-level accuracy
- Measured against human-verified ground truth
- High confidence fields: >98% accuracy
- Medium confidence fields: >90% accuracy
- Low confidence fields: flagged for human review

**Consensus Statistics** (from Phase 2 testing):
- Dual agreement rate: 85-90% (Gemini + GPT agree)
- Claude tiebreaker needed: 10-15% of fields
- Unresolved disagreements: <5%

## Failure Modes & Fixes

### Issue 1: Database Connection Timeout
**Symptom**: PostgreSQL connection closes during long extraction (15-20 min)
**Fix**: `lib/db-health.ts` - Health monitoring + keep-alive pings
**Status**: ✅ RESOLVED (Fix #7)

### Issue 2: OpenRouter Rate Limits
**Symptom**: 500 errors when running >10 concurrent requests
**Fix**: Batch execution (18 agents per batch) + exponential backoff
**Status**: ✅ RESOLVED (Fix #5 + Fix #6)

### Issue 3: Cost Tracking Errors
**Symptom**: response.usage undefined → crashes
**Fix**: Optional chaining + two-phase commit
**Status**: ✅ RESOLVED (Fix #4)

**All Fixes Deployed**: 7/7 fixes integrated (see `docs/FIXES_SUMMARY.md`)

## Output Format: JSONL for DSPy

```bash
# Convert ground truth JSON → JSONL for DSPy training
npx tsx scripts/export-to-jsonl.ts \
  --input results/ground_truth_batch/ \
  --output training_data/ground_truth.jsonl
```

**JSONL Format**:
```jsonl
{"pdf_id": "brf_1", "agent": "financial_agent", "images": [...], "ground_truth": {...}}
{"pdf_id": "brf_2", "agent": "financial_agent", "images": [...], "ground_truth": {...}}
```

## Claude Code Instructions

**To run this system autonomously**:

1. **Setup**:
   ```bash
   cd /path/to/ZeldaMeetsClaude
   npm install
   cp .env.example .env
   # Add API keys to .env
   ```

2. **Test with one PDF**:
   ```bash
   npx tsx scripts/extract-single-pdf.ts --pdf pdfs/hjorthagen/[first_pdf].pdf
   ```

3. **Verify output**:
   - Check `results/` for generated JSON
   - Validate high confidence % (should be >80%)
   - Review cost (should be ~$0.75-1.00)

4. **Run full batch** (if test succeeds):
   ```bash
   npx tsx scripts/extract-batch.ts
   ```

5. **Export to JSONL**:
   ```bash
   npx tsx scripts/export-to-jsonl.ts
   ```

## Key Files Reference

- `agents/` - 19 agent prompt definitions
- `schemas/` - Pydantic v2 models (TypeScript equivalents)
- `orchestrator/` - Section routing logic
- `lib/active-learning/` - Core extraction workflow
- `scripts/` - Executable extraction scripts
- `docs/` - Detailed documentation

## Questions?

See `docs/TROUBLESHOOTING.md` for common issues and solutions.

---

**Built with**: Claude Code, Gemini 2.5 Pro, GPT-4o, TypeScript, Next.js 15
**License**: MIT
**Contact**: See repository owner
