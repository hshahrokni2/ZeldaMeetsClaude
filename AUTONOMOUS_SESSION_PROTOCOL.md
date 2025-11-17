# Autonomous Session Protocol - Single Prompt Execution

**Version**: 1.0.0
**Purpose**: Single prompt that processes one PDF through complete extraction pipeline with full rigor and learning documentation

---

## 🎯 MASTER PROMPT (Copy-Paste This)

```
AUTONOMOUS SESSION - PROCESS NEXT PDF

Protocol: AUTONOMOUS_SESSION_PROTOCOL.md
Rigor: RIGOR_PROTOCOL.md
Mode: FULL AUTOMATION

Execute complete pipeline:
1. PDF Selection & Lock
2. Extraction with Rigor
3. Validation & Analysis
4. Learning Documentation
5. Commit & Unlock

Session ID: [GENERATE: session_YYYYMMDD_HHMMSS]

BEGIN AUTONOMOUS EXECUTION
```

---

## 📋 AUTONOMOUS EXECUTION CHECKLIST

When you (Claude) receive the master prompt, follow this EXACT sequence:

### PHASE 0: INITIALIZATION (2 minutes)

```
☐ 1. Generate session ID: session_[YYYYMMDD_HHMMSS]
☐ 2. Read PDF_QUEUE.json
☐ 3. Select next available PDF:
     - Filter: status == "pending"
     - Sort: priority DESC, added_date ASC
     - Take: First result
☐ 4. ATOMIC LOCK:
     - Set status = "processing"
     - Set locked_by = [session_id]
     - Set locked_at = [current timestamp]
     - Write PDF_QUEUE.json immediately
     - Commit lock: git add + commit + push
☐ 5. Create results directory: pdfs/results/[pdf_id]/
☐ 6. Log session start
```

**If no PDFs available:** Stop and report "Queue empty - all PDFs completed"

---

### PHASE 1: PRE-EXTRACTION SETUP (5 minutes)

```
☐ 7. Read PDF metadata from queue
☐ 8. Check PDF exists at path
☐ 9. Read current agent prompts (agents/*.md)
☐ 10. Read current validators (lib/schema-validator.ts)
☐ 11. Read known blind spots (EXTRACTION_ROBUSTNESS_ANALYSIS.md)
☐ 12. Read current patterns (PATTERNS_THAT_WORK.md, PATTERNS_TO_AVOID.md)
☐ 13. Initialize metrics tracking:
      - start_time
      - tokens_used = 0
      - cost_usd = 0
      - extraction_errors = []
      - validation_warnings = []
```

---

### PHASE 2: EXTRACTION (20-30 minutes)

```
☐ 14. Run extraction pipeline:
      [Follow existing extraction workflow]
      - Convert PDF to images
      - 2-round sectionization
      - Route sections to agents
      - Execute all 19 agents in parallel
      - Aggregate results

☐ 15. Track metrics during extraction:
      - Tokens used per agent
      - Cost per agent
      - Errors encountered
      - Warnings generated

☐ 16. Save raw results:
      - pdfs/results/[pdf_id]/extraction_raw.json

☐ 17. Heartbeat every 5 minutes:
      - Update locked_at timestamp in queue
      - Commit to prevent stale lock
```

---

### PHASE 3: VALIDATION & ANALYSIS (10 minutes)

```
☐ 18. Run comprehensive validation:
      - Schema validation (lib/schema-validator.ts)
      - Balance sheet equation
      - Cash flow consistency
      - Cross-field validation (if implemented)
      - Evidence page validation

☐ 19. Calculate quality metrics:
      - Field coverage: extracted_fields / total_schema_fields
      - Confidence distribution: mean, median, std
      - Validation pass rate: passed / total_checks
      - Error rate: errors / total_fields
      - Cost efficiency: cost_usd / fields_extracted

☐ 20. Identify issues:
      - Currency normalization errors
      - Section detection failures
      - Agent failures
      - Validation failures

☐ 21. Save validation report:
      - pdfs/results/[pdf_id]/validation_report.json

☐ 22. Save metrics:
      - pdfs/results/[pdf_id]/metrics.json
```

---

### PHASE 4: LEARNING DOCUMENTATION (15 minutes)

This is critical - document EVERYTHING you learned.

