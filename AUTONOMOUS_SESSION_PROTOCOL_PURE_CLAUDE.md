# Autonomous Session Protocol: Pure Claude Edition

**Version**: 1.0.0
**Session Type**: FULL_AUTOMATION
**Mode**: 100% CLAUDE - No Human Intervention Required
**Generated**: 2025-11-18

---

## Protocol Overview

This protocol defines how Claude Code autonomously processes Swedish BRF annual reports from PDF to structured JSON ground truth, using the 19-agent consensus extraction system.

## Session ID Format

```
session_YYYYMMDD_HHMMSS
Example: session_20251118_143022
```

## 7-Step Autonomous Pipeline

### STEP 1: PDF Selection & Lock

**Objective**: Select next unprocessed PDF and acquire exclusive lock

**Actions**:
1. Check `processing/locks/` directory for existing locks
2. Check `processing/completed/` directory for finished PDFs
3. Select first PDF from queue that is:
   - Not locked (no `.lock` file)
   - Not completed (no `.done` file)
   - Valid PDF file (readable, non-corrupted)
4. Create lock file: `processing/locks/{pdf_id}.lock`
   - Contains: session ID, start time, Claude instance ID
   - Format: JSON with metadata

**Lock File Structure**:
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_143022",
  "started_at": "2025-11-18T14:30:22Z",
  "locked_by": "claude_code_autonomous",
  "status": "processing"
}
```

**Failure Handling**:
- If lock exists >24 hours: Assume stale, override with warning
- If lock exists <24 hours: Skip PDF, select next
- If no PDFs available: STOP and report completion

---

### STEP 2: PDF Reading & Initial Analysis

**Objective**: Load PDF and perform preliminary analysis

**Actions**:
1. Verify PDF integrity (file size >0, readable format)
2. Extract metadata:
   - Page count
   - File size
   - Document title (if available)
   - BRF name (parse from filename)
3. Perform quick scan for:
   - Language confirmation (must be Swedish)
   - Document type (must be "årsredovisning" = annual report)
   - Year detection (2023 or 2024 expected)
4. Update lock file with metadata

**Quality Checks**:
- Page count: 10-50 pages (typical BRF report)
- File size: 0.3-20 MB (reasonable range)
- Swedish text detected: Yes/No
- Contains financial tables: Yes/No

**Early Termination Criteria**:
- Wrong language (not Swedish)
- Wrong document type (not annual report)
- Corrupted PDF
- Action: Move to `processing/skipped/` with reason

---

### STEP 3: Multi-Pass Extraction (19 Specialized Agents)

**Objective**: Execute 19-agent consensus extraction with full context

#### 3.1 Vision Sectionizer (Round 1 + Round 2)

**Technology**: Gemini 2.0 Flash (low-cost, vision-optimized)

**Round 1 - L1 Section Detection**:
- Input: Full PDF (all pages)
- Output: 9 top-level sections
  - Förvaltningsberättelse
  - Resultaträkning
  - Balansräkning
  - Noter
  - Styrelse
  - Revisionsberättelse
  - Etc.

**Round 2 - L2/L3 Subsection Extraction**:
- Input: Each L1 section
- Output: 50+ subsections with page ranges
  - Example: "Not 1: Redovisningsprinciper" → pages 12-13

**Cost**: ~$0.05 per PDF (2 rounds × Gemini Flash pricing)

#### 3.2 Agent Orchestration

**Router Logic**:
```typescript
const routing = {
  financial_agent: subsections.filter(s =>
    s.title.match(/Resultat|Intäkter|Kostnader|Nettoomsättning/)
  ),
  balance_sheet_agent: subsections.filter(s =>
    s.title.match(/Balans|Tillgångar|Skulder|Eget kapital/)
  ),
  chairman_agent: subsections.filter(s =>
    s.title.match(/Styrelse|Ordförande|Förvaltning/)
  ),
  // ... 16 more agents
}
```

**Execution**:
- **Batch Size**: 18 agents per batch (avoid rate limits)
- **Consensus Model**: 2-3 models per field
  - Model 1: Gemini 2.5 Pro
  - Model 2: GPT-4o
  - Model 3 (tiebreaker): Claude 3.7 Sonnet

#### 3.3 Consensus Rules

**Dual Agreement (HIGH Confidence)**:
- Gemini + GPT extract same value
- Confidence: 0.90-0.99
- No tiebreaker needed
- ~85% of fields expected

**Tiebreaker Required (MEDIUM Confidence)**:
- Gemini ≠ GPT
- Claude 3.7 Sonnet acts as judge
- Confidence: 0.60-0.89
- ~10-15% of fields expected

**No Agreement (LOW Confidence)**:
- All 3 models disagree
- Confidence: 0.00-0.59
- Field flagged for human review
- <5% of fields expected

#### 3.4 Field Extraction Format

Every field extracted follows this structure:

```typescript
{
  "value": 12500, // Normalized value (tkr converted)
  "confidence": 0.95, // Consensus-based score
  "evidence_pages": [5, 6], // 1-based page numbers
  "original_string": "12,5 MSEK", // Exact text from PDF
  "extraction_method": "dual_agreement", // or "tiebreaker" or "low_consensus"
  "models_agreement": {
    "gemini": 12500,
    "gpt4": 12500,
    "claude": null // null if not needed
  }
}
```

**Key Features**:
- `value`: Normalized (e.g., "12,5 MSEK" → 12500 tkr)
- `confidence`: 0.0-1.0 scale
- `evidence_pages`: WHERE the value was found
- `original_string`: Exact extraction for verification

---

### STEP 4: Validation & Quality Checks

**Objective**: Ensure extracted data passes sanity checks

#### 4.1 Schema Validation

**Tool**: Zod schemas (TypeScript validation)

**Checks**:
- All required fields present (even if null)
- Data types correct (numbers are numbers, strings are strings)
- Swedish format validation:
  - Org numbers: `NNNNNN-NNNN` (6 digits - 4 digits)
  - Postal codes: `NNN NN` (3 digits space 2 digits)
  - Currency: Always in `tkr` (thousands of SEK)

#### 4.2 Cross-Field Validation

**Accounting Rules**:
```typescript
// Balance sheet must balance
assets_total ≈ liabilities_total + equity_total (±1 tkr tolerance)

