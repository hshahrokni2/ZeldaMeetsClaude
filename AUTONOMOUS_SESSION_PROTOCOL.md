# Autonomous Session Protocol

**Version**: 1.0.0
**Purpose**: Enable fully autonomous PDF processing with locking, tracking, and quality assurance

## Overview

This protocol defines the workflow for autonomous PDF extraction sessions. Each session processes one PDF from selection to commit, with complete traceability and quality control.

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS SESSION                        │
│                                                              │
│  1. INITIALIZE → 2. LOCK → 3. EXTRACT → 4. VALIDATE →      │
│  5. LEARN → 6. COMMIT → 7. UNLOCK                          │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Session Initialization

**Duration**: < 5 seconds
**Cost**: $0.00

### Actions:
1. Generate session ID: `session_YYYYMMDD_HHMMSS`
2. Create session directory: `sessions/{session_id}/`
3. Initialize session metadata:
   ```json
   {
     "sessionId": "session_20251118_143022",
     "startTime": "2025-11-18T14:30:22Z",
     "status": "initializing",
     "pdfPath": null,
     "gitBranch": "claude/process-pdf-automation-{session_id}"
   }
   ```

### Outputs:
- `sessions/{session_id}/metadata.json`
- Session ID for tracking

---

## Phase 2: PDF Selection & Lock

**Duration**: < 10 seconds
**Cost**: $0.00

### Selection Strategy:

1. **Check for processed PDFs**:
   - Scan `results/` for existing extraction results
   - Scan `locks/` for currently locked PDFs

2. **Priority order**:
   - Test set PDFs first (`pdfs/*.pdf`)
   - Then Hjorthagen cluster (`pdfs/hjorthagen/*.pdf`)
   - Then SRS cluster (`pdfs/srs/*.pdf`)

3. **Skip PDFs that are**:
   - Already processed (result exists in `results/`)
   - Currently locked (`.lock` file exists)
   - Failed more than 3 times

### Lock Creation:

Create lock file: `locks/{pdf_basename}.lock`

```json
{
  "sessionId": "session_20251118_143022",
  "pdfPath": "pdfs/hjorthagen/brf_79568.pdf",
  "lockedAt": "2025-11-18T14:30:25Z",
  "lockedBy": "claude-autonomous",
  "expiresAt": "2025-11-18T15:30:25Z"
}
```

### Lock Rules:
- Lock expires after 60 minutes (safety timeout)
- If stale lock detected (> 60 min old), break and reacquire
- Session must hold valid lock throughout extraction

### Outputs:
- `locks/{pdf_basename}.lock`
- Updated session metadata with PDF path

---

## Phase 3: Extraction with Rigor

**Duration**: 8-15 minutes
**Cost**: $0.75-1.00 per PDF

### Process:

Follows the 4-step extraction workflow:

1. **Vision Sectionizer** (Gemini 2.0 Flash)
   - Detect L1 sections (Förvaltningsberättelse, Resultaträkning, etc.)
   - Extract L2/L3 subsections
   - Output: Hierarchical section map

2. **Orchestrator** (Rule-based + LLM)
   - Route sections to 19 specialist agents
   - Map subsections → agents
   - Optimize page ranges

3. **Agent Execution** (3-model consensus)
   - For each agent:
     - Model 1: Gemini 2.5 Pro → extraction
     - Model 2: GPT-4o → extraction
     - Model 3: Claude 3.7 Sonnet → tiebreaker (if needed)
   - Consensus rules:
     - Dual agreement (Gemini + GPT agree) → HIGH confidence
     - Claude tiebreaker → MEDIUM confidence
     - No agreement → LOW confidence

4. **Validation & Aggregation**
   - Cross-field validation
   - Swedish format checks (org numbers, postal codes)
   - Confidence scoring

### Rigor Requirements:

See `RIGOR_PROTOCOL.md` for detailed quality checks.