```
☐ 23. Analyze what worked:
      - Which agents performed well? (high confidence, no errors)
      - Which prompts were clear? (no hallucinations)
      - Which validators caught errors? (true positives)
      - Any patterns that led to success?

☐ 24. Analyze what failed:
      - Which agents failed? (errors, low confidence)
      - Which prompts were ambiguous? (hallucinations)
      - Which validators missed errors? (false negatives)
      - Which validators had false positives?
      - Any patterns that led to failure?

☐ 25. Identify NEW blind spots:
      - Edge cases discovered in this document
      - Failures not covered by existing blind spot list
      - Assumptions that proved wrong

☐ 26. Document session learnings:
      Write pdfs/results/[pdf_id]/learnings.md with:

      # Session [session_id] Learnings
      **PDF**: [pdf_id] ([filename])
      **Date**: [timestamp]

      ## What Worked ✅
      1. [Specific observation with evidence]
      2. [Specific observation with evidence]

      ## What Failed ❌
      1. [Specific failure with root cause]
      2. [Specific failure with root cause]

      ## New Blind Spots Discovered 🔍
      1. [Description + impact + recommendation]

      ## Patterns Identified 🔄
      1. [Pattern that should be added to PATTERNS_THAT_WORK.md]
      2. [Anti-pattern that should be added to PATTERNS_TO_AVOID.md]

      ## Recommendations for Next Iteration 🚀
      1. [Actionable change to prompt/validator/schema]
      2. [Actionable change to prompt/validator/schema]

      ## Confidence Ratings
      - Extraction quality: X/100
      - Validation reliability: X/100
      - Overall confidence: X/100

☐ 27. Update PATTERNS_THAT_WORK.md:
      - Add new patterns discovered
      - Increment evidence count for existing patterns
      - Update confidence ratings based on new data

☐ 28. Update PATTERNS_TO_AVOID.md:
      - Add new anti-patterns discovered
      - Add this PDF as evidence for existing anti-patterns
      - Update impact ratings if needed

☐ 29. Update EXTRACTION_ROBUSTNESS_ANALYSIS.md (if new blind spots):
      - Add to relevant section (Critical/Medium/Low)
      - Describe the blind spot with evidence
      - Rate impact and frequency
      - Recommend mitigation

☐ 30. Update CHANGELOG.md:
      Add entry:

      ## [Session session_id] - [Date]

      ### PDF Processed
      - [pdf_id]: [filename]
      - Status: [completed/failed]
      - Metrics: [field_coverage]% coverage, [avg_confidence] confidence, $[cost_usd]

      ### Learnings
      - [Key learning 1]
      - [Key learning 2]

      ### Patterns Updated
      - Added [N] patterns to PATTERNS_THAT_WORK.md
      - Added [N] anti-patterns to PATTERNS_TO_AVOID.md

      ### New Blind Spots
      - [Blind Spot #X: Description] (if any)
```

---

### PHASE 5: FINALIZATION (5 minutes)

