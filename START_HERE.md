# 🚀 START HERE - Autonomous PDF Extraction with Compound Learning

**The simplest way to process PDFs with maximum rigor and automatic learning**

---

## ⚡ Quick Start (30 seconds)

### Step 1: Add Your PDFs

1. Copy PDF files to `pdfs/documents/`
2. Update `pdfs/PDF_QUEUE.json`:

```json
{
  "queue_version": "1.0.0",
  "last_updated": "2025-11-17T00:00:00Z",
  "total_pdfs": 3,
  "completed": 0,
  "processing": 0,
  "pending": 3,
  "failed": 0,
  "pdfs": [
    {
      "id": "brf_001",
      "filename": "brf_001.pdf",
      "path": "pdfs/documents/brf_001.pdf",
      "status": "pending",
      "priority": 1,
      "metadata": {
        "fiscal_year": 2023,
        "pages": 12,
        "size_kb": 1248,
        "added_date": "2025-11-17T10:00:00Z",
        "characteristics": ["standard_format"]
      },
      "session_history": []
    },
    {
      "id": "brf_002",
      "filename": "brf_002.pdf",
      "path": "pdfs/documents/brf_002.pdf",
      "status": "pending",
      "priority": 1,
      "metadata": {
        "fiscal_year": 2023,
        "pages": 18,
        "size_kb": 2156,
        "added_date": "2025-11-17T10:00:00Z",
        "characteristics": ["consolidated_statements"]
      },
      "session_history": []
    }
  ]
}
```

### Step 2: Start Claude Session

Open a new Claude session and paste this **SINGLE PROMPT**:

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

### Step 3: Repeat

When Claude finishes (reports "Session complete ✅"), paste the prompt again for the next PDF.

**That's it!** Each session automatically:
- ✅ Picks next PDF from queue
- ✅ Extracts with full rigor
- ✅ Validates results
- ✅ Documents learnings
- ✅ Updates pattern database
- ✅ Commits everything
- ✅ Reports completion

---

## 🔥 Parallel Processing (10x Speed)

Open **10 Claude sessions**, paste the **SAME prompt** in each:

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

All 10 sessions will:
- Each lock a **different PDF** (no conflicts)
- Process in **parallel** (10x faster)
- Each **commit independently** (no merge conflicts)
- All **learn together** (compound knowledge in shared files)

**No coordination needed** - the queue handles everything!

---

## 📊 What You Get Per PDF

After each session completes, you'll have:

### Extraction Results
```
pdfs/results/brf_001/
├── extraction.json           ← Final extracted data (500+ fields)
├── validation_report.json    ← Quality checks (errors, warnings)
├── metrics.json              ← Cost, tokens, time, coverage
└── learnings.md              ← What worked, what failed, new insights
```

### Updated Learning Database
```
PATTERNS_THAT_WORK.md         ← +N new patterns discovered
PATTERNS_TO_AVOID.md          ← +N anti-patterns identified
EXTRACTION_ROBUSTNESS_ANALYSIS.md  ← New blind spots (if any)
CHANGELOG.md                  ← Session summary
```

### Updated Queue
```
pdfs/PDF_QUEUE.json           ← Status updated to "completed"
                              ← Session metrics recorded
                              ← Ready for next PDF
```

**All committed and pushed automatically** - no manual work!

---

## 📈 Monitoring Progress

### Quick Status Check

```bash
cat pdfs/PDF_QUEUE.json | jq '{total: .total_pdfs, done: .completed, remaining: .pending, failed: .failed}'
```

Output:
```json
{
  "total": 100,
  "done": 42,
  "remaining": 53,
  "failed": 5
}
```

### Average Quality Metrics

```bash
cat pdfs/PDF_QUEUE.json | jq '[.pdfs[] | select(.status == "completed") | .session_history[-1].metrics] | {avg_coverage: (map(.field_coverage) | add / length), avg_confidence: (map(.avg_confidence) | add / length), avg_cost: (map(.cost_usd) | add / length)}'
```

Output:
```json
{
  "avg_coverage": 0.87,
  "avg_confidence": 0.85,
  "avg_cost": 0.042
}
```

---

## 🎓 What Makes This Special

### 1. **Zero Manual Work**
- No intermediate prompts needed
- No file management
- No learning documentation
- No commits
- **Everything automatic**

### 2. **Compound Learning**
- Every session improves the system
- Patterns discovered → added to database
- Anti-patterns found → added to avoid list
- Blind spots detected → added to analysis
- **System gets smarter with each PDF**

### 3. **Maximum Rigor**
- GraphLang/DSPy-level quality (applied manually)
- Cite line numbers for all claims
- Rate confidence on all assertions
- Systematic double-checking
- Adversarial blind spot detection

### 4. **Parallel-Safe**
- 10 sessions can run simultaneously
- Atomic locking prevents conflicts
- Each session commits independently
- All contribute to shared learning
- **Linear speedup** (10 sessions ≈ 10x faster)

