# Autonomous Session Protocol

**Version**: 1.0.0
**Purpose**: Define standardized autonomous PDF processing workflow
**Scope**: Single PDF extraction with full rigor, validation, and learning documentation

---

## Session Structure

Each autonomous session processes ONE PDF through the complete extraction pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTONOMOUS SESSION FLOW                     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  1. PDF SELECTION  │ ← Select next unprocessed PDF
    │     & LOCK         │ ← Create .lock file to prevent races
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  2. EXTRACTION     │ ← Run full 19-agent pipeline
    │   WITH RIGOR       │ ← Apply RIGOR_PROTOCOL.md
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  3. VALIDATION     │ ← Cross-field validation
    │   & ANALYSIS       │ ← Confidence scoring
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  4. LEARNING       │ ← Document insights
    │   DOCUMENTATION    │ ← Record challenges
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  5. COMMIT &       │ ← Git commit results
    │     UNLOCK         │ ← Remove .lock file
    └────────────────────┘
```

---

## Phase 1: PDF Selection & Lock

### 1.1 Generate Session ID

```bash
SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"
```

### 1.2 Find Next Unprocessed PDF

**Priority Order**:
1. PDFs in root `pdfs/` directory (test set - 20 PDFs)
2. PDFs in `pdfs/hjorthagen/` (homogeneous cluster - 15 PDFs)
3. PDFs in `pdfs/srs/` (heterogeneous cluster - 27 PDFs)

**Selection Logic**:
```bash
# Find all PDFs
all_pdfs=$(find pdfs/ -name "*.pdf" | sort)

# Exclude already processed (have .json in results/)
for pdf in $all_pdfs; do
  pdf_name=$(basename "$pdf" .pdf)
  if [ ! -f "results/${pdf_name}_ground_truth.json" ]; then
    NEXT_PDF="$pdf"
    break
  fi
done
```

### 1.3 Create Lock File

```bash
# Create lock to prevent concurrent processing
LOCK_FILE="results/locks/${pdf_name}.lock"
mkdir -p results/locks

# Write lock metadata
cat > "$LOCK_FILE" <<EOF
{
  "sessionId": "$SESSION_ID",
  "pdfPath": "$NEXT_PDF",
  "startTime": "$(date -Iseconds)",
  "status": "in_progress"
}
EOF
```

**Lock Timeout**: 30 minutes (auto-cleanup stale locks)

---

## Phase 2: Extraction with Rigor

### 2.1 Apply RIGOR_PROTOCOL.md

See [RIGOR_PROTOCOL.md](./RIGOR_PROTOCOL.md) for detailed extraction rules.

**Key Requirements**:
- All 19 agents must execute
- Minimum 15/19 agents must succeed
- Each field requires confidence score (0.0-1.0)
- Evidence pages must be tracked (1-based)
- Original strings must be preserved

### 2.2 Pipeline Execution

```typescript
// Run extraction workflow
const result = await extractGroundTruth({
  pdfPath: NEXT_PDF,
  sessionId: SESSION_ID,
  rigorLevel: 'MAXIMUM',
  agents: ALL_19_AGENTS,
  validation: 'STRICT'
});
```

### 2.3 Real-Time Monitoring

Track progress for each agent:
```
[chairman_agent]        ✓ COMPLETE (0.95 confidence, 4 fields, 2s)
[board_members_agent]   ✓ COMPLETE (0.88 confidence, 12 fields, 3s)
[financial_agent]       ⚠ PARTIAL (0.72 confidence, 8/11 fields, 5s)
[balance_sheet_agent]   ✗ FAILED (timeout after 60s)
...
```

---

## Phase 3: Validation & Analysis

### 3.1 Cross-Field Validation

**Balance Sheet Equation**:
```
total_assets_tkr === total_liabilities_tkr + total_equity_tkr
```
Tolerance: ±1 tkr (rounding)

**Sanity Checks**:
- `financial_year` between 2020-2025
- `total_revenue_tkr` > 0 (non-negative)
- `org_number` matches NNNNNN-NNNN format
- `postal_code` matches Swedish format (5 digits)
- All `_tkr` fields are integers or null

### 3.2 Confidence Analysis

**High Confidence** (≥0.85): Ready for production use
**Medium Confidence** (0.60-0.84): Flag for review
**Low Confidence** (<0.60): Requires human verification

**Summary Statistics**:
```json
{
  "totalFields": 95,
  "highConfidence": 78,      // 82%
  "mediumConfidence": 12,    // 13%
  "lowConfidence": 5,        // 5%
  "averageConfidence": 0.87
}
```

### 3.3 Consensus Analysis

Track agreement rates between models:
```json
{
  "dualAgreement": 82,       // Gemini + GPT agreed (86%)
  "claudeTiebreaker": 11,    // Claude resolved (12%)
  "noConsensus": 2           // Unresolved (2%)
}
```

---

## Phase 4: Learning Documentation

### 4.1 Create Session Report

Save to: `results/sessions/${SESSION_ID}_report.md`

**Template**:
```markdown
# Extraction Session Report

**Session ID**: ${SESSION_ID}
**PDF**: ${NEXT_PDF}
**Duration**: ${duration}
**Cost**: $${total_cost}
**Date**: ${timestamp}

## Summary

- **Total Fields Extracted**: 95
- **Success Rate**: 15/19 agents (79%)
- **Average Confidence**: 0.87
- **High Confidence Fields**: 78/95 (82%)

## Agent Performance