```
☐ 31. Save final extraction:
      - pdfs/results/[pdf_id]/extraction.json (clean, validated data)

☐ 32. Update PDF_QUEUE.json:
      - Set status = "completed" (or "failed" if errors)
      - Clear locked_by and locked_at
      - Add to session_history:
        {
          "session_id": "[session_id]",
          "started_at": "[timestamp]",
          "completed_at": "[timestamp]",
          "status": "completed",
          "metrics": {
            "field_coverage": 0.87,
            "avg_confidence": 0.85,
            "validation_errors": 0,
            "validation_warnings": 2,
            "cost_usd": 0.042,
            "tokens": 12450,
            "duration_seconds": 1872
          },
          "learnings": [
            "Key learning 1",
            "Key learning 2"
          ]
        }
      - Update counters (completed++, processing--)

☐ 33. Clean up any temporary files

☐ 34. Verify all files created:
      - pdfs/results/[pdf_id]/extraction.json
      - pdfs/results/[pdf_id]/validation_report.json
      - pdfs/results/[pdf_id]/metrics.json
      - pdfs/results/[pdf_id]/learnings.md

☐ 35. Git commit all changes:
      git add pdfs/results/[pdf_id]/
      git add PDF_QUEUE.json
      git add PATTERNS_THAT_WORK.md PATTERNS_TO_AVOID.md
      git add EXTRACTION_ROBUSTNESS_ANALYSIS.md (if updated)
      git add CHANGELOG.md

      git commit -m "session([session_id]): Process [pdf_id] - [status]

      Metrics:
      - Field coverage: [X]%
      - Avg confidence: [X]
      - Validation: [errors] errors, [warnings] warnings
      - Cost: $[X]
      - Duration: [X]s

      Learnings:
      - [Key learning 1]
      - [Key learning 2]

      [New blind spots if any]"

☐ 36. Git push:
      git push origin [branch]

☐ 37. Log session completion:

      ✅ SESSION [session_id] COMPLETE

      PDF: [pdf_id] ([filename])
      Status: [completed/failed]
      Duration: [X] minutes

      Metrics:
      - Fields extracted: [X]/[total] ([coverage]%)
      - Avg confidence: [X]
      - Validation: [errors] errors, [warnings] warnings
      - Cost: $[X]
      - Tokens: [X]

      Learnings documented:
      - [N] new patterns added to PATTERNS_THAT_WORK.md
      - [N] new anti-patterns added to PATTERNS_TO_AVOID.md
      - [N] new blind spots identified

      Files created:
      - pdfs/results/[pdf_id]/extraction.json
      - pdfs/results/[pdf_id]/validation_report.json
      - pdfs/results/[pdf_id]/metrics.json
      - pdfs/results/[pdf_id]/learnings.md

      All changes committed and pushed ✅

      Ready for next PDF? Run: AUTONOMOUS SESSION - PROCESS NEXT PDF
```

---

## 🛡️ ERROR HANDLING

### If Extraction Fails

```
☐ Capture error details:
   - Error message
   - Stack trace
   - Which agent/step failed
   - Partial results (if any)

☐ Save error log:
   - pdfs/results/[pdf_id]/errors.log

☐ Update PDF_QUEUE.json:
   - Set status = "failed"
   - Clear locks
   - Add to session_history with error details

☐ Document failure in learnings.md:
   - What failed
   - Why it failed (root cause)
   - How to fix it
   - Whether to retry or skip

☐ Commit everything (including failure):
   - Partial results
   - Error logs
   - Learning documentation
   - Updated queue

☐ Report to user:
   "Session failed on [pdf_id]: [error summary]
   Root cause: [analysis]
   Recommendation: [fix this before retry]

   All diagnostics saved to pdfs/results/[pdf_id]/"
```

### If Queue Lock Fails (Race Condition)

```
☐ Detect: Another session locked the PDF first
☐ Action: Skip to next available PDF
☐ Log: "PDF [pdf_id] already locked by [session_id], selecting next..."
☐ Retry: Go back to PHASE 0 step 3
```

### If No PDFs Available

```
☐ Report:
   "✅ Queue empty - all PDFs processed!

   Summary:
   - Total: [total_pdfs]
   - Completed: [completed] ([X]%)
   - Failed: [failed] ([X]%)
   - Success rate: [X]%

   Aggregate learnings:
   - Run meta-analysis across all sessions
   - Update master configurations
   - Promote winning patterns to production

   See experiments/meta_analysis/ for cross-session insights"
```

---

## 📊 SELF-MONITORING

Throughout execution, maintain internal checklist state:

```typescript
{
  session_id: string,
  pdf_id: string,
  current_phase: number,
  current_step: number,
  steps_completed: number[],
  steps_failed: number[],
  metrics: {
    start_time: timestamp,
    phase_durations: { [phase]: seconds },
    tokens_used: number,
    cost_usd: number
  },
  learnings: {
    patterns_discovered: string[],
    antipatterns_discovered: string[],
    blind_spots_discovered: string[]
  }
}
```

Update after each step. If interrupted, can resume from last completed step.

---

## 🔄 COMPOUND LEARNING ENFORCEMENT

**Critical:** Every session MUST contribute to compound learning.

### Mandatory Learning Outputs

1. **Session-specific learnings** (pdfs/results/[pdf_id]/learnings.md)
   - What worked/failed in THIS document
   - Document-specific edge cases
   - Agent performance on THIS document

2. **Pattern updates** (PATTERNS_THAT_WORK.md / PATTERNS_TO_AVOID.md)
   - Add evidence to existing patterns
   - Add new patterns if discovered
   - Update confidence ratings

