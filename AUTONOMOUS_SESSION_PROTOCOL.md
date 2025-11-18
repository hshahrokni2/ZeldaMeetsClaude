# Autonomous Session Protocol v1.0

## Purpose
Enable Claude Code to autonomously process PDFs through the ground truth extraction pipeline without human intervention.

## Session Structure

### Session ID Format
```
session_YYYYMMDD_NNN
```
- YYYYMMDD: Current date
- NNN: Sequential session number (001, 002, etc.)

### Session Phases

#### Phase 1: PDF Selection & Lock (2 min)
1. Read `processing.lock.json` to check current state
2. Identify next unprocessed PDF from available sets:
   - Test set: `pdfs/*.pdf` (20 PDFs)
   - Hjorthagen: `pdfs/hjorthagen/*.pdf` (15 PDFs)
   - SRS: `pdfs/srs/*.pdf` (27 PDFs)
3. Create lock entry with:
   - `session_id`
   - `pdf_path`
   - `status: "processing"`
   - `started_at: ISO timestamp`
   - `agent_name: "claude-code"`
4. Write lock file atomically

#### Phase 2: Extraction with Rigor (10-15 min)
1. Follow **RIGOR_PROTOCOL.md** for all extraction steps
2. Execute extraction workflow:
   - Vision sectionization (2 rounds)
   - Agent routing and consensus
   - Validation and auditing
3. Track all intermediate outputs
4. Monitor for failures and retry with backoff

#### Phase 3: Validation & Analysis (3 min)
1. Validate output JSON against schema
2. Check field coverage (target: 80%+ fields extracted)
3. Verify confidence scores:
   - HIGH: >80% of fields
   - MEDIUM: 10-15% of fields
   - LOW: <5% of fields
4. Analyze cost and duration
5. Flag anomalies or errors

#### Phase 4: Learning Documentation (2 min)
1. Create session report in `results/sessions/session_YYYYMMDD_NNN.md`
2. Document:
   - What worked well
   - Extraction challenges encountered
   - PDF-specific quirks
   - Agent performance
   - Cost and duration metrics
3. Update `LEARNINGS.md` with insights

#### Phase 5: Commit & Unlock (2 min)
1. Commit all results:
   - Extraction JSON
   - Session report
   - Updated lock file
2. Update lock status to `"completed"`
3. Push to remote branch
4. Unlock PDF for potential reprocessing

## Lock File Structure

**File**: `processing.lock.json`

```json
{
  "version": "1.0",
  "sessions": [
    {
      "session_id": "session_20251118_001",
      "pdf_path": "pdfs/hjorthagen/brf_44232.pdf",
      "pdf_filename": "brf_44232.pdf",
      "status": "completed",
      "started_at": "2025-11-18T10:30:00Z",
      "completed_at": "2025-11-18T10:45:00Z",
      "agent_name": "claude-code",
      "result_path": "results/extractions/brf_44232_extraction.json",
      "session_report": "results/sessions/session_20251118_001.md",
      "metrics": {
        "duration_seconds": 900,
        "cost_usd": 0.82,
        "fields_extracted": 87,
        "high_confidence_pct": 0.85
      }
    }
  ],
  "current_session": null,
  "last_updated": "2025-11-18T10:45:00Z"
}
```

## Status Values
- `processing`: PDF currently being processed
- `completed`: Extraction finished successfully
- `failed`: Extraction failed (with error details)
- `retry`: Marked for retry after failure

## Selection Strategy

### Priority Order
1. **Test Set PDFs** (`pdfs/*.pdf`) - Process first for validation
2. **Hjorthagen Cluster** (`pdfs/hjorthagen/`) - Homogeneous training
3. **SRS Cluster** (`pdfs/srs/`) - Heterogeneous validation

### Within Each Set
- Process in alphabetical order by filename
- Skip any PDF already in lock file with status "completed"
- Retry PDFs with status "failed" (max 3 attempts)

## Error Handling

### Failures
If extraction fails:
1. Update lock status to `"failed"`
2. Record error details in lock file
3. Create failure report in `results/sessions/`
4. Continue to next PDF (don't block pipeline)

### Retries
- Max 3 retry attempts per PDF
- Exponential backoff: 2min, 5min, 10min
- After 3 failures, mark as `"requires_manual_review"`

## Success Criteria

A session is successful when:
- ✅ Extraction JSON created and valid
- ✅ 80%+ fields extracted
- ✅ Cost within expected range ($0.50-$1.50)
- ✅ Duration < 20 minutes
- ✅ Session report created
- ✅ Results committed and pushed

## Autonomous Trigger

Claude Code should automatically start a new session when:
1. User issues command: `AUTONOMOUS SESSION - PROCESS NEXT PDF`
2. No current session is active (`current_session: null` in lock file)
3. At least one unprocessed PDF remains

## Output Artifacts

Each session creates:
```
results/
├── extractions/
│   └── {pdf_id}_extraction.json        # Main output
├── sessions/
│   └── session_YYYYMMDD_NNN.md         # Session report
└── logs/
    └── session_YYYYMMDD_NNN.log        # Debug logs (optional)
```

## Integration with Git

### Branch Strategy
- Work on feature branch: `claude/process-pdf-automation-{session_id}`
- Commit after each successful extraction
- Push after session completion

### Commit Message Format
```
feat: Process {pdf_filename} in {session_id}

- Extracted {N} fields ({HIGH_PCT}% high confidence)
- Cost: ${cost} | Duration: {duration}
- Agent performance: {summary}

Session: {session_id}
```

## Protocol Version
- **Current**: 1.0
- **Last Updated**: 2025-11-18
- **Maintained By**: Autonomous Claude Code sessions
