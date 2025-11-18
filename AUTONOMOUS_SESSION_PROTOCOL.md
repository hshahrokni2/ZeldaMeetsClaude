# Autonomous Session Protocol

**Version**: 1.0.0
**Purpose**: Define rigorous workflow for autonomous PDF extraction sessions
**Compliance**: RIGOR_PROTOCOL.md

## Session Lifecycle

### Phase 1: PDF Selection & Lock
1. **Generate Session ID**: `session_YYYYMMDD_HHMMSS`
2. **Scan for unprocessed PDFs**: Check `locks/` and `results/` directories
3. **Select next PDF**: Priority order:
   - Hjorthagen PDFs (homogeneous training set)
   - Root PDFs (balanced test set)
   - SRS PDFs (heterogeneous validation set)
4. **Create lock file**: `locks/{pdf_id}.lock` with session metadata
5. **Verify lock acquired**: Prevent concurrent processing

### Phase 2: Extraction with Rigor
1. **Pre-flight checks**:
   - Validate API keys exist (.env)
   - Verify PDF is readable
   - Check disk space for outputs
2. **Execute extraction pipeline**:
   - Step 1: Vision Sectionizer (Gemini 2.0 Flash)
   - Step 2: Orchestrator routing
   - Step 3: 19-agent consensus (Gemini 2.5 Pro + GPT-4o + Claude 3.7)
   - Step 4: Auditor validation
3. **Real-time monitoring**:
   - Track API costs per agent
   - Monitor execution duration
   - Log all model responses
4. **Error handling**:
   - Retry failed agents (max 3 attempts)
   - Exponential backoff for rate limits
   - Preserve partial results on catastrophic failure

### Phase 3: Validation & Analysis
1. **Schema validation**:
   - Verify JSON structure matches FullExtractionResult
   - Check all required fields present
   - Validate Swedish format rules (org numbers, postal codes)
2. **Quality metrics**:
   - Count high/medium/low confidence fields
   - Calculate consensus agreement rate
   - Identify fields requiring human review
3. **Cross-field validation**:
   - Assets = Liabilities + Equity (±1% tolerance)
   - Revenue > 0, Year ∈ [2023, 2024]
   - Board member count ≥ 3
4. **Cost analysis**:
   - Total cost should be $0.75-1.00 per PDF
   - Flag if outside acceptable range

### Phase 4: Learning Documentation
1. **Session log**: `sessions/session_{id}.md`
   - PDF processed
   - Extraction statistics
   - Quality metrics
   - Errors encountered
   - Cost breakdown
   - Duration
2. **Update global metrics**: `EXTRACTION_METRICS.md`
   - Total PDFs processed
   - Average confidence scores
   - Cumulative cost
   - Success rate by agent
3. **Identify improvements**:
   - Document recurring extraction failures
   - Note agent prompt refinements needed
   - Track format variations discovered

### Phase 5: Commit & Unlock
1. **Save extraction result**: `results/{pdf_id}_ground_truth.json`
2. **Git commit**:
   ```bash
   git add results/{pdf_id}_ground_truth.json
   git add sessions/session_{id}.md
   git add locks/{pdf_id}.lock
   git commit -m "feat: Extract ground truth for {pdf_id} (session {id})"
   ```
3. **Release lock**: Update `locks/{pdf_id}.lock` with completion timestamp
4. **Push to remote**: Ensure results are backed up

## Session Metadata Format

**Lock file** (`locks/{pdf_id}.lock`):
```json
{
  "session_id": "session_20251118_022200",
  "pdf_id": "brf_79568",
  "pdf_path": "pdfs/hjorthagen/brf_79568.pdf",
  "status": "processing|completed|failed",
  "locked_at": "2025-11-18T02:22:00Z",
  "completed_at": null,
  "processor": "claude-code-autonomous"
}
```

**Session log** (`sessions/session_{id}.md`):
```markdown
# Session: session_20251118_022200

## PDF Details
- **ID**: brf_79568
- **Path**: pdfs/hjorthagen/brf_79568.pdf
- **Size**: 8.5 MB
- **Cluster**: hjorthagen

## Extraction Results
- **Status**: COMPLETED
- **Duration**: 8m 45s
- **Total Cost**: $0.89
- **High Confidence**: 82/95 fields (86%)
- **Medium Confidence**: 11/95 fields (12%)
- **Low Confidence**: 2/95 fields (2%)

## Agent Performance
[19 agents × consensus statistics]

## Errors & Warnings
- None

## Learnings
- Document pattern: Comprehensive report format
- Extraction challenges: Handwritten board member notes
- Improvements needed: Better OCR for signatures section
```

## Success Criteria

A session is successful when:
1. ✅ Lock acquired without conflicts
2. ✅ Extraction completes (all 19 agents executed)
3. ✅ High confidence rate ≥ 80%
4. ✅ Cost within $0.75-1.00 range
5. ✅ Schema validation passes
6. ✅ Results committed to git
7. ✅ Lock released

## Failure Recovery

If session fails:
1. Preserve partial results in `results/partial/{pdf_id}_{session_id}.json`
2. Update lock status to `failed`
3. Log detailed error in session log
4. Do NOT retry automatically (requires manual investigation)
5. Mark PDF for manual review

## Concurrency Control

- Only ONE active session per PDF
- Lock files prevent race conditions
- Use timestamps for conflict resolution
- Stale locks (>30 min) require manual cleanup

## Autonomous Operation

When running autonomously (Claude Code):
1. Check for incomplete sessions on startup
2. Auto-select next unprocessed PDF
3. Execute full pipeline without human intervention
4. Only pause on critical errors requiring API key refresh
5. Generate comprehensive session logs for review
6. Auto-commit and push results
7. Continue to next PDF after success

## Integration with RIGOR_PROTOCOL.md

All extraction steps must comply with rigor standards:
- No hallucination (only extract visible text)
- Evidence pages always recorded
- Confidence scores calibrated properly
- Consensus mechanism enforced
- Multi-model validation required
- Swedish format rules strictly validated
