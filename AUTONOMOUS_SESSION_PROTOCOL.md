# Autonomous Session Protocol

**Version**: 1.0.0
**Session ID Format**: `session_YYYYMMDD_HHMMSS`
**Purpose**: Define the complete autonomous PDF extraction workflow

---

## Session Lifecycle

### Phase 1: PDF Selection & Lock
```
1. Check processing_status.json for next unprocessed PDF
2. Select PDF with status="pending" (FIFO order)
3. Update status to "locked" with session_id and timestamp
4. Commit lock to prevent concurrent processing
```

**Lock Format**:
```json
{
  "pdf_path": "pdfs/hjorthagen/brf_12345.pdf",
  "status": "locked",
  "session_id": "session_20251118_022311",
  "locked_at": "2025-11-18T02:23:11Z",
  "locked_by": "claude-code"
}
```

### Phase 2: Extraction with Rigor
```
1. Load PDF and convert to images (300 DPI)
2. Run Vision Sectionizer (Gemini 2.0 Flash)
   - Round 1: Detect L1 sections
   - Round 2: Extract L2+L3 subsections
3. Route sections to 19 specialist agents
4. Execute agents in parallel (batch size: 18)
   - Gemini 2.5 Pro extraction
   - GPT-4o extraction
   - Claude 3.7 Sonnet tiebreaker (if needed)
5. Aggregate consensus results
```

**Success Criteria**:
- At least 15/19 agents complete successfully
- Overall confidence score >0.75
- Cost within $0.50-$1.50 per PDF
- Duration <15 minutes

### Phase 3: Validation & Analysis
```
1. Run schema validation (Zod/Pydantic)
2. Cross-field validation
   - Assets = Liabilities + Equity (balance sheet)
   - Revenue/costs sanity checks
   - Year validation (2023-2024)
3. Swedish format validation
   - Organization numbers (NNNNNN-NNNN)
   - Postal codes (NNN NN)
4. Evidence page verification
5. Confidence scoring
```

**Quality Gates**:
- High confidence fields: >80% of total
- No critical validation errors
- All required fields present
- Evidence pages documented

### Phase 4: Learning Documentation
```
1. Generate extraction report
   - Fields extracted: count by confidence level
   - Agent performance: success rate per agent
   - Edge cases discovered
   - Errors encountered
2. Update knowledge base
   - Document new patterns
   - Swedish terminology variations
   - Layout variations
3. Append to learnings log
```

**Output**: `results/learnings/session_[ID]_learnings.md`

### Phase 5: Commit & Unlock
```
1. Save extraction result to results/[pdf_id]_ground_truth.json
2. Update processing_status.json:
   - status: "completed"
   - completed_at: timestamp
   - session_id: session ID
   - confidence_score: overall score
   - cost: total cost in USD
3. Git commit with detailed message
4. Push to branch
5. Unlock PDF for future processing (if retry needed)
```

**Commit Message Format**:
```
feat: Extract BRF [ID] - [BRF Name]

Session: [session_id]
Confidence: [score]/1.0 ([high_count] high, [med_count] medium, [low_count] low)
Cost: $[amount]
Duration: [time]

Agents: [agent_success_count]/19 succeeded
- High performers: [list]
- Issues: [list if any]
```

---

## Error Handling

### Recoverable Errors
- API rate limits → Exponential backoff (2s, 4s, 8s, 16s)
- Timeout → Retry with extended timeout
- Partial extraction → Continue with available data

### Non-Recoverable Errors
- Invalid PDF format → Mark as "failed_invalid_format"
- API key issues → Halt session, log error
- Critical validation failure → Mark as "failed_validation"

**Max Retries**: 3 per operation
**Backoff Strategy**: Exponential with jitter

---

## Rigor Requirements

See `RIGOR_PROTOCOL.md` for detailed extraction rigor standards:
- Anti-hallucination rules
- Confidence scoring methodology
- Evidence page requirements
- Swedish format validation rules
- Consensus tiebreaking logic

---

## Session State Tracking

**File**: `processing_status.json`

```json
{
  "session_id": "session_20251118_022311",
  "started_at": "2025-11-18T02:23:11Z",
  "current_phase": "extraction",
  "pdfs_processed": 0,
  "pdfs_total": 62,
  "total_cost": 0.0,
  "total_duration_seconds": 0,
  "pdfs": [
    {
      "pdf_path": "pdfs/hjorthagen/brf_12345.pdf",
      "status": "locked",
      "session_id": "session_20251118_022311",
      "locked_at": "2025-11-18T02:23:11Z"
    }
  ]
}
```

---

## Autonomous Execution Command

```bash
# Single PDF (autonomous)
npx tsx scripts/autonomous-extract.ts --session [session_id]

# Batch mode (process all pending)
npx tsx scripts/autonomous-batch.ts --max 10
```

---

## Success Metrics

**Per Session**:
- Extraction success rate: >90%
- Average confidence: >0.80
- Average cost: $0.75-$1.00 per PDF
- Average duration: 8-12 minutes per PDF

**Cumulative**:
- Total PDFs processed: Track progress to 62
- Knowledge base growth: New patterns documented
- Error reduction: Fewer retries over time