// Revenue should be positive
total_revenue_tkr > 0

// Year should be recent
fiscal_year ∈ [2023, 2024]

// Member count should be reasonable
member_count > 0 && member_count < 10000
```

**Confidence Rules**:
- If validation fails + confidence <0.7: Flag field as LOW
- If validation fails + confidence ≥0.7: Trigger re-extraction
- If validation passes: Keep confidence as-is

#### 4.3 Completeness Check

**Target**: 70%+ field coverage

```typescript
const completeness = {
  total_fields: 95,
  extracted_non_null: 68,
  high_confidence: 55,
  medium_confidence: 10,
  low_confidence: 3,
  null_or_missing: 27,
  completeness_rate: 68/95 = 71.6% // PASS
}
```

**Acceptance Criteria**:
- ✅ Completeness ≥70%
- ✅ High confidence ≥60% of extracted fields
- ✅ Low confidence ≤10% of extracted fields

**Failure Handling**:
- If completeness <50%: Mark PDF as "difficult", retry with extended context
- If still fails: Move to `processing/manual_review/`

---

### STEP 5: Learning Documentation

**Objective**: Capture insights for continuous improvement

#### 5.1 Extraction Metrics

**Document**:
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_143022",
  "metrics": {
    "duration_seconds": 487,
    "total_cost_usd": 0.82,
    "total_fields": 95,
    "extracted_fields": 68,
    "high_confidence_fields": 55,
    "medium_confidence_fields": 10,
    "low_confidence_fields": 3,
    "completeness_rate": 0.716,
    "consensus_breakdown": {
      "dual_agreement": 58,
      "tiebreaker_used": 8,
      "no_consensus": 2
    }
  }
}
```

#### 5.2 Pattern Recognition

**Document Patterns Observed**:
- Layout type: "modern_visual" | "traditional_text" | "financial_heavy"
- Table detection success: 90% | 75% | 50%
- Common challenges:
  - "Multi-column financial tables required OCR fallback"
  - "Chairman name in image caption, not text"
  - "Energy certificate in appendix, not main report"

**Model Performance**:
- Best for financial extraction: GPT-4o (92% accuracy)
- Best for Swedish text: Gemini 2.5 Pro (95% accuracy)
- Best for board member names: Claude 3.7 Sonnet (88% accuracy)

#### 5.3 Failure Analysis

**If fields failed**:
```json
{
  "failed_fields": [
    {
      "field": "energy_class",
      "reason": "Not found in document",
      "searched_sections": ["Fastighetsuppgifter", "Teknisk information"],
      "recommendation": "May be in separate energy certificate document"
    }
  ]
}
```

**Save to**: `learning/extraction_log_{session_id}.json`

---

### STEP 6: Meta-Analysis (Automatic at Milestones)

**Trigger Points**: After 10, 20, 30, 40, 50 completed PDFs

**Objective**: Identify systemic patterns and optimization opportunities

