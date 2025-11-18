# Autonomous Session Protocol

**Version**: 1.0.0
**Purpose**: Enable Claude Code to autonomously extract ground truth from BRF PDFs without human intervention

---

## Session Lifecycle

### 1. SESSION INITIALIZATION

**Generate Session ID**:
```
session_YYYYMMDD_HHMMSS
```

**Create Session Directory**:
```
sessions/session_YYYYMMDD_HHMMSS/
├── session.json          # Session metadata
├── pdf_lock.json         # Currently processing PDF
├── extraction.json       # Raw extraction results
├── validation.json       # Validation results
├── learnings.md          # Session learnings
└── metrics.json          # Performance metrics
```

**Session Metadata** (`session.json`):
```json
{
  "sessionId": "session_20251118_022312",
  "startTime": "2025-11-18T02:23:12Z",
  "status": "RUNNING",
  "pdfId": null,
  "pdfPath": null,
  "currentStep": "INITIALIZATION",
  "branch": "claude/process-pdf-automation-017hr8asgcwzRRgBFBvV1y5u"
}
```

---

### 2. PDF SELECTION & LOCK

**Step 2.1**: Load Processing Tracker
- Read `processing-tracker.json` to check which PDFs have been processed
- If file doesn't exist, create it with all 62 PDFs marked as `"pending"`

**Step 2.2**: Select Next PDF
- Filter PDFs by status = "pending"
- Select first pending PDF (or use priority queue if defined)
- Log selection: `Selected PDF: {pdfId} ({pdfPath})`

**Step 2.3**: Acquire Lock
- Update PDF status to `"processing"` in tracker
- Create `sessions/{sessionId}/pdf_lock.json`:
  ```json
  {
    "pdfId": "79446",
    "pdfPath": "pdfs/79446_årsredovisning_stockholm_brf_roslagsbanan_12.pdf",
    "lockedAt": "2025-11-18T02:23:15Z",
    "sessionId": "session_20251118_022312"
  }
  ```
- Commit lock to git: `git add . && git commit -m "Lock PDF {pdfId} for session {sessionId}"`

**Failure Recovery**:
- If another session locked the PDF within 60 minutes, skip to next PDF
- If lock is older than 60 minutes, assume crashed session and steal lock

---

### 3. EXTRACTION WITH RIGOR

**Step 3.1**: Environment Check
- Verify API keys exist (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)
- Check disk space (>500MB free required)
- Verify PDF is readable and not corrupted

**Step 3.2**: Execute Extraction Pipeline
- Run extraction using `lib/extraction-workflow.ts`
- Follow RIGOR_PROTOCOL.md for extraction quality
- Log all agent responses to `sessions/{sessionId}/agents/`

**Step 3.3**: Save Raw Results
- Write extraction results to `sessions/{sessionId}/extraction.json`
- Include:
  - All 19 agent outputs (or subset if some agents skip)
  - Consensus levels (HIGH/MEDIUM/LOW)
  - Confidence scores per field
  - Evidence pages
  - Cost breakdown
  - Duration

**Extraction Output Structure**:
```json
{
  "pdfId": "79446",
  "extractionTimestamp": "2025-11-18T02:30:45Z",
  "agents": [
    {
      "agentId": "financial_agent",
      "status": "success",
      "consensusLevel": "HIGH",
      "confidence": 0.92,
      "data": {
        "total_revenue_tkr": {
          "value": 12500,
          "confidence": 0.95,
          "evidence_pages": [5, 6],
          "original_string": "12,5 MSEK"
        }
      },
      "cost": 0.12,
      "duration_seconds": 45
    }
  ],
  "summary": {
    "totalAgents": 19,
    "successfulAgents": 17,
    "failedAgents": 2,
    "totalFields": 78,
    "highConfidenceFields": 65,
    "mediumConfidenceFields": 10,
    "lowConfidenceFields": 3,
    "totalCost": 0.87,
    "totalDuration": 512
  }
}
```

---

### 4. VALIDATION & ANALYSIS

**Step 4.1**: Schema Validation
- Validate against `schemas/full-extraction-result.ts`
- Check all required fields are present
- Verify data types match schema

**Step 4.2**: Business Logic Validation
- Cross-field checks:
  - Assets = Liabilities + Equity (balance sheet must balance)
  - Revenue > 0 (sanity check)
  - Year in range 2020-2024
  - Swedish org number format: NNNNNN-NNNN
- Confidence thresholds:
  - HIGH: ≥0.85
  - MEDIUM: 0.60-0.84
  - LOW: <0.60

**Step 4.3**: Quality Analysis
- Calculate success metrics:
  - Field extraction rate: (extracted / total) * 100
  - High confidence rate: (high_conf / extracted) * 100
  - Cost per field: total_cost / extracted
- Identify problem areas:
  - Which agents failed?
  - Which fields have low confidence?
  - Which pages were problematic?

**Validation Output** (`validation.json`):
```json
{
  "schemaValid": true,
  "businessLogicValid": true,
  "validationErrors": [],
  "qualityMetrics": {
    "fieldExtractionRate": 82.1,
    "highConfidenceRate": 83.3,
    "costPerField": 0.011
  },
  "problemAreas": [
    {
      "agent": "energy_agent",
      "issue": "Failed to find energy class",
      "recommendation": "Check if PDF has energy certificate section"
    }
  ]
}
```