| Agent ID | Status | Fields | Confidence | Duration | Cost |
|----------|--------|--------|------------|----------|------|
| chairman_agent | ✓ SUCCESS | 4 | 0.95 | 2s | $0.02 |
| financial_agent | ⚠ PARTIAL | 8/11 | 0.72 | 5s | $0.05 |
| balance_sheet_agent | ✗ FAILED | 0 | - | 60s | $0.00 |
...

## Challenges Encountered

1. **Balance Sheet Agent Timeout**
   - **Issue**: Agent timed out after 60s
   - **Cause**: Large PDF (150 pages), complex tables
   - **Resolution**: Retry with increased timeout (120s)
   - **Outcome**: Success on retry

2. **Financial Agent Missing Fields**
   - **Issue**: Only extracted 8/11 fields
   - **Missing**: `maintenance_costs_tkr`, `admin_costs_tkr`, `other_costs_tkr`
   - **Cause**: Non-standard section naming ("Förvaltning" instead of "Driftskostnader")
   - **Learning**: Update agent prompt to include alternate Swedish terms

## Insights & Learnings

- **Document Structure**: This BRF uses non-standard section names
- **Data Quality**: High-quality tables, OCR not required
- **Edge Cases**: Board member roles in English instead of Swedish
- **Recommendations**: Add fallback section detection for non-standard docs

## Validation Results

- **Cross-Field Checks**: 12/12 passed ✓
- **Balance Sheet Equation**: PASS (0 tkr difference)
- **Sanity Checks**: 18/20 passed (2 warnings)
  - ⚠ Warning: `energy_class` = null (not found in document)
  - ⚠ Warning: `heating_type` = null (not found in document)

## Cost Breakdown

- **Sectionizer**: $0.05 (Gemini 2.0 Flash, 2 rounds)
- **19 Agents**: $0.68 (Gemini 2.5 Pro + GPT-4o)
- **Validation**: $0.02 (sanity checks)
- **Total**: $0.75

## Next Steps

1. Update `financial_agent.md` with alternate Swedish keywords
2. Increase timeout for `balance_sheet_agent` to 120s
3. Add fallback logic for missing energy data
```

### 4.2 Update Learnings Database

Append to: `results/learnings/all_sessions.jsonl`

```jsonl
{"session_id": "session_20251118_022214", "pdf": "brf_12345.pdf", "insights": ["non-standard section names", "english role titles"], "challenges": ["balance sheet timeout"], "cost": 0.75, "confidence": 0.87}
```

---

## Phase 5: Commit & Unlock

### 5.1 Verify Output Files

Check all files were created:
```bash
✓ results/${pdf_name}_ground_truth.json      # Main extraction result
✓ results/sessions/${SESSION_ID}_report.md   # Session report
✓ results/learnings/all_sessions.jsonl       # Updated learnings
```

### 5.2 Git Commit

```bash
git add results/
git commit -m "$(cat <<'EOF'
feat: Extract ground truth from ${pdf_name}

Session: ${SESSION_ID}
PDF: ${NEXT_PDF}
Success: 15/19 agents (79%)
Confidence: 0.87 average
Cost: $0.75

Key insights:
- Non-standard section naming detected
- Balance sheet agent timeout resolved via retry
- High-quality extraction (82% high confidence)

Files:
- results/${pdf_name}_ground_truth.json
- results/sessions/${SESSION_ID}_report.md
- results/learnings/all_sessions.jsonl
EOF
)"
```

### 5.3 Remove Lock File

```bash
rm "$LOCK_FILE"
echo "Session $SESSION_ID complete - lock released"
```

### 5.4 Push to Remote

```bash
git push -u origin claude/process-pdf-automation-01LwEc6m96Ve4VtvqAVNeLSw
```

---

## Error Handling

### Abort Conditions

**ABORT** session if:
1. Lock file already exists (>30 min old = stale, can override)
2. No unprocessed PDFs remain
3. <10/19 agents succeed (below threshold)
4. Critical validation failures (balance sheet equation off by >10%)
5. Cost exceeds $2.00 per PDF (budget overrun)

### Recovery Actions

**If agent fails**:
- Retry once with 2x timeout
- If still fails, mark as PARTIAL and continue

**If validation fails**:
- Document failure in session report
- Mark extraction as LOW_CONFIDENCE
- Continue with commit (don't discard partial data)

**If commit fails**:
- Keep lock file active
- Log error
- Manual intervention required

---

## Success Criteria

Session is **successful** if:
- ✅ ≥15/19 agents succeed
- ✅ ≥70% fields have high confidence (≥0.85)
- ✅ Balance sheet equation passes (±1 tkr tolerance)
- ✅ Cost ≤$1.50 per PDF
- ✅ All output files created
- ✅ Git commit successful
- ✅ Lock file removed

---

## Autonomous Execution

**For Claude Code**:

```bash
# Invoke autonomous session
AUTONOMOUS SESSION - PROCESS NEXT PDF

Protocol: AUTONOMOUS_SESSION_PROTOCOL.md
Rigor: RIGOR_PROTOCOL.md
Mode: FULL AUTOMATION

# Claude will:
# 1. Generate session ID
# 2. Select next PDF and create lock
# 3. Run extraction with rigor
# 4. Validate and analyze results
# 5. Document learnings
# 6. Commit and unlock
```

---

## Monitoring & Metrics

### Per-Session Metrics

Track in session report:
- Duration (target: <15 min)
- Cost (target: <$1.00)
- Success rate (target: ≥15/19 agents)
- Confidence (target: ≥0.85 average)
- Validation pass rate (target: 100%)

### Cumulative Metrics

Track across all sessions:
- Total PDFs processed
- Average cost per PDF
- Average confidence
- Agent reliability (% success per agent)
- Most common challenges

---

**Protocol Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintained By**: Autonomous extraction system
