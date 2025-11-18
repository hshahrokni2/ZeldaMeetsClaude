# Autonomous Session Protocol - Pure Claude Mode

## Version: 1.0.0
## Mode: FULL AUTOMATION - 100% CLAUDE
## Last Updated: 2025-11-18

---

## Overview

This protocol governs fully autonomous PDF processing sessions where Claude operates independently without human intervention, making all decisions, handling errors, and learning from each extraction.

---

## Session Structure

### Session ID Format
```
session_YYYYMMDD_HHMMSS
```

### Session Lifecycle

1. **Initialization**
   - Generate session ID
   - Load processing state
   - Verify system readiness (API keys, disk space, dependencies)

2. **PDF Selection**
   - Query processing state for next unprocessed PDF
   - Apply priority rules (test set > Hjorthagen > SRS)
   - Acquire lock on selected PDF

3. **Extraction Pipeline**
   - Vision sectionization (Gemini 2.0 Flash)
   - LLM orchestration (route sections to agents)
   - Parallel agent execution (19 specialized agents)
   - Validation and quality checks
   - Result aggregation

4. **Documentation**
   - Log extraction metrics
   - Document learning outcomes
   - Update processing state
   - Generate session report

5. **Meta-Analysis Trigger**
   - Check completion count (10, 20, 30, ...)
   - Execute meta-analysis if threshold reached
   - Generate insights and recommendations

6. **Finalization**
   - Commit results to git
   - Release PDF lock
   - Push to remote branch
   - Clean up temporary files

---

## Processing State Tracking

### File: `processing_state.json`

