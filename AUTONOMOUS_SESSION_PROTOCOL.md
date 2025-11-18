# Autonomous Session Protocol

## Session ID Format
`session_YYYYMMDD_HHMMSS`

## Workflow Steps

### 1. PDF Selection & Lock
**Actions:**
- Check `pdf_processing_state.json` for unprocessed PDFs
- Select next PDF from priority queue:
  1. Test set PDFs (root `pdfs/` directory) - 20 files
  2. Hjorthagen cluster (`pdfs/hjorthagen/`) - 15 files
  3. SRS cluster (`pdfs/srs/`) - 27 files
- Create lock entry with session ID and timestamp
- Update state file atomically

**Lock Format:**
```json
{
  "sessionId": "session_20251118_022249",
  "pdfPath": "pdfs/82665_årsredovisning_lund_brf_vipemöllan_3.pdf",
  "status": "processing",
  "startTime": "2025-11-18T02:22:49Z",
  "lockedBy": "claude"
}
```

**Exit Criteria:**
- Lock acquired successfully
- PDF exists and is readable
- No concurrent locks on same PDF

---

### 2. Extraction with Rigor
**Actions:**
- Execute `scripts/extract-single-pdf.ts` with ground truth mode
- Enable 3-model consensus (Gemini 2.5 Pro + GPT-4o + Claude Sonnet)
- Capture all console output for debugging
- Track costs and token usage per agent

**Expected Output:**
```
results/
  └── session_20251118_022249/
      ├── brf_82665_ground_truth.json
      ├── brf_82665_extraction_log.txt
      └── brf_82665_validation_report.json
```

**Quality Gates:**
- All 19 agents execute successfully (or gracefully fail)
- At least 80% HIGH confidence fields
- No CRITICAL validation errors
- Cost within expected range ($0.75-$1.50 per PDF)

**Exit Criteria:**
- Extraction completes without fatal errors
- Output JSON is valid and parseable
- All agents executed (including failed agents logged)

---

### 3. Validation & Analysis
**Actions:**
- Run RIGOR_PROTOCOL validation checks
- Analyze consensus levels per field
- Identify low-confidence fields for review
- Generate validation report with:
  - Field-level confidence distribution
  - Agent success/failure summary
  - Cross-field consistency checks (e.g., assets = liabilities + equity)
  - Swedish format validation (org numbers, postal codes)

**Validation Report Schema:**
```json
{
  "sessionId": "session_20251118_022249",
  "pdfId": "brf_82665",
  "overallQuality": "HIGH" | "MEDIUM" | "LOW",
  "metrics": {
    "totalFields": 95,
    "highConfidence": 78,
    "mediumConfidence": 12,
    "lowConfidence": 5,
    "nullFields": 3
  },
  "agentStatus": {
    "successful": 18,
    "failed": 1,
    "failedAgents": ["loans_agent"]
  },
  "rigorChecks": {
    "passed": 8,
    "warnings": 2,
    "failed": 0
  },
  "costMetrics": {
    "totalCost": 0.87,
    "totalTokens": 45231,
    "duration": "8m 32s"
  }
}
```

**Exit Criteria:**
- overallQuality is at least MEDIUM
- No FAILED rigor checks
- At least 70% fields extracted (nulls allowed)

---

### 4. Learning Documentation
**Actions:**
- Create `LEARNINGS.md` entry with:
  - PDF characteristics (pages, structure, language quirks)
  - Edge cases discovered
  - Agent-specific challenges
  - Consensus disagreements analyzed
  - Suggested prompt improvements
- Update `PROCESSING_LOG.md` with session summary

**Learning Entry Format:**
```markdown
## Session: session_20251118_022249
**PDF:** brf_82665 (Lund - BRF Vipemöllan 3)
**Date:** 2025-11-18
**Status:** ✅ SUCCESS

### Characteristics
- Pages: 24
- Language: Swedish (standard BRF format)
- Structure: Comprehensive report with full notes section

### Edge Cases Discovered
1. **Multi-column balance sheet**: Balance sheet agent struggled with 3-column layout (2022, 2023, 2024)
   - Solution: Added column detection hint to prompt
2. **Energy class as image**: Energy agent received null because energy class was embedded image
   - Solution: Flagged for OCR enhancement

### Consensus Analysis
- High agreement rate: 92% (Gemini + GPT agreed on 87/95 fields)
- Claude tiebreaker needed: 8 fields
- Main disagreements: Currency normalization (MSEK vs. tkr)

### Recommendations
- Update financial_agent prompt to clarify tkr normalization rule
- Add image OCR preprocessing step for energy declarations
```

**Exit Criteria:**
- Learning entry created with at least 3 findings
- Edge cases documented with suggested solutions

---

### 5. Commit & Unlock
**Actions:**
- Stage all new files:
  ```bash
  git add results/session_*/
  git add LEARNINGS.md PROCESSING_LOG.md
  git add pdf_processing_state.json
  ```
- Create commit with structured message:
  ```
  feat: Process PDF brf_82665 (session_20251118_022249)

  - Extracted 92/95 fields (97% coverage)
  - High confidence: 78 fields (82%)
  - Cost: $0.87, Duration: 8m 32s
  - Discovered 2 edge cases (documented in LEARNINGS.md)

  Quality: HIGH (passed all rigor checks)
  Agents: 18/19 successful (loans_agent failed - no loan data in PDF)
  ```
- Update PDF lock status to "completed"
- Push to feature branch with retry logic

**Exit Criteria:**
- Commit created successfully
- Lock released
- Push succeeds (with retries if needed)

---

## Error Handling

### Recoverable Errors
- **Agent timeout**: Log failure, continue with other agents
- **JSON parse error**: Attempt repair, fallback to null fields
- **Rate limit hit**: Exponential backoff (2s, 4s, 8s, 16s)

### Fatal Errors
- **PDF unreadable**: Mark as FAILED, unlock, skip to next PDF
- **All agents fail**: Mark as FAILED, unlock, escalate for manual review
- **Validation failure (all rigor checks failed)**: Mark as FAILED, review required

### Recovery Actions
- Failed PDFs logged to `FAILED_PDFS.md` with error details
- Unlock PDF immediately on fatal error
- Continue to next PDF in queue

---

## Session Completion Criteria

**Success:**
- PDF extracted and validated
- Results committed and pushed
- Lock released
- Learnings documented

**Failure:**
- Error logged to FAILED_PDFS.md
- Lock released
- Manual review flagged

---

## Autonomous Loop

When running in fully autonomous mode, repeat workflow until:
- All 62 PDFs processed, OR
- Fatal system error (API keys invalid, disk full, etc.), OR
- User interrupt signal