3. **Blind spot updates** (EXTRACTION_ROBUSTNESS_ANALYSIS.md)
   - Add new blind spots if discovered
   - Update impact/frequency ratings for existing ones

4. **Changelog entry** (CHANGELOG.md)
   - Document session progress
   - Key learnings summarized
   - Metrics recorded

### Cross-Session Learning

After every 10 sessions, meta-analysis should be run separately (not in autonomous session):
- Aggregate patterns across sessions
- Promote winning configurations
- Update RIGOR_PROTOCOL.md with new insights

---

## 🎯 SUCCESS CRITERIA

A session is successful if:

✅ **Extraction:**
- PDF processed without critical errors
- ≥70% field coverage achieved
- Average confidence ≥0.75

✅ **Validation:**
- No critical validation errors
- Balance sheet equation holds (within tolerance)
- Evidence pages tracked for all fields

✅ **Learning:**
- learnings.md created with ≥3 observations
- PATTERNS_*.md updated with ≥1 new entry
- CHANGELOG.md updated
- New blind spots documented (if any discovered)

✅ **Commit:**
- All files saved to pdfs/results/[pdf_id]/
- PDF_QUEUE.json updated with status
- All changes committed and pushed
- No uncommitted files remaining

---

## 📝 REPORTING FORMAT

At end of session, output:

```
═══════════════════════════════════════════════════════════════
AUTONOMOUS SESSION REPORT
═══════════════════════════════════════════════════════════════

SESSION ID: session_YYYYMMDD_HHMMSS
PDF ID: [pdf_id]
FILENAME: [filename]
STATUS: ✅ COMPLETED / ❌ FAILED

───────────────────────────────────────────────────────────────
METRICS
───────────────────────────────────────────────────────────────

Extraction Quality:
  • Field coverage: [X]/[total] ([XX]%)
  • Avg confidence: [0.XX]
  • Confidence distribution: min=[X], max=[X], std=[X]

Validation:
  • Critical errors: [X]
  • Warnings: [X]
  • Balance sheet: [✅ balanced / ⚠️ imbalanced by X%]
  • Cash flow: [✅ consistent / ⚠️ inconsistent by X%]

Performance:
  • Duration: [X] minutes ([X] seconds)
  • Tokens used: [X,XXX]
  • Cost: $[X.XX]
  • Cost per field: $[X.XXX]

───────────────────────────────────────────────────────────────
LEARNINGS DOCUMENTED
───────────────────────────────────────────────────────────────

What Worked (✅):
  1. [Learning 1]
  2. [Learning 2]

What Failed (❌):
  1. [Failure 1 + root cause]
  2. [Failure 2 + root cause]

New Blind Spots (🔍):
  [X new blind spots discovered] [or "None"]

Pattern Updates (🔄):
  • PATTERNS_THAT_WORK.md: +[N] patterns
  • PATTERNS_TO_AVOID.md: +[N] anti-patterns

───────────────────────────────────────────────────────────────
FILES CREATED
───────────────────────────────────────────────────────────────

✅ pdfs/results/[pdf_id]/extraction.json
✅ pdfs/results/[pdf_id]/validation_report.json
✅ pdfs/results/[pdf_id]/metrics.json
✅ pdfs/results/[pdf_id]/learnings.md
✅ PDF_QUEUE.json (updated)
✅ PATTERNS_THAT_WORK.md (updated)
✅ PATTERNS_TO_AVOID.md (updated)
✅ EXTRACTION_ROBUSTNESS_ANALYSIS.md (updated [if applicable])
✅ CHANGELOG.md (updated)

───────────────────────────────────────────────────────────────
GIT COMMIT
───────────────────────────────────────────────────────────────

Commit: [commit hash]
Branch: [branch name]
Pushed: ✅ Yes

───────────────────────────────────────────────────────────────
QUEUE STATUS
───────────────────────────────────────────────────────────────

Total PDFs: [X]
Completed: [X] ([XX]%)
Processing: [X]
Pending: [X]
Failed: [X]
Success rate: [XX]%

───────────────────────────────────────────────────────────────
NEXT STEPS
───────────────────────────────────────────────────────────────

[If queue has more PDFs:]
  Ready for next PDF ✅
  Run: AUTONOMOUS SESSION - PROCESS NEXT PDF

[If queue empty:]
  Queue complete ✅
  Run meta-analysis across all [X] sessions
  Update master configurations with winning patterns

═══════════════════════════════════════════════════════════════
```