#### 6.1 Aggregate Statistics

**Compute**:
```typescript
const metaStats = {
  total_pdfs_processed: 20,
  average_duration: 8.2, // minutes
  average_cost: 0.78, // USD
  average_completeness: 0.74, // 74%

  field_success_rates: {
    "total_revenue_tkr": 0.95, // 19/20 PDFs
    "chairman_name": 0.90, // 18/20 PDFs
    "energy_class": 0.45, // 9/20 PDFs - LOW!
  },

  model_agreement_rates: {
    "gemini_gpt_agreement": 0.87,
    "tiebreaker_needed": 0.11,
    "no_consensus": 0.02
  }
}
```

#### 6.2 Optimization Recommendations

**Auto-Generated Insights**:
```markdown
## Meta-Analysis: 20 PDFs Completed

### Key Findings
1. **energy_class** has 45% success rate (9/20 PDFs)
   - Recommendation: Add fallback search in "Bilaga" sections
   - Estimated improvement: +30% success rate

2. **board_member_roles** has high disagreement (20% tiebreaker rate)
   - Recommendation: Enhance prompt with Swedish title examples
   - Models confused "suppleant" vs "ordinarie"

3. **Cost efficiency**: Average $0.78/PDF (under $1 target ✓)
   - Gemini Flash sectionizer saves ~$0.15 vs GPT-4o Vision

### Action Items
- [ ] Update energy_agent prompt to search appendices
- [ ] Add Swedish governance term glossary to board_members_agent
- [ ] Consider batch processing PDFs to reduce API overhead
```

**Save to**: `learning/meta_analysis_{milestone}.md`

---

### STEP 7: Commit & Unlock

**Objective**: Persist results and release lock

#### 7.1 Save Extraction Results

**File Structure**:
```
results/
  ├── completed/
  │   ├── 82665_årsredovisning_lund_brf_vipemöllan_3.json  # Full extraction
  │   └── ...
  ├── metadata/
  │   ├── 82665_metadata.json  # Session metadata
  │   └── ...
  └── learning/
      ├── extraction_log_session_20251118_143022.json
      └── ...
```

**Extraction JSON** (simplified):
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_143022",
  "processing_completed_at": "2025-11-18T14:38:29Z",

  "governance": {
    "chairman_name": {
      "value": "Anna Svensson",
      "confidence": 0.95,
      "evidence_pages": [3],
      "original_string": "Ordförande: Anna Svensson"
    }
    // ... more governance fields
  },

  "financial": {
    "total_revenue_tkr": {
      "value": 12500,
      "confidence": 0.92,
      "evidence_pages": [5, 6],
      "original_string": "Nettoomsättning: 12 500 tkr"
    }
    // ... more financial fields
  },

  "summary": {
    "total_fields_extracted": 68,
    "high_confidence_count": 55,
    "completeness_rate": 0.716,
    "total_cost_usd": 0.82,
    "duration_seconds": 487
  }
}
```

#### 7.2 Update Processing Status

**Create completion marker**:
```bash
touch processing/completed/82665_årsredovisning_lund_brf_vipemöllan_3.done
```

**Update lock file** (before deletion):
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_143022",
  "started_at": "2025-11-18T14:30:22Z",
  "completed_at": "2025-11-18T14:38:29Z",
  "status": "completed",
  "final_completeness": 0.716
}
```

**Then delete lock**:
```bash
rm processing/locks/82665_årsredovisning_lund_brf_vipemöllan_3.lock
```

#### 7.3 Git Commit

**Commit Message Format**:
```
chore(extraction): Process PDF 82665 - BRF Vipemöllan 3

- Session: session_20251118_143022
- Completeness: 71.6% (68/95 fields)
- High confidence: 55 fields
- Duration: 8m 7s
- Cost: $0.82

Key extractions:
- Revenue: 12,500 tkr
- Members: 142
- Chairman: Anna Svensson
```

**Git commands**:
```bash
git add results/completed/82665_*.json
git add results/metadata/82665_*.json
git add learning/extraction_log_*.json
git add processing/completed/82665_*.done
git commit -m "chore(extraction): Process PDF 82665..."
git push origin claude/autonomous-pdf-processing-{session_id}
```

#### 7.4 Session Summary