---

### 5. LEARNING DOCUMENTATION

**Step 5.1**: Document Insights
- Create `sessions/{sessionId}/learnings.md`
- Capture:
  - What worked well
  - What failed and why
  - Unexpected patterns in the PDF
  - Recommendations for future extractions

**Step 5.2**: Update Global Learnings
- Append key insights to `LEARNINGS_GLOBAL.md`
- Track patterns across multiple sessions:
  - Common failure modes
  - PDF structure variations
  - Agent performance trends

**Example Learnings Entry**:
```markdown
## Session: session_20251118_022312
**PDF**: 79446 (Stockholm BRF Roslagsbanan 12)
**Date**: 2025-11-18
**Success Rate**: 89.5%

### What Worked Well
- Financial agent achieved 95% confidence on all 11 fields
- Balance sheet balanced perfectly (validation passed)
- Chairman extraction successful despite non-standard formatting

### What Failed
- Energy agent: No energy class found (PDF doesn't have certificate)
- Leverantörer agent: Supplier data in scanned image format (OCR failure)

### Insights
- This BRF uses older PDF format (2019) with scanned images
- Recommend: Add OCR preprocessing for PDFs older than 2020

### Recommendations
- Add image quality check before extraction
- Consider separate pipeline for scanned documents
```

---

### 6. COMMIT & UNLOCK

**Step 6.1**: Organize Results
- Create output directory: `results/{pdfId}/`
- Move files:
  - `extraction.json` → `results/{pdfId}/ground_truth.json`
  - `validation.json` → `results/{pdfId}/validation.json`
  - `learnings.md` → `results/{pdfId}/learnings.md`

**Step 6.2**: Update Tracker
- Mark PDF as `"completed"` in `processing-tracker.json`
- Add completion timestamp
- Add summary metrics

**Step 6.3**: Git Commit
```bash
git add results/{pdfId}/
git add processing-tracker.json
git add sessions/{sessionId}/
git add LEARNINGS_GLOBAL.md
git commit -m "feat: Complete extraction for PDF {pdfId} (session {sessionId})

Summary:
- Success rate: 89.5% (78/87 fields)
- High confidence: 83.3%
- Cost: $0.87
- Duration: 8m 32s

Key insights:
- Older PDF format with scanned images
- OCR preprocessing recommended"
```

**Step 6.4**: Push to Remote
```bash
git push -u origin claude/process-pdf-automation-017hr8asgcwzRRgBFBvV1y5u
```

**Step 6.5**: Session Cleanup
- Update session status to `"COMPLETED"`
- Archive session directory (optional)
- Release all locks

---

## Failure Handling

### Extraction Failure
- If extraction fails completely:
  1. Log error to `sessions/{sessionId}/error.log`
  2. Mark PDF as `"failed"` in tracker
  3. Commit failure log
  4. Move to next PDF

### Partial Extraction
- If ≥50% of agents succeed:
  1. Mark as `"partial_success"` in tracker
  2. Commit partial results
  3. Flag for human review

### API Errors
- If API key invalid:
  1. STOP session immediately
  2. Log error: "API key configuration required"
  3. Do NOT commit

- If rate limit hit:
  1. Wait 60 seconds
  2. Retry up to 3 times
  3. If still failing, mark PDF as `"rate_limited"`
  4. Resume next session

### Git Errors
- If push fails (network error):
  1. Retry with exponential backoff (2s, 4s, 8s, 16s)
  2. If still failing, log locally
  3. User must manually push later

---

## Session Termination

**Normal Exit**:
```
═══════════════════════════════════════════════════════════════
  SESSION COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════════
Session ID: session_20251118_022312
PDF Processed: 79446
Results: results/79446/ground_truth.json
Success Rate: 89.5%
Cost: $0.87
Duration: 8m 32s
Committed: Yes
Pushed: Yes
═══════════════════════════════════════════════════════════════
```

**Error Exit**:
```
═══════════════════════════════════════════════════════════════
  SESSION FAILED
═══════════════════════════════════════════════════════════════
Session ID: session_20251118_022312
PDF: 79446
Error: API key not configured
Partial Results: No
Committed: No
Action Required: Configure .env file with API keys
═══════════════════════════════════════════════════════════════
```

---

## Configuration

**Required Files**:
- `.env` - API keys
- `processing-tracker.json` - PDF status tracker
- `lib/extraction-workflow.ts` - Extraction logic

**Optional Files**:
- `LEARNINGS_GLOBAL.md` - Accumulated insights
- `priority-queue.json` - Custom PDF ordering

---

## Usage

**Run Next PDF**:
```bash
# Claude Code will automatically:
# 1. Generate session ID
# 2. Select next PDF
# 3. Extract
# 4. Validate
# 5. Commit & push

# User says: "AUTONOMOUS SESSION - PROCESS NEXT PDF"
# Claude executes this entire protocol autonomously
```

**Monitor Progress**:
```bash
# Check tracker
cat processing-tracker.json | jq '.summary'

# Check latest session
ls -lt sessions/ | head -1

# View learnings
cat LEARNINGS_GLOBAL.md
```

---

**Protocol Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintained By**: Claude Code Autonomous System