Structure:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-18T04:21:41Z",
  "totalProcessed": 0,
  "totalFailed": 0,
  "pdfs": {
    "82665_årsredovisning_lund_brf_vipemöllan_3.pdf": {
      "status": "completed",
      "sessionId": "session_20251118_042141",
      "startTime": "2025-11-18T04:21:41Z",
      "endTime": "2025-11-18T04:35:22Z",
      "agentsCompleted": 19,
      "agentsFailed": 0,
      "totalCost": 0.87,
      "totalTokens": 125000,
      "qualityScore": 0.92,
      "resultPath": "results/82665_ground_truth.json"
    }
  },
  "locks": {}
}
```

### PDF States
- `pending`: Not yet processed
- `locked`: Currently being processed
- `completed`: Successfully extracted
- `failed`: Extraction failed (with retry count)
- `skipped`: Manually excluded

---

## Lock Mechanism

### Purpose
Prevent duplicate processing in concurrent/distributed scenarios.

### Implementation
```json
{
  "locks": {
    "82665_årsredovisning_lund_brf_vipemöllan_3.pdf": {
      "sessionId": "session_20251118_042141",
      "lockedAt": "2025-11-18T04:21:41Z",
      "expiresAt": "2025-11-18T05:21:41Z"
    }
  }
}
```

### Rules
- Lock expires after 60 minutes (assuming hung session)
- Check for stale locks before processing
- Release lock immediately after completion/failure

---

## PDF Selection Priority

1. **Test Set** (`pdfs/*.pdf`) - 20 PDFs
   - Highest priority
   - Systematic sampling, cluster coverage
   - Critical for validation

2. **Hjorthagen Cluster** (`pdfs/hjorthagen/*.pdf`) - 15 PDFs
   - Medium priority
   - Homogeneous training data
   - Consistent structure

3. **SRS Cluster** (`pdfs/srs/*.pdf`) - 27 PDFs
   - Lower priority
   - Heterogeneous validation
   - Diverse formats

### Selection Algorithm
```typescript
function selectNextPDF(state: ProcessingState): string | null {
  // Priority 1: Test set
  const testPdfs = getPdfsInDirectory('pdfs/', state);
  if (testPdfs.length > 0) return testPdfs[0];

  // Priority 2: Hjorthagen
  const hjorthagenPdfs = getPdfsInDirectory('pdfs/hjorthagen/', state);
  if (hjorthagenPdfs.length > 0) return hjorthagenPdfs[0];

  // Priority 3: SRS
  const srsPdfs = getPdfsInDirectory('pdfs/srs/', state);
  if (srsPdfs.length > 0) return srsPdfs[0];

  return null; // All PDFs processed
}
```

---

## Error Handling

### Retry Policy

| Error Type | Max Retries | Backoff Strategy |
|-----------|-------------|------------------|
| API Rate Limit | 4 | Exponential (2s, 4s, 8s, 16s) |
| Network Timeout | 3 | Linear (5s, 10s, 15s) |
| JSON Parse Error | 1 | Immediate (repair attempt) |
| Agent Failure | 0 | Continue with remaining agents |
| Validation Failure | 0 | Accept with warnings |

### Failure Modes

1. **Partial Success** (15-18 agents succeed)
   - Accept extraction with reduced confidence
   - Document failed agents
   - Continue to next PDF

2. **Critical Failure** (<10 agents succeed)
   - Mark PDF as failed
   - Log detailed error report
   - Skip to next PDF
   - Schedule for manual review

3. **System Failure** (API keys invalid, disk full)
   - Abort session
   - Release all locks
   - Generate error report
   - Await human intervention

---

## Learning Documentation

### After Each PDF

Create: `learning/session_YYYYMMDD_HHMMSS_PDFID.md`

Contents:
```markdown
# Learning Report: [PDF Name]

## Session: session_20251118_042141
## PDF: 82665_årsredovisning_lund_brf_vipemöllan_3.pdf
## Date: 2025-11-18

### Extraction Summary
- Agents completed: 19/19
- Quality score: 0.92
- Total cost: $0.87
- Duration: 13m 41s

### Key Findings
1. **Successful Patterns**
   - Financial agent: Perfect extraction (all 11 fields)
   - Balance sheet agent: High confidence (0.95)
   - Property agent: Accurate linkage data

2. **Challenges Encountered**
   - Energy agent: Missing energy certificate pages
   - Leverantörer agent: Suppliers table in unconventional format

3. **Insights**
   - Multi-column layouts require careful page extraction
   - Swedish abbreviations: "tkr" vs "MSEK" normalization critical
   - Evidence page tracking: 1-indexed vs 0-indexed confusion

### Recommendations
1. Add fallback routing for missing sections
2. Enhance currency normalization regex
3. Cross-validate financial totals across agents
```

---

## Meta-Analysis Trigger

### Thresholds
- 10 PDFs processed
- 20 PDFs processed
- 30 PDFs processed
- ...every 10 thereafter

### Meta-Analysis Content

Create: `meta_analysis/meta_analysis_10pdfs_YYYYMMDD.md`

Contents:
```markdown
# Meta-Analysis: First 10 PDFs

## Date: 2025-11-18
## PDFs Analyzed: 1-10

### Aggregate Statistics
- Total cost: $8.50 ($0.85/PDF avg)
- Total duration: 2h 15m (13.5min/PDF avg)
- Overall quality: 0.89 avg
- Agent success rate: 18.2/19 avg

### Cross-PDF Patterns
1. **Document Structure**
   - 80% follow standard BRF template (Resultaträkning on p5-7)
   - 15% use visual summary format
   - 5% have custom layouts

2. **Agent Performance**
   - Most reliable: financial_agent (100% success)
   - Most challenging: energy_agent (60% success)
   - Improvement trend: +5% quality score from PDF 1→10

3. **Cost Optimization**
   - Gemini 2.5 Pro: 70% of total cost
   - GPT-4o: 25% of total cost
   - Claude tiebreaker: 5% (used in 10% of fields)

### Recommendations
1. Consider single-model mode for financial/balance sheet agents (high agreement)
2. Add energy certificate detection preprocessing
3. Implement dynamic page range optimization (reduce unnecessary pages)

### Next 10 PDFs Strategy
- Focus on heterogeneous SRS cluster
- Test cost-optimized single-model pipeline
- Benchmark against these first 10
```

---

## Git Commit Strategy

### Commit Frequency
- After each PDF completion
- After each meta-analysis
- Before meta-analysis (to preserve state)

### Commit Message Format
```
feat(extraction): Complete PDF {N}/62 - {BRF_NAME}

Session: {SESSION_ID}
PDF: {FILENAME}
Agents: {COMPLETED}/{TOTAL}
Quality: {SCORE}
Cost: ${COST}

- Result: results/{RESULT_FILE}
- Learning: learning/{LEARNING_FILE}
```

Example:
```
feat(extraction): Complete PDF 1/62 - BRF Vipemöllan 3

Session: session_20251118_042141
PDF: 82665_årsredovisning_lund_brf_vipemöllan_3.pdf
Agents: 19/19
Quality: 0.92
Cost: $0.87

- Result: results/82665_ground_truth.json
- Learning: learning/session_20251118_042141_82665.md
```

---

## Autonomous Decision Framework

### Claude's Authority

Claude is authorized to:
1. Select next PDF based on priority rules
2. Retry failed operations within retry policy
3. Accept partial extractions (15+ agents)
4. Generate learning insights autonomously
5. Commit and push results to git
6. Trigger meta-analyses at thresholds

### Human Escalation

Escalate to human when:
1. <10 agents succeed on a PDF (critical failure)
2. API keys are invalid/expired
3. Disk space <10% remaining
4. >3 consecutive PDFs fail
5. Git push fails (branch protection, conflicts)
6. Meta-analysis reveals systematic degradation

---

## Success Criteria

### Per PDF
- ✅ 15+ agents complete successfully
- ✅ Quality score ≥ 0.75
- ✅ Cost ≤ $2.00 (budget threshold)
- ✅ Result JSON validates against schema
- ✅ Learning documentation generated

### Per Session
- ✅ All available PDFs processed (or max 62)
- ✅ Processing state updated correctly
- ✅ All results committed to git
- ✅ Meta-analyses generated at thresholds
- ✅ No stale locks remaining

---

## Session Termination

### Normal Termination
- All PDFs processed
- Generate final summary
- Commit all pending changes
- Push to remote branch
- Archive session logs

### Abort Conditions
- System failure (API, disk, network)
- User interrupt (Ctrl+C)
- Critical errors in 3+ consecutive PDFs
- Budget exceeded ($150 total)

### Cleanup
- Release all locks
- Save processing state
- Commit partial results
- Generate termination report

---

## Rigor Adherence

This protocol works in conjunction with `RIGOR_PROTOCOL.md` to ensure:
- Evidence-based extraction (page numbers tracked)
- Confidence scoring (dual/triple model consensus)
- Validation (schema compliance, sanity checks)
- Traceability (git commits, session logs)
- Continuous learning (learning docs, meta-analysis)

---

**Protocol Version**: 1.0.0
**Effective Date**: 2025-11-18
**Next Review**: After first 10 PDFs processed