### Outputs:
- `sessions/{session_id}/extraction_result.json` (full agent outputs)
- `sessions/{session_id}/section_map.json` (sectionizer output)
- `sessions/{session_id}/consensus_report.json` (model agreement stats)
- `results/{pdf_basename}_ground_truth.json` (final output)

---

## Phase 4: Validation & Analysis

**Duration**: 30-60 seconds
**Cost**: $0.00

### Quality Checks:

1. **Field Coverage**:
   - ✅ Extracted ≥ 70 fields (target: 95+)
   - ✅ High confidence % ≥ 70% (target: 80-85%)
   - ✅ No critical validation errors

2. **Consensus Quality**:
   - ✅ Dual agreement rate ≥ 75% (target: 85-90%)
   - ✅ Claude tiebreaker needed ≤ 25%
   - ✅ Unresolved disagreements < 10%

3. **Cost & Duration**:
   - ✅ Total cost ≤ $1.50 (target: $0.75-1.00)
   - ✅ Duration ≤ 20 minutes (target: 8-12 min)

4. **Data Integrity**:
   - ✅ All required JSON fields present
   - ✅ No malformed ExtractionField wrappers
   - ✅ Evidence pages valid (1-based, within PDF bounds)

### Analysis Report:

Generate: `sessions/{session_id}/analysis_report.md`

```markdown
# Extraction Analysis Report

**PDF**: brf_79568.pdf
**Session**: session_20251118_143022
**Status**: ✅ SUCCESS

## Summary
- Fields extracted: 87/95 (92%)
- High confidence: 74/87 (85%)
- Medium confidence: 10/87 (11%)
- Low confidence: 3/87 (3%)
- Total cost: $0.89
- Duration: 9m 14s

## Agent Performance
- Successful: 18/19 (95%)
- Failed: 1/19 (leverantörer_agent - no matching section)

## Consensus Statistics
- Dual agreement: 78/87 (90%)
- Claude tiebreaker: 7/87 (8%)
- Unresolved: 2/87 (2%)

## Quality Assessment
✅ PASS - All quality gates met
```

### Outputs:
- `sessions/{session_id}/analysis_report.md`
- `sessions/{session_id}/quality_metrics.json`

---

## Phase 5: Learning Documentation

**Duration**: 1-2 minutes
**Cost**: $0.00

### Learnings to Capture:

1. **Edge Cases Found**:
   - Unusual document structures
   - New section naming patterns
   - Missing expected fields

2. **Agent Failures**:
   - Which agents failed and why
   - Missing sections
   - Data format surprises

3. **Consensus Disagreements**:
   - Fields where models disagreed significantly
   - Ambiguous data that needed tiebreaker
   - Potential prompt improvements

4. **Swedish Language Variations**:
   - New keywords discovered
   - Regional terminology
   - Format variations

### Learning Log:

Append to: `LEARNINGS.md`

```markdown
## Session: session_20251118_143022 | PDF: brf_79568.pdf

**Date**: 2025-11-18
**Status**: SUCCESS

### Key Findings:
1. ✅ Dual agreement rate excellent (90%)
2. ⚠️  leverantörer_agent failed - no "Leverantörer" section in this PDF
3. 📝 Found new keyword: "Anläggningstillgångar" → property_agent

### Edge Cases:
- Energy class reported as "E-F range" (not single letter)
- Board member count: 7 + 3 deputies (unusual structure)

### Recommendations:
- Add fuzzy matching for "Leverantörer" section (optional agent)
- Update energy_agent prompt to handle range values
```

### Outputs:
- Append to `LEARNINGS.md`
- Update `sessions/{session_id}/metadata.json` with learnings flag

---

## Phase 6: Commit & Push

**Duration**: 10-30 seconds
**Cost**: $0.00

### Git Workflow:

1. **Stage files**:
   ```bash
   git add results/{pdf_basename}_ground_truth.json
   git add sessions/{session_id}/
   git add locks/{pdf_basename}.lock  # Will be removed next step
   git add LEARNINGS.md
   ```

