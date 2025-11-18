# Autonomous Session Protocol

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Purpose**: Define standardized autonomous PDF processing sessions for ground truth generation

---

## Overview

This protocol governs how Claude Code autonomously processes BRF annual report PDFs from the queue, extracts structured data using the 19-agent consensus system, validates results, documents learnings, and commits progress.

---

## Session Lifecycle

### Phase 1: Session Initialization

**Objective**: Establish session context and select work item

**Steps**:

1. **Generate Session ID**
   ```
   Format: session_YYYYMMDD_HHMMSS
   Example: session_20251118_022212
   ```

2. **Check Processing Status**
   - Read `processing_status.json` (or create if doesn't exist)
   - Identify next unprocessed PDF from queue
   - Verify PDF file exists and is readable

3. **Acquire Lock**
   - Update `processing_status.json`:
     ```json
     {
       "current_session": "session_20251118_022212",
       "pdf_in_progress": "267197_årsredovisning_norrköping_brf_axet_4.pdf",
       "status": "LOCKED",
       "started_at": "2025-11-18T02:22:12Z"
     }
     ```
   - Commit lock file to prevent concurrent processing

4. **Initialize Session Directory**
   ```
   sessions/
   └── session_20251118_022212/
       ├── session_manifest.json
       ├── extraction_log.md
       ├── quality_metrics.json
       └── learnings.md
   ```

---

### Phase 2: Extraction Execution

**Objective**: Run full extraction pipeline with rigor protocols

**Steps**:

1. **Load PDF**
   - Path: `pdfs/[selected_pdf].pdf`
   - Verify file integrity (size > 0, readable)
   - Extract metadata (page count, file size)

2. **Execute Extraction Workflow**

   **Method**: Use existing `lib/extraction-workflow.ts`

   **Process**:
   - Step 1: Vision Sectionizer (Gemini 2.0 Flash)
     - Round 1: Detect L1 sections
     - Round 2: Extract L2/L3 subsections
     - Output: Document map with page ranges

   - Step 2: Orchestrator (Rule-based)
     - Route subsections to relevant agents
     - Determine page ranges per agent
     - Prepare agent payloads

   - Step 3: 19 Specialist Agents (Consensus)
     - For EACH agent:
       1. **Gemini 2.5 Pro** extraction → JSON
       2. **GPT-4o** extraction → JSON
       3. **Claude 3.7 Sonnet** tiebreaker (if disagreement)
     - Apply consensus rules (see RIGOR_PROTOCOL.md)
     - Track confidence scores

   - Step 4: Auditor Agent
     - Cross-field validation
     - Sanity checks
     - Swedish format validation

3. **Log Progress**
   - Real-time updates to `extraction_log.md`
   - Track API calls, costs, errors
   - Record consensus outcomes per agent

4. **Handle Errors**
   - **Retryable Errors**: Retry up to 3 times with exponential backoff
     - Network timeouts
     - Rate limits (429)
     - Temporary API failures (500, 503)

   - **Fatal Errors**: Document and abort session
     - Invalid API keys
     - Corrupted PDF
     - Schema validation failures

   - **Partial Failures**: Continue with warnings
     - Single agent failure (if <3 agents fail)
     - Low confidence fields
     - Missing subsections

---

### Phase 3: Validation & Analysis

**Objective**: Assess extraction quality and identify issues

**Steps**:

1. **Calculate Quality Metrics**
   ```json
   {
     "total_fields": 95,
     "high_confidence": 78,
     "medium_confidence": 12,
     "low_confidence": 5,
     "confidence_distribution": {
       "0.9-1.0": 65,
       "0.8-0.9": 13,
       "0.7-0.8": 10,
       "0.6-0.7": 5,
       "<0.6": 2
     },
     "agent_success_rate": 18/19,
     "consensus_stats": {
       "dual_agreement": 81,
       "claude_tiebreaker": 11,
       "no_agreement": 3
     }
   }
   ```

2. **Validate Against Schema**
   - Use `lib/schema-validator.ts` (LENIENT mode)
   - Check required fields present
   - Verify data types
   - Validate Swedish formats (org numbers, postal codes)

3. **Cross-Field Validation**
   - Balance sheet: assets = liabilities + equity
   - Financial: revenue > 0, costs > 0
   - Dates: year in valid range (2020-2025)
   - Percentages: 0-100 range

4. **Identify Anomalies**
   - Fields with confidence < 0.6
   - Fields where all 3 models disagreed
   - Missing critical fields (org_number, year, brf_name)
   - Outliers (e.g., fees > 10,000 SEK/month)

---

### Phase 4: Learning Documentation

**Objective**: Capture insights for continuous improvement

**Steps**:

1. **Document Learnings** (`sessions/[session_id]/learnings.md`)

   **Template**:
   ```markdown
   # Learnings: [PDF Name]

   ## Session: [session_id]
   ## Date: [YYYY-MM-DD]

   ### Document Characteristics
   - Pages: [N]
   - Format: [comprehensive/visual/financial-heavy]
   - Language Quality: [excellent/good/poor]
   - Scan Quality: [high/medium/low]

   ### Extraction Challenges
   1. **Challenge**: [description]
      - **Agent(s) Affected**: [agent names]
      - **Root Cause**: [analysis]
      - **Impact**: [confidence score, field accuracy]

   ### Successful Patterns
   1. **Pattern**: [description]
      - **Agents**: [which agents handled well]
      - **Why Successful**: [analysis]

   ### Recommendations
   1. **Agent Improvements**: [specific suggestions]
   2. **Prompt Refinements**: [keyword additions, rule changes]
   3. **Schema Updates**: [field additions, validation changes]

   ### Model Performance
   - **Gemini 2.5 Pro**: [strengths/weaknesses]
   - **GPT-4o**: [strengths/weaknesses]
   - **Claude 3.7 Sonnet**: [tiebreaker effectiveness]
   ```

2. **Update Global Learnings Database**
   - Append to `docs/PROCESSING_LEARNINGS.md`
   - Track recurring patterns across sessions
   - Identify systematic improvements needed

---

### Phase 5: Commit & Unlock

**Objective**: Save results and release lock

**Steps**:

1. **Save Extraction Results**
   - Output path: `results/[pdf_id]_ground_truth.json`
   - Format: Full extraction result with metadata

2. **Update Processing Status**
   ```json
   {
     "last_processed": "267197_årsredovisning_norrköping_brf_axet_4.pdf",
     "session": "session_20251118_022212",
     "status": "COMPLETED",
     "completed_at": "2025-11-18T02:35:47Z",
     "next_pdf": "267456_årsredovisning_stockholm_brf_granen_18.pdf"
   }
   ```

3. **Commit to Git**
   ```bash
   git add sessions/[session_id]/
   git add results/[pdf_id]_ground_truth.json
   git add processing_status.json
   git add docs/PROCESSING_LEARNINGS.md

   git commit -m "$(cat <<'EOF'
   feat: Process [pdf_name] - Session [session_id]

   - Extracted [N] fields with [X]% high confidence
   - [Y]/19 agents succeeded
   - Cost: $[Z.ZZ]
   - Duration: [M]m [S]s

   Key learnings:
   - [Learning 1]
   - [Learning 2]
   EOF
   )"
   ```

4. **Push to Remote**
   ```bash
   git push -u origin claude/process-pdf-automation-013PuqjWzwXG7vwMixGcdM1M
   ```
   - Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
   - On failure: Log error but preserve local results

5. **Release Lock**
   - Update `processing_status.json` status to "READY"
   - Session directory preserved for historical record

---

## Error Handling

### Lock Conflicts

**Scenario**: `processing_status.json` shows LOCKED status

**Action**:
1. Check timestamp - if >30 minutes old, assume stale lock
2. Create recovery session to investigate
3. If legitimate lock, wait or abort

### Extraction Failures

**Scenario**: Extraction fails completely

**Action**:
1. Save partial results to `sessions/[session_id]/partial_extraction.json`
2. Document failure in `extraction_log.md`
3. Update `processing_status.json` with FAILED status
4. Commit failure documentation for analysis
5. Move to next PDF (don't block queue)

### Schema Validation Failures

**Scenario**: Extracted data doesn't match schema

**Action**:
1. Log validation errors
2. If LENIENT mode fails, flag for manual review
3. Save raw extraction output alongside errors
4. Continue processing (don't abort session)

---

## Quality Gates

### Minimum Success Criteria

Before marking session COMPLETED:

- [ ] At least 15/19 agents succeeded
- [ ] At least 60% of fields have confidence ≥ 0.7
- [ ] Critical fields present: org_number, brf_name, year
- [ ] Balance sheet validates (if data present)
- [ ] Results saved to `results/` directory
- [ ] Session fully documented in `sessions/` directory

### Quality Thresholds

**EXCELLENT** (≥90% high confidence):
- Publish as gold-standard ground truth
- Use for model training immediately

**GOOD** (70-89% high confidence):
- Acceptable for training
- Flag medium/low confidence fields for review

**ACCEPTABLE** (50-69% high confidence):
- Use for validation only
- Requires human review before training

**POOR** (<50% high confidence):
- Save as baseline
- Investigate document quality issues
- Consider manual extraction

---

## Session Metrics

Track for each session:

```json
{
  "session_id": "session_20251118_022212",
  "pdf_id": "267197",
  "pdf_name": "267197_årsredovisning_norrköping_brf_axet_4.pdf",
  "started_at": "2025-11-18T02:22:12Z",
  "completed_at": "2025-11-18T02:35:47Z",
  "duration_seconds": 815,
  "cost_usd": 0.87,
  "quality_tier": "GOOD",
  "agents": {
    "attempted": 19,
    "succeeded": 18,
    "failed": 1,
    "partial": 0
  },
  "fields": {
    "total": 95,
    "extracted": 89,
    "high_confidence": 76,
    "medium_confidence": 10,
    "low_confidence": 3
  },
  "api_calls": {
    "gemini_flash": 2,
    "gemini_pro": 19,
    "gpt4o": 19,
    "claude_sonnet": 3
  }
}
```

---

## Autonomous Operation

### Decision Making

**When to continue vs. abort**:

**CONTINUE if**:
- API errors are retryable (429, 500, 503)
- <3 agents have failed
- Partial results meet minimum thresholds
- Lock is valid and owned by current session

**ABORT if**:
- Fatal errors (invalid API keys, corrupted PDF)
- >5 agents fail
- Cannot acquire lock (conflict detected)
- Critical schema violations

### No Human Intervention Required

This protocol is designed for **fully autonomous operation**. Claude Code should:
- Make all decisions independently
- Handle all errors gracefully
- Document all issues for later review
- Continue processing queue without blocking

---

## Protocol Compliance

Each autonomous session MUST:

1. ✅ Generate unique session ID
2. ✅ Acquire processing lock
3. ✅ Initialize session directory
4. ✅ Execute full extraction pipeline
5. ✅ Apply rigor protocols (see RIGOR_PROTOCOL.md)
6. ✅ Calculate quality metrics
7. ✅ Document learnings
8. ✅ Commit results to git
9. ✅ Push to remote (with retry)
10. ✅ Release lock

**Non-compliance** = Session marked as INCOMPLETE and requires manual review.

---

## Next Session Trigger

After successful completion, session can:

1. **Auto-chain**: Immediately start next PDF (if time/budget allows)
2. **Queue**: Save state and exit (next session picks up queue)
3. **Report**: Generate summary and await user approval

Default: **Queue mode** (process one PDF per invocation)

---

**END OF PROTOCOL**
