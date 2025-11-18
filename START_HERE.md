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

Open a new Claude session and paste this **EXACT PROMPT**:

```
⚠️ EXECUTE PROTOCOL - DO NOT BUILD NEW INFRASTRUCTURE ⚠️

Read these files NOW using the Read tool:
1. /home/user/ZeldaMeetsClaude/AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md
2. /home/user/ZeldaMeetsClaude/pdfs/PDF_QUEUE.json

Then execute the 71-step checklist starting at Phase 0.

CRITICAL - WHAT NOT TO DO:
❌ DO NOT create new .ts/.js files
❌ DO NOT write new scripts/orchestrators
❌ DO NOT build new infrastructure
❌ DO NOT create demo/mock data
❌ DO NOT push to different branches

REQUIRED - WHAT TO DO:
✅ READ the protocol file (AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md)
✅ READ the queue (pdfs/PDF_QUEUE.json)
✅ PICK first PDF with status="pending"
✅ LOCK it (Edit PDF_QUEUE.json: set status="processing", locked_by=session_id)
✅ READ the actual PDF file using Read tool
✅ EXTRACT data by analyzing PDF 19 times with different contexts
✅ WRITE results to pdfs/results/[pdf_id]/extraction.json
✅ COMMIT to branch: claude/review-pdf-extraction-019GPWQbw5Ln9tfuM1EGnx3X

TOOLS YOU WILL USE:
- Read: to read PDFs, protocols, queue
- Edit: to update PDF_QUEUE.json
- Write: to create extraction.json, learnings.md, metrics.json
- Bash: for git add/commit/push only

START NOW:
Read /home/user/ZeldaMeetsClaude/pdfs/PDF_QUEUE.json and begin Phase 0, Step 1.
```

**What's special:** This forces Claude to USE the existing protocol, not build a new one!

### Step 3: Repeat

When Claude finishes (reports "Session complete ✅"), paste the prompt again for the next PDF.

**That's it!** Each session automatically:
- ✅ Picks next PDF from queue
- ✅ Reads PDF content (using Read tool)
- ✅ Analyzes with 19 specialized contexts (all Claude!)
- ✅ Validates results
- ✅ Documents learnings
- ✅ Updates pattern database
- ✅ **Runs meta-analysis** (every 10th PDF: #10, #20, #30...)
- ✅ **Refines prompts/validators** (promotes winning patterns to production)
- ✅ Commits everything
- ✅ Reports completion

**Time per PDF:** ~60-90 minutes regular | ~90-135 minutes with meta-analysis (every 10th)
**Cost:** $0 (100% Claude, no external APIs!)

---

## 🔥 Parallel Processing (10x Speed)

Open **10 Claude sessions**, paste the **SAME prompt** in each:

```
AUTONOMOUS SESSION - PROCESS NEXT PDF

Protocol: AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md
Rigor: RIGOR_PROTOCOL.md
Mode: FULL AUTOMATION - 100% CLAUDE

Execute complete pipeline:
1. PDF Selection & Lock
2. PDF Reading & Analysis
3. Multi-Pass Extraction (19 specialized contexts)
4. Validation & Quality Checks
5. Learning Documentation
6. Commit & Unlock

Session ID: [GENERATE: session_YYYYMMDD_HHMMSS]

BEGIN AUTONOMOUS EXECUTION
```

All 10 sessions will:
- Each lock a **different PDF** (no conflicts)
- Process in **parallel** (10x faster)
- Each **commit independently** (no merge conflicts)
- All **learn together** (compound knowledge in shared files)

**No coordination needed** - the queue handles everything!

**62 PDFs ÷ 10 sessions = ~6 PDFs per session**
**Estimated time: 8-10 hours total** (vs 60+ hours sequential)

**Why slower than you might expect?** Pure Claude (no external APIs) takes ~75 min per PDF vs ~30 min with parallel API calls. Trade-off: Zero setup, zero cost, full transparency!

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

## 🔄 Automatic Meta-Analysis (Every 10 PDFs)

**No manual intervention required!** The system automatically runs meta-analysis when completing PDFs #10, #20, #30, etc.

### What Happens Automatically

When you complete PDF #10 (or #20, #30...), the same session will:

1. **Analyze Last 10 Sessions**:
   - Cross-session patterns (what worked across all documents?)
   - Winning configurations (best prompts, validators, schemas)
   - Failure modes catalog (common failures + root causes)
   - New blind spots discovered

2. **Generate Analysis Documents**:
   - `experiments/meta_analysis/batch_N/cross_session_patterns.md`
   - `experiments/meta_analysis/batch_N/winning_configurations.md`
   - `experiments/meta_analysis/batch_N/failure_modes_catalog.md`
   - `experiments/meta_analysis/batch_N/recommendations.md`

3. **Promote to Production** (automatically):
   - Patterns that work in ≥8/10 sessions → update `agents/*.md`
   - Validators that catch errors consistently → update `lib/validators/`
   - Schema improvements → update `schemas/brf-schema-v1.0.0.ts`

4. **Update Learning Databases**:
   - Add high-confidence patterns to `PATTERNS_THAT_WORK.md`
   - Add anti-patterns to `PATTERNS_TO_AVOID.md`
   - Add new blind spots to `EXTRACTION_ROBUSTNESS_ANALYSIS.md`

5. **Commit Everything** (single commit with PDF + meta-analysis)

### Result

- Session #10 takes ~90-135 min instead of ~60-90 min
- Session #11 benefits from improved prompts/validators
- System gets **measurably better** every 10 PDFs
- **Zero manual work** required from you!

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