2. **Commit**:
   ```bash
   git commit -m "feat: Extract {pdf_basename} ground truth

   Session: {session_id}
   Fields: 87/95 (92% coverage)
   High confidence: 85%
   Consensus: 90% dual agreement
   Cost: $0.89
   Duration: 9m 14s

   Agents: 18/19 successful
   Quality: ✅ PASS"
   ```

3. **Push**:
   ```bash
   git push -u origin claude/process-pdf-automation-{session_id}
   ```

### Commit Rules:
- Include session ID and PDF name
- Summary stats in commit body
- Quality status (PASS/FAIL)
- Cost and duration
- Agent success rate

### Outputs:
- Git commit with extraction results
- Push to remote branch

---

## Phase 7: Unlock & Cleanup

**Duration**: < 5 seconds
**Cost**: $0.00

### Actions:

1. **Remove lock**:
   ```bash
   rm locks/{pdf_basename}.lock
   ```

2. **Update session metadata**:
   ```json
   {
     "sessionId": "session_20251118_143022",
     "status": "completed",
     "endTime": "2025-11-18T14:41:36Z",
     "duration": 682000,  // milliseconds
     "result": "success",
     "fieldsExtracted": 87,
     "cost": 0.89
   }
   ```

3. **Commit unlock**:
   ```bash
   git add -u locks/
   git commit -m "chore: Unlock {pdf_basename} after successful extraction"
   git push
   ```

### Outputs:
- Removed lock file
- Final session metadata
- Clean state for next session

---

## Error Handling

### Extraction Failure

If extraction fails (quality gates not met, timeout, etc.):

1. **Mark session as failed**:
   ```json
   {
     "status": "failed",
     "error": "Extraction timeout after 20 minutes",
     "failureCount": 1
   }
   ```

2. **Preserve failure data**:
   - Keep partial results in `sessions/{session_id}/`
   - Do NOT write to `results/` (prevents marking as processed)
   - Keep lock file temporarily

3. **Unlock with failure marker**:
   - Remove lock file
   - Add failure marker: `locks/{pdf_basename}.failed`
   - Commit failure metadata

4. **Retry policy**:
   - Max 3 retries per PDF
   - After 3 failures, mark PDF as "requires manual review"

### Stale Lock Detection

If lock exists but session expired (> 60 min old):

1. Check if session is still running (process check)
2. If dead, break lock and log incident
3. Start new session with same PDF

---

## Session Directory Structure

```
sessions/
└── session_20251118_143022/
    ├── metadata.json              # Session tracking
    ├── section_map.json           # Sectionizer output
    ├── extraction_result.json     # Full agent outputs
    ├── consensus_report.json      # Model agreement stats
    ├── analysis_report.md         # Quality analysis
    ├── quality_metrics.json       # Metrics for tracking
    └── logs/
        ├── agent_chairman.log     # Per-agent logs
        ├── agent_financial.log
        └── ...
```

---

## Success Criteria

A session is considered successful if:

1. ✅ PDF locked and processed without conflicts
2. ✅ Extraction completed within 20 minutes
3. ✅ Quality gates passed (70%+ fields, 70%+ high confidence)
4. ✅ Results committed and pushed to git
5. ✅ Lock released cleanly
6. ✅ Learnings documented

---

## Monitoring & Metrics

Track across all sessions:

- **Success rate**: % of sessions that pass quality gates
- **Average cost per PDF**: Target $0.75-1.00
- **Average duration**: Target 8-12 minutes
- **Field coverage**: Target 95+ fields, 80%+ high confidence
- **Consensus rate**: Target 85-90% dual agreement

Store in: `METRICS.json` (updated after each session)

---

**Built for**: Claude Code autonomous execution
**Maintainer**: See repository owner
**Last Updated**: 2025-11-18