**Print to console**:
```
✅ PDF PROCESSING COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PDF:         82665_årsredovisning_lund_brf_vipemöllan_3.pdf
Session:     session_20251118_143022
Duration:    8m 7s
Cost:        $0.82

EXTRACTION RESULTS:
  Total fields:    95
  Extracted:       68 (71.6%)
  High confidence: 55 (80.9%)
  Medium:          10 (14.7%)
  Low:             3 (4.4%)

CONSENSUS BREAKDOWN:
  Dual agreement:  58 fields (85.3%)
  Tiebreaker used: 8 fields (11.8%)
  No consensus:    2 fields (2.9%)

OUTPUT SAVED:
  ✓ results/completed/82665_*.json
  ✓ results/metadata/82665_*.json
  ✓ learning/extraction_log_*.json

NEXT PDF:
  Queued: 79446_årsredovisning_stockholm_brf_roslagsbanan_12.pdf
```

---

## Error Handling & Recovery

### Scenario 1: API Rate Limit Hit

**Symptom**: 429 Too Many Requests from OpenRouter/OpenAI

**Action**:
1. Wait exponential backoff: 2s → 4s → 8s → 16s
2. Retry up to 4 times
3. If still failing: Switch to alternative model
   - Gemini 2.5 Pro → Gemini 1.5 Pro
   - GPT-4o → GPT-4o-mini
4. If all fail: Pause session for 60 seconds, resume

### Scenario 2: PDF Corruption Detected

**Symptom**: Cannot read PDF, parsing errors

**Action**:
1. Try alternative PDF parser (pdf-parse → pdf-lib)
2. If still fails: Mark PDF as corrupted
3. Move to `processing/corrupted/` with error log
4. Continue to next PDF

### Scenario 3: Consensus Failure (>20% no agreement)

**Symptom**: Too many fields with 3-way disagreement

**Action**:
1. Increase context window for agents (more pages)
2. Re-run extraction with extended prompts
3. If still fails: Mark as "difficult PDF"
4. Save partial results, flag for manual review

### Scenario 4: Session Crash

**Symptom**: Claude Code crashes mid-extraction

**Action**:
1. On restart, check for stale locks (>24 hours)
2. Resume from last checkpoint:
   - If sectionizer complete: Resume from agent orchestration
   - If agents partially complete: Resume from failed agent
3. Log crash in `learning/crashes/crash_{timestamp}.json`

---

## Cost & Time Budgets

### Per PDF Budget

**Target**: $0.75-1.00 per PDF, 7-10 minutes

**Breakdown**:
- Sectionizer (2 rounds): $0.05, ~30 seconds
- 19 Agents (dual model): $0.65, ~6 minutes
- Tiebreakers (~10% fields): $0.10, ~1 minute
- Validation & saving: $0.00, ~30 seconds

**Hard Limits**:
- Max cost: $2.00 (stop if exceeded)
- Max duration: 20 minutes (timeout)

### Batch Budget (20 PDFs)

**Target**: $15-20, ~3 hours

**Monitoring**:
- Track running total every 5 PDFs
- If >$25 after 20 PDFs: Investigate cost overruns
- If <$10 after 20 PDFs: Verify quality not sacrificed

---

## Success Metrics

### Per-PDF Success
- ✅ Completeness ≥70%
- ✅ High confidence ≥80% of extracted fields
- ✅ Cost ≤$1.00
- ✅ Duration ≤10 minutes

### Batch Success (20+ PDFs)
- ✅ Average completeness ≥75%
- ✅ Average cost ≤$0.90
- ✅ Field success rate ≥85% (fields found in 17/20 PDFs)
- ✅ Zero manual intervention required

---

## Autonomous Decision-Making Rules

Claude Code operates fully autonomously using these rules:

1. **PDF Selection**: Always pick first unlocked, uncompleted PDF
2. **Model Fallback**: If primary model fails, use backup immediately
3. **Quality Threshold**: If completeness <50%, retry once with extended context
4. **Cost Control**: If cost >$1.50, switch to cheaper models for remaining agents
5. **Time Management**: If duration >15 minutes, skip optional validation steps
6. **Error Recovery**: If same error occurs 3 times, skip PDF and flag for review

**No human intervention required for**:
- API failures (auto-retry with backoff)
- Missing fields (mark as null, continue)
- Low confidence (<0.5, flag but continue)
- PDF format issues (try alternative parser)

**Human review only for**:
- Batch completion summary (review after 20 PDFs)
- Meta-analysis insights (review at milestones)
- Persistent failures (>3 PDFs fail consecutively)

---

## Protocol Compliance Checklist

Before completing a session, verify:

- [x] PDF locked at start
- [x] All 19 agents executed
- [x] Consensus mechanism applied
- [x] Validation checks passed
- [x] Results saved to correct paths
- [x] Learning log created
- [x] Git commit made
- [x] Lock removed
- [x] Next PDF queued (or completion reported)

---

**END OF PROTOCOL**

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintained by**: Claude Code Autonomous System