---

## 🚀 USAGE

### For User (You)

**Single command to process all PDFs:**

```bash
# Process PDF #1
Claude: "AUTONOMOUS SESSION - PROCESS NEXT PDF"

# Process PDF #2
Claude: "AUTONOMOUS SESSION - PROCESS NEXT PDF"

# Process PDF #3
Claude: "AUTONOMOUS SESSION - PROCESS NEXT PDF"

# ... repeat until queue empty
```

**Or in parallel (10 sessions):**

Open 10 Claude sessions, paste in each:
```
AUTONOMOUS SESSION - PROCESS NEXT PDF

Protocol: AUTONOMOUS_SESSION_PROTOCOL.md
Rigor: RIGOR_PROTOCOL.md
Mode: FULL AUTOMATION

Session ID: [GENERATE: session_YYYYMMDD_HHMMSS]

BEGIN AUTONOMOUS EXECUTION
```

Each session will:
1. Pick next available PDF (different for each)
2. Lock it (prevent double processing)
3. Extract with full rigor
4. Document learnings
5. Commit and unlock
6. Report completion

---

## ⚠️ IMPORTANT NOTES

### What This Protocol Does

✅ **Fully autonomous per PDF:**
- Extraction pipeline
- Validation
- Learning documentation
- Pattern updates
- Commit & push

### What This Protocol Does NOT Do

❌ **Not included (run separately):**
- Initial queue setup (user adds PDFs manually)
- Meta-analysis across sessions (run after 10 sessions)
- Master configuration updates (after meta-analysis)
- Prompt/validator revisions (use RIGOR_PROTOCOL.md separately)

### Claude's Responsibility

When you receive the master prompt, you MUST:
1. Follow the 37-step checklist EXACTLY
2. Document learnings thoroughly (not superficially)
3. Update pattern files with real insights
4. Commit everything before completing
5. Report in the standard format

### User's Responsibility

Before starting autonomous sessions:
1. Populate PDF_QUEUE.json with PDFs to process
2. Ensure pdfs/documents/ contains all PDF files
3. Have extraction pipeline ready (agents, validators, schema)
4. Be prepared to run meta-analysis after 10 sessions

---

## 🔧 TROUBLESHOOTING

### "Queue is empty but I have PDFs"
→ PDFs not added to PDF_QUEUE.json. Add them manually.

### "Session keeps locking same PDF"
→ Stale lock. Check locked_at timestamp. Reset if >30min old.

### "Git push fails"
→ Check network. Retry with exponential backoff. Ensure branch exists.

### "Extraction fails repeatedly on same PDF"
→ Mark as failed, investigate root cause, fix prompt/validator, retry.

### "Learning documentation is shallow"
→ Enforce: "learnings.md must have ≥3 observations with evidence"

---

## 📚 RELATED DOCUMENTS

- `RIGOR_PROTOCOL.md` - Full rigor checklist (used during extraction)
- `PDF_QUEUE_README.md` - Queue management details
- `HOW_TO_INSTRUCT_CLAUDE.md` - General instruction guide
- `EXTRACTION_ROBUSTNESS_ANALYSIS.md` - Known blind spots
- `PATTERNS_THAT_WORK.md` / `PATTERNS_TO_AVOID.md` - Learning database
- `CHANGELOG.md` - Version history

---

## ✅ FINAL CHECKLIST

Before declaring session complete:

- [ ] PDF extracted and saved
- [ ] Validation run and results saved
- [ ] Metrics calculated and saved
- [ ] learnings.md created with ≥3 observations
- [ ] PATTERNS_THAT_WORK.md updated
- [ ] PATTERNS_TO_AVOID.md updated
- [ ] EXTRACTION_ROBUSTNESS_ANALYSIS.md updated (if new blind spots)
- [ ] CHANGELOG.md updated
- [ ] PDF_QUEUE.json updated (status, metrics, learnings)
- [ ] All files committed
- [ ] All files pushed
- [ ] Report generated and displayed
- [ ] No uncommitted changes remain

**If all checked:** Session complete ✅

**If any unchecked:** Complete remaining steps before finishing.