### 5. **Self-Documenting**
- Every session generates learnings.md
- Patterns automatically catalogued
- Blind spots systematically tracked
- CHANGELOG updated automatically
- **Complete audit trail**

---

## 🔄 After 10 PDFs: Meta-Analysis

Once you've processed 10+ PDFs, run meta-analysis:

```
TASK: Meta-Analysis Across Sessions 001-010

Protocol: RIGOR_PROTOCOL.md → "LEARNING PROTOCOL: 10 Parallel Sessions"

Analyze:
1. Cross-session patterns (what worked across all documents?)
2. Winning configurations (best prompts, validators, schemas)
3. Failure modes catalog (common failures + root causes)
4. Next hypotheses (what to test next)

Deliverables:
- experiments/meta_analysis/cross_session_patterns.md
- experiments/meta_analysis/winning_configurations.md
- experiments/meta_analysis/failure_modes_catalog.md
- experiments/meta_analysis/next_hypotheses.md
- Promoted configs to production (if validated)

BEGIN META-ANALYSIS
```

This identifies:
- Patterns that work **across all documents** → promote to production
- Patterns that work **only for specific types** → document conditions
- Prompts that consistently **outperform** → make default
- Validators that consistently **catch errors** → keep and expand

---

## 📚 Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **START_HERE.md** (this file) | Quick start guide | First! |
| **AUTONOMOUS_SESSION_PROTOCOL.md** | Full 37-step checklist | If session fails or you want details |
| **HOW_TO_INSTRUCT_CLAUDE.md** | All prompt templates | For manual tasks (revising prompts/validators) |
| **RIGOR_PROTOCOL.md** | Complete rigor framework | Deep dive into methodology |
| **EXTRACTION_ROBUSTNESS_ANALYSIS.md** | Known blind spots (13 issues) | Understanding current limitations |
| **PATTERNS_THAT_WORK.md** | Proven patterns | Reference when designing changes |
| **PATTERNS_TO_AVOID.md** | Anti-patterns | Reference when debugging |
| **CHANGELOG.md** | Version history | Tracking progress over time |

---

## ⚠️ Troubleshooting

### "Queue is empty but I have PDFs"
→ PDFs not in `pdfs/PDF_QUEUE.json`. Add them (see Step 1).

### "Session fails immediately"
→ Check PDF exists at path specified in queue.
→ Check extraction pipeline setup (agents/, lib/, schemas/).

### "Session locks PDF but never completes"
→ After 30min, lock auto-resets. Next session will retry.
→ Check logs in `pdfs/results/[pdf_id]/errors.log`.

### "Git push fails"
→ Network issue. Claude will retry with exponential backoff.
→ Verify git remote configured correctly.

### "Learning documentation is shallow"
→ Claude must write ≥3 observations per session.
→ Enforce: "learnings.md must have specific examples with evidence"

---

## ✅ Success Criteria

**Per Session:**
- ✅ Field coverage ≥70%
- ✅ Average confidence ≥0.75
- ✅ No critical validation errors
- ✅ ≥3 learnings documented
- ✅ Pattern files updated
- ✅ Everything committed

**Per 10 Sessions:**
- ✅ Success rate ≥90% (≤1 failure per 10 PDFs)
- ✅ Average cost ≤$0.05 per document
- ✅ ≥5 new patterns discovered
- ✅ ≥2 blind spots identified and addressed
- ✅ System measurably improved (metrics trending up)

---

## 🎯 What To Do Now

### Option 1: Process Your PDFs (Recommended)
1. Add PDFs to queue (see Step 1)
2. Paste master prompt (see Step 2)
3. Watch Claude work autonomously
4. Repeat or run 10 parallel sessions

### Option 2: Fix Known Blind Spots First
1. Read `EXTRACTION_ROBUSTNESS_ANALYSIS.md`
2. Pick a critical blind spot (#1, #2, or #6)
3. Use manual mode to fix it (see `HOW_TO_INSTRUCT_CLAUDE.md`)
4. Test with experiments
5. Then process PDFs with improved system

### Option 3: Test With Sample Documents
1. Add 5 diverse test PDFs to queue
2. Process sequentially (5 sessions)
3. Review learnings.md for each
4. Identify patterns
5. Update prompts/validators based on findings
6. Scale to full corpus

---

## 🚀 Ready?

Copy-paste this into a new Claude session:

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

**That's all you need!** 🎉

---

## 💡 Pro Tips

1. **Start with 5 PDFs** to calibrate the system before scaling
2. **Review learnings.md** after each session to understand what's being learned
3. **Run meta-analysis after 10 PDFs** to identify compound improvements
4. **Monitor queue status** regularly to track progress
5. **Keep git remote synced** so parallel sessions don't conflict
6. **Backup PDF_QUEUE.json** before major changes
7. **Retry failed PDFs** after fixing root cause issues
8. **Use priority levels** to process high-value documents first
9. **Track cost trends** to optimize token usage over time
10. **Celebrate improvements** when metrics trend upward! 📈

---

**Questions?** See the full documentation in the files listed above, or ask Claude in manual mode.
