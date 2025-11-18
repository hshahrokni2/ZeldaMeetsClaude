# Autonomous Session Protocol - Pure Claude Edition

**Version**: 3.0.0 (Pure Claude + Automatic Meta-Analysis)
**Purpose**: Single prompt that processes one PDF through complete extraction pipeline - 100% Claude with specialized prompts. Automatically runs meta-analysis every 10 PDFs to refine the system.

---

## 🎯 MASTER PROMPT (Copy-Paste This)

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

---

## 🏗️ ARCHITECTURE: 100% Claude + Self-Improving

**Key Principle:** Instead of calling external APIs, each "agent" is **me (Claude) analyzing the same PDF with different specialized prompts**.

```
OLD Architecture (External APIs):
User → Code → OpenRouter API → Qwen/Gemini/GPT → Response
❌ Problem: Requires API keys, external dependencies, costs money

NEW Architecture (Pure Claude):
User → Single prompt → Claude reads PDF → Claude analyzes with 19 contexts → Response
✅ Advantage: Zero external dependencies, all me, full context visibility
```

**How It Works:**

1. **You give me the master prompt** (above)
2. **I execute all steps autonomously** within our conversation:
   - Read PDF using Read tool
   - Extract text/structure from PDF
   - Apply 19 specialized agent contexts
   - Validate results
   - Document learnings
   - Commit everything
3. **I report completion** with full metrics

**Meta-Analysis Integration:**
- Every 10 completed PDFs (10, 20, 30...), the system automatically:
  - Analyzes patterns across the last 10 sessions
  - Identifies winning prompts/validators/schemas
  - Promotes high-confidence improvements to production
  - Documents new blind spots discovered
  - Updates PATTERNS_*.md with evidence-based findings
- This happens **automatically** within the same session that completes PDF #10, #20, etc.
- No manual intervention required

---

## 📋 AUTONOMOUS EXECUTION CHECKLIST (71 steps, +meta-analysis when triggered)

### PHASE 0: INITIALIZATION (5 minutes)

```
☐ 1. Generate session ID: session_YYYYMMDD_HHMMSS
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
☐ 6. Initialize session tracking:
     - start_time = now()
     - extraction_data = {}
     - validation_results = {}
     - learnings = []
☐ 7. Log session start
```

**If no PDFs available:** Stop and report "Queue empty - all PDFs completed"

---

### PHASE 1: PDF READING & ANALYSIS (10 minutes)

```
☐ 8. Read PDF file using Read tool:
     - Path from queue: pdfs/[path]
     - If PDF unreadable: Mark failed, document error, exit

☐ 9. Extract PDF structure:
     - Total pages
     - Document text (if extractable)
     - Visual layout (if images available)
     - Save as: pdfs/results/[pdf_id]/pdf_content.txt

☐ 10. Identify document type:
      - Standard BRF annual report
      - Consolidated statements
      - Riksbyggen format
      - Other variations

☐ 11. Document initial observations:
      - Quality: OCR needed? Scanned vs digital?
      - Structure: Clear sections? Table of contents?
      - Language: Swedish formatting (numbers, dates)?
      - Challenges: Missing pages? Poor quality? Complex layout?
```

---

### PHASE 2: SECTIONIZATION (15 minutes)

**Goal:** Identify document structure without external APIs - I (Claude) analyze the content directly.

```
☐ 12. Round 1 - Detect L1 Sections:
      Apply sectionization prompt to PDF content:

      CONTEXT: You are a BRF document structure analyzer.
      TASK: Identify top-level sections (L1) in this Swedish BRF annual report.

      LOOK FOR:
      - Förvaltningsberättelse (Management report)
      - Resultaträkning (Income statement)
      - Balansräkning (Balance sheet)
      - Kassaflödesanalys (Cash flow statement)
      - Noter / Tilläggsupplysningar (Notes)
      - Revisionsberättelse (Audit report)
      - Underskrifter (Signatures)

      RETURN: JSON with section titles and page ranges:
      {
        "level_1": [
          {"title": "Förvaltningsberättelse", "start_page": 1, "end_page": 4},
          {"title": "Resultaträkning", "start_page": 5, "end_page": 6},
          ...
        ]
      }

☐ 13. Round 2 - Detect L2/L3 Subsections:
      For each L1 section, identify subsections:

      CONTEXT: You are analyzing subsections within [section title].
      TASK: Identify L2 (main subsections) and L3 (sub-subsections).

      LOOK FOR:
      - Note numbers (Not 1, Not 2, etc.)
      - Board member sections
      - Depreciation details
      - Loan details

      RETURN: JSON with subsections and page ranges

☐ 14. Save section map:
      - pdfs/results/[pdf_id]/section_map.json
      - Log: Detected [N] L1, [M] L2, [P] L3 sections

☐ 15. Route sections to agents:
      Map sections to relevant agents:
      - "Förvaltningsberättelse" → chairman, board_members, property, events
      - "Resultaträkning" → financial, key_metrics
      - "Balansräkning" → balance_sheet, key_metrics
      - "Kassaflödesanalys" → cashflow
      - "Noter" → notes_*, loans, operating_costs

      Create agent routing map:
      {
        "financial_agent": {"pages": [5, 6], "sections": ["Resultaträkning"]},
        "balance_sheet_agent": {"pages": [7, 8], "sections": ["Balansräkning"]},
        ...
      }
```

---

### PHASE 3: MULTI-PASS EXTRACTION (19 Agent Contexts) (60-90 minutes)

**Key Concept:** I (Claude) analyze the PDF 19 times, each with a different specialized context/prompt.

For each of 19 agents:

```
☐ 16-34. Execute Agent [1-19]:

      For agent_id in [financial_agent, balance_sheet_agent, cashflow_agent,
                       property_agent, chairman_agent, board_members_agent,
                       auditor_agent, audit_report_agent, events_agent,
                       fees_agent, reserves_agent, loans_agent, energy_agent,
                       key_metrics_agent, operational_agent, leverantörer_agent,
                       notes_depreciation_agent, notes_maintenance_agent,
                       notes_tax_agent]:

        Step 1: Load agent prompt
        - Read agents/[agent_id].md
        - Extract target fields
        - Extract WHERE TO LOOK hints

        Step 2: Extract relevant pages
        - Use routing map from step 15
        - Get page content for this agent

        Step 3: Apply specialized extraction context
        - CONTEXT: You are [agent_id].
        - ROLE: [from agent prompt]
        - TARGET FIELDS: [list from agent prompt]
        - PAGES TO ANALYZE: [relevant pages]
        - INSTRUCTIONS: [full agent prompt]

        Step 4: Extract data
        - I (Claude) analyze the pages with this context
        - Extract all target fields
        - Track evidence pages for each field
        - Rate confidence for each field (0.0-1.0)

        Step 5: Return structured JSON
        {
          "field_1": value,
          "field_1_original": "original text",
          "field_1_evidence_pages": [5, 6],
          "field_1_confidence": 0.90,
          ...
          "evidence_pages": [5, 6, 7]
        }

        Step 6: Validate agent response
        - Check all required fields present
        - Check _original provided for _tkr fields
        - Check evidence_pages is array of integers
        - Warn (don't block) on issues

        Step 7: Wrap in ExtractionField format
        - Add confidence scores
        - Add normalization metadata
        - Add source tracking

        Step 8: Save agent result
        - pdfs/results/[pdf_id]/agents/[agent_id].json
        - Log: Extracted [N] fields, avg confidence [X]

        Step 9: Track metrics
        - Fields extracted: [count]
        - Avg confidence: [score]
        - Time taken: [seconds]

        ⏱️ Estimated: 3-5 minutes per agent
```

**Total: 19 agents × 4 minutes ≈ 76 minutes**

---

### PHASE 4: AGGREGATION (5 minutes)

```
☐ 35. Merge all agent results:
      - Combine JSON from all 19 agents
      - Handle field conflicts (if any)
      - Preserve all evidence_pages
      - Preserve all confidence scores

☐ 36. Calculate aggregate metrics:
      - Total fields extracted: [count]
      - Field coverage: [extracted / total_schema_fields] %
      - Average confidence: [mean, median, std]
      - Null fields: [count]
      - Evidence coverage: [fields_with_evidence / total_fields] %

☐ 37. Save final extraction:
      - pdfs/results/[pdf_id]/extraction.json (full data)
      - pdfs/results/[pdf_id]/extraction_summary.json (metrics only)
```

---

### PHASE 5: VALIDATION (10 minutes)

```
☐ 38. Schema Validation:
      Apply validation rules from lib/schema-validator.ts:

      - RULE 1: Evidence pages must be array of positive integers
      - RULE 2: Currency fields (_tkr) should have _original
      - RULE 3: No placeholder values ("Unknown", "N/A")
      - RULE 4: Balance sheet equation: Assets = Liabilities + Equity (±1%)
      - RULE 5: Cash flow consistency: Op + Inv + Fin = Net (±2%)
      - RULE 6: Date fields should be ISO 8601 (YYYY-MM-DD)
      - RULE 7: Currency magnitude checks (no 1000x errors)

      Collect:
      - ERRORS: Critical issues (type mismatches, invalid JSON)
      - WARNINGS: Suboptimal but allowed (missing _original, placeholders)
      - METADATA: Coverage stats

☐ 39. Cross-Field Validation:
      - Do total revenue components sum to total?
      - Do balance sheet sides match?
      - Do cash flow components sum correctly?
      - Are depreciation values consistent across agents?

☐ 40. Evidence Quality Validation:
      - Are evidence_pages within agent's scope?
      - Are evidence_pages reasonable (not all on page 1)?
      - Do related fields cite similar pages?

☐ 41. Save validation report:
      - pdfs/results/[pdf_id]/validation_report.json
      {
        "valid": true/false,
        "errors": [...],
        "warnings": [...],
        "metadata": {
          "total_fields": 500,
          "null_fields": 120,
          "field_coverage": 0.76,
          "avg_confidence": 0.85,
          "validation_pass_rate": 0.95
        }
      }

☐ 42. Log validation summary:
      - Errors: [count]
      - Warnings: [count]
      - Pass rate: [percentage]
```

---

### PHASE 6: LEARNING DOCUMENTATION (20 minutes)

**CRITICAL:** This is where compound learning happens. Be thorough!

```
☐ 43. Analyze what worked (≥3 observations):

      Review extraction results and identify:
      - Which agents had highest confidence? Why?
      - Which prompts were clearest? What made them effective?
      - Which sections were easiest to extract? What characteristics?
      - Which validation rules caught real errors?
      - Any unexpected successes?

      Document specific examples with evidence.

☐ 44. Analyze what failed (≥3 observations):

      Review errors and low-confidence fields:
      - Which agents had lowest confidence? Why?
      - Which prompts were ambiguous? Where exactly?
      - Which fields were consistently null? Why?
      - Which validation rules had false positives?
      - Any unexpected failures?

      Document root causes, not just symptoms.

☐ 45. Identify NEW blind spots (any discovered):

      Look for:
      - Edge cases not covered by existing blind spot list
      - Assumptions that proved wrong
      - Failure modes not anticipated
      - Document type variations not handled
      - Validation gaps (errors that slipped through)

      For each new blind spot:
      - Description
      - Impact (Critical/Medium/Low)
      - Frequency (how often will this occur?)
      - Recommendation (how to fix)

☐ 46. Identify patterns (≥2 patterns):

      Look for recurring observations:
      - "Explicit examples in prompts → higher confidence"
      - "Shorter sections → faster extraction"
      - "Swedish number formatting → consistent parsing"
      - "Multi-year tables → need special handling"

      Assess if pattern should be added to PATTERNS_THAT_WORK.md

☐ 47. Write session learnings:
      Create pdfs/results/[pdf_id]/learnings.md:

      # Session [session_id] Learnings
      **PDF**: [pdf_id] ([filename])
      **Date**: [timestamp]
      **Status**: [completed/failed]

      ## Executive Summary
      - Field coverage: [X]%
      - Avg confidence: [X]
      - Validation: [X] errors, [X] warnings
      - Notable: [1-2 sentence summary]

      ## What Worked ✅
      1. [Specific observation with evidence]
         - Agent: [agent_id]
         - Example: [field extracted with confidence X]
         - Why it worked: [analysis]

      2. [Specific observation]

      3. [Specific observation]

      ## What Failed ❌
      1. [Specific failure with root cause]
         - Agent: [agent_id]
         - Field: [field_name]
         - Issue: [description]
         - Root cause: [analysis]
         - Fix: [recommendation]

      2. [Specific failure]

      3. [Specific failure]

      ## New Blind Spots Discovered 🔍
      [If any]
      1. **Blind Spot #X**: [Name]
         - Description: [what is it]
         - Impact: [Critical/Medium/Low]
         - Frequency: [how often]
         - Evidence: [this PDF, field X, page Y]
         - Recommendation: [how to fix]

      [If none]
      - No new blind spots discovered (all known issues confirmed)

      ## Patterns Identified 🔄
      1. [Pattern]: [Description]
         - Add to: PATTERNS_THAT_WORK.md / PATTERNS_TO_AVOID.md
         - Evidence: [examples from this session]
         - Confidence: [X]% (based on N examples)

      2. [Pattern]

      ## Document-Specific Notes
      - [Any unique characteristics of this PDF]
      - [Any special handling needed]
      - [Any warnings for similar documents]

      ## Recommendations for Next Iteration 🚀
      1. [Actionable change to prompt]
         - File: agents/[agent].md:line X
         - Change: [specific edit]
         - Expected impact: [improvement]

      2. [Actionable change to validator]

      3. [Actionable change to schema]

      ## Confidence Ratings
      - Extraction quality: [X]/100
      - Validation reliability: [X]/100
      - Learning thoroughness: [X]/100
      - Overall session confidence: [X]/100

☐ 48. Update PATTERNS_THAT_WORK.md:

      For each positive pattern identified:
      - Add to relevant section
      - Include this PDF as evidence
      - Update confidence rating
      - Increment example count

☐ 49. Update PATTERNS_TO_AVOID.md:

      For each anti-pattern identified:
      - Add to relevant section
      - Include this PDF as evidence
      - Document impact
      - Add fix recommendation

☐ 50. Update EXTRACTION_ROBUSTNESS_ANALYSIS.md (if new blind spots):

      Add to appropriate section (Critical/Medium/Low):
      - Blind Spot #[next number]
      - Description with code references
      - Impact matrix entry
      - Mitigation recommendation

☐ 51. Update CHANGELOG.md:

      Add entry:

      ## [Session session_id] - [Date]

      ### PDF Processed
      - **ID**: [pdf_id]
      - **Filename**: [filename]
      - **Status**: ✅ Completed / ❌ Failed
      - **Metrics**:
        - Field coverage: [X]%
        - Avg confidence: [X]
        - Validation: [X] errors, [X] warnings
        - Cost: $0 (pure Claude, no APIs!)
        - Duration: [X] minutes

      ### Learnings
      - [Key learning 1]
      - [Key learning 2]
      - [Key learning 3]

      ### Patterns Updated
      - PATTERNS_THAT_WORK.md: +[N] patterns
      - PATTERNS_TO_AVOID.md: +[N] anti-patterns

      ### New Blind Spots
      - [Blind Spot #X] (if any)

      ### Files Created
      - pdfs/results/[pdf_id]/extraction.json
      - pdfs/results/[pdf_id]/validation_report.json
      - pdfs/results/[pdf_id]/learnings.md
```

---

### PHASE 7: FINALIZATION (5 minutes)

```
☐ 52. Calculate final metrics:
      - end_time = now()
      - duration_seconds = end_time - start_time
      - duration_minutes = duration_seconds / 60

☐ 53. Create metrics summary:
      Save pdfs/results/[pdf_id]/metrics.json:
      {
        "session_id": "session_YYYYMMDD_HHMMSS",
        "pdf_id": "[pdf_id]",
        "start_time": "[ISO timestamp]",
        "end_time": "[ISO timestamp]",
        "duration_seconds": 5234,
        "duration_minutes": 87,
        "extraction": {
          "total_fields": 500,
          "extracted_fields": 380,
          "null_fields": 120,
          "field_coverage": 0.76,
          "avg_confidence": 0.85,
          "confidence_distribution": {
            "min": 0.60,
            "max": 0.95,
            "median": 0.87,
            "std": 0.12
          }
        },
        "validation": {
          "errors": 0,
          "warnings": 5,
          "pass_rate": 1.0
        },
        "learning": {
          "patterns_discovered": 3,
          "antipatterns_discovered": 2,
          "new_blind_spots": 1
        },
        "cost": {
          "api_calls": 0,
          "external_cost_usd": 0.00,
          "notes": "Pure Claude - no external APIs used"
        }
      }

☐ 54. Update PDF_QUEUE.json:
      - Set status = "completed" (or "failed" if errors)
      - Clear locked_by and locked_at
      - Add to session_history:
        {
          "session_id": "[session_id]",
          "started_at": "[timestamp]",
          "completed_at": "[timestamp]",
          "status": "completed",
          "metrics": { [from metrics.json] },
          "learnings": [
            "Key learning 1",
            "Key learning 2",
            "Key learning 3"
          ]
        }
      - Update counters:
        - completed++ (or failed++)
        - processing--
        - pending-- (already decremented by lock)

☐ 55. Verify all files created:
      ✅ pdfs/results/[pdf_id]/extraction.json
      ✅ pdfs/results/[pdf_id]/validation_report.json
      ✅ pdfs/results/[pdf_id]/metrics.json
      ✅ pdfs/results/[pdf_id]/learnings.md
      ✅ pdfs/results/[pdf_id]/section_map.json
      ✅ pdfs/results/[pdf_id]/agents/ (19 agent results)
      ✅ PDF_QUEUE.json (updated)
      ✅ PATTERNS_THAT_WORK.md (updated)
      ✅ PATTERNS_TO_AVOID.md (updated)
      ✅ EXTRACTION_ROBUSTNESS_ANALYSIS.md (updated if needed)
      ✅ CHANGELOG.md (updated)

☐ 56. Check if meta-analysis threshold reached:

      Read PDF_QUEUE.json
      Check: completed_count % 10 == 0?

      If TRUE:
        → Proceed to Step 57 (Meta-Analysis Phase)

      If FALSE:
        → Skip to Step 65 (Git Commit)
```

---

### PHASE 7B: META-ANALYSIS (AUTOMATIC AT 10, 20, 30... COMPLETIONS)

**Trigger**: Runs automatically when `completed % 10 == 0` (e.g., after PDF #10, #20, #30, etc.)

**Duration**: ~30-45 minutes

```
☐ 57. Initialize meta-analysis:

      session_id_meta = "meta_analysis_batch_[N]_session_[timestamp]"
      batch_number = completed_count / 10
      start_range = (batch_number - 1) * 10 + 1
      end_range = batch_number * 10

      Example: If completed=20, then batch_number=2, range=11-20

☐ 58. Gather data from last 10 sessions:

      Read PDF_QUEUE.json
      sessions_to_analyze = pdfs where status=="completed"
        AND session_history[-1].completed_at >= [timestamp of PDF #start_range]

      Collect for each:
        - learnings.md files
        - metrics.json files
        - validation_report.json files
        - extraction.json field coverage

☐ 59. Analyze cross-session patterns:

      For each category:

      A. Winning Prompts:
         - Which agent prompts consistently achieved >85% confidence?
         - Which prompts worked across diverse document types?
         - Which prompts failed consistently?

      B. Effective Validators:
         - Which validators caught the most errors?
         - Which validators produced false positives?
         - Which validation rules need adjustment?

      C. Schema Coverage Gaps:
         - Which fields are consistently null (>70% sessions)?
         - Which fields have low confidence (<0.75 avg)?
         - Which fields need better extraction logic?

      D. Common Failure Modes:
         - What patterns caused extraction failures?
         - What document characteristics predict low quality?
         - What root causes appear repeatedly?

      E. Blind Spots Discovered:
         - New issues not in EXTRACTION_ROBUSTNESS_ANALYSIS.md
         - Frequency and impact of each
         - Recommended fixes

☐ 60. Generate meta-analysis documents:

      Create experiments/meta_analysis/batch_[N]/

      A. cross_session_patterns.md:
         - Patterns that worked in ≥8/10 sessions → HIGH CONFIDENCE
         - Patterns that worked in 5-7/10 sessions → MEDIUM
         - Patterns that worked in <5/10 sessions → LOW

      B. winning_configurations.md:
         - Best prompts (with evidence from sessions)
         - Best validators (with error catch rates)
         - Best extraction strategies (with coverage stats)

      C. failure_modes_catalog.md:
         - Each failure mode with:
           - Frequency (N/10 sessions)
           - Root cause analysis
           - Recommended fix
           - Priority (Critical/High/Medium/Low)

      D. recommendations.md:
         - Changes to promote to production
         - Changes to test in experiments
         - Changes to defer (low impact)

☐ 61. Decide what to promote to production:

      Criteria for promotion:
      - Pattern appeared in ≥8/10 sessions
      - Measurable improvement (>10% coverage or >0.05 confidence)
      - No negative side effects observed
      - Clear evidence in metrics

      For each promotion candidate:
        → Update agents/[agent].md with improved prompt
        → Update schemas/brf-schema-v1.0.0.ts with field changes
        → Update lib/validators/ with improved validation
        → Document change in CHANGELOG.md

☐ 62. Update EXTRACTION_ROBUSTNESS_ANALYSIS.md:

      Add any new blind spots discovered:
      - Blind Spot #[next number]
      - Description with evidence
      - Impact assessment
      - Frequency across batch
      - Recommended mitigation

☐ 63. Update PATTERNS files:

      PATTERNS_THAT_WORK.md:
        - Promote high-confidence patterns from batch
        - Update confidence ratings with new evidence
        - Add batch number as evidence source

      PATTERNS_TO_AVOID.md:
        - Add anti-patterns discovered in batch
        - Update impact ratings
        - Add specific failure examples

☐ 64. Create batch summary in CHANGELOG.md:

      ## [Batch [N] Meta-Analysis] - [Date]

      ### Batch Summary
      - **PDFs Processed**: #[start_range] to #[end_range] (10 PDFs)
      - **Success Rate**: [X]/10 ([Y]%)
      - **Avg Field Coverage**: [X]%
      - **Avg Confidence**: [X]
      - **Total Cost**: $0 (pure Claude)

      ### Key Findings
      - [Finding 1 with evidence]
      - [Finding 2 with evidence]
      - [Finding 3 with evidence]

      ### Production Promotions
      - [Promoted change 1]: [agent/schema/validator]
      - [Promoted change 2]: [agent/schema/validator]

      ### New Blind Spots
      - Blind Spot #[X]: [Name] (Impact: [Critical/High/Medium/Low])

      ### Next Steps
      - [Recommendation for next batch]
```

---

### PHASE 8: FINALIZATION (5 minutes)

```
☐ 65. Git commit all changes (including meta-analysis if ran):

      git add pdfs/results/[pdf_id]/
      git add pdfs/PDF_QUEUE.json
      git add PATTERNS_THAT_WORK.md
      git add PATTERNS_TO_AVOID.md
      git add EXTRACTION_ROBUSTNESS_ANALYSIS.md
      git add CHANGELOG.md

      # If meta-analysis ran, also add:
      git add experiments/meta_analysis/batch_[N]/
      git add agents/ (if any promoted changes)
      git add schemas/ (if any promoted changes)
      git add lib/validators/ (if any promoted changes)

      git commit -m "session([session_id]): Process [pdf_id] - [status]

      PDF: [filename]
      Location: [location]

      Metrics:
      - Field coverage: [X]%
      - Avg confidence: [X]
      - Validation: [X] errors, [X] warnings
      - Duration: [X] minutes
      - Cost: $0 (pure Claude)

      Learnings:
      - [Key learning 1]
      - [Key learning 2]

      Patterns:
      - +[N] patterns to PATTERNS_THAT_WORK.md
      - +[N] anti-patterns to PATTERNS_TO_AVOID.md

      [If meta-analysis ran]
      Meta-Analysis (Batch [N]):
      - Analyzed sessions [start]-[end]
      - [N] production promotions
      - [N] new blind spots identified

      Files:
      - extraction.json ([X] fields)
      - validation_report.json ([X]% pass rate)
      - learnings.md ([X] observations)
      - metrics.json
      [If meta-analysis ran: + experiments/meta_analysis/batch_[N]/]"

☐ 66. Git push with retry:

      Try: git push origin [branch]

      If fails (network error):
        Wait 2s, retry
        If fails again:
          Wait 4s, retry
          If fails again:
            Wait 8s, retry
            If fails again:
              Wait 16s, retry
              If fails again:
                Log error, continue (will be pushed later)

☐ 67. Clean up temporary files:
      - Remove any .tmp files
      - Remove intermediate processing files

☐ 68. Verify repository state:
      Run: git status
      Expected: "nothing to commit, working tree clean"
      If uncommitted files remain: Investigate and fix
```

---

### PHASE 9: REPORTING (2 minutes)

```
☐ 69. Generate session report (see format below)
      [Include meta-analysis summary if it ran]

☐ 70. Log completion:
      If meta-analysis ran:
        console.log("✅ SESSION [session_id] COMPLETE + META-ANALYSIS BATCH [N] COMPLETE")
      Else:
        console.log("✅ SESSION [session_id] COMPLETE")

☐ 71. Exit gracefully
```

---

## 📊 SESSION REPORT FORMAT

```
═══════════════════════════════════════════════════════════════
AUTONOMOUS SESSION REPORT (Pure Claude Edition)
═══════════════════════════════════════════════════════════════

SESSION ID: session_20251117_143022
PDF ID: brf_axet_4
FILENAME: 267197_årsredovisning_norrköping_brf_axet_4.pdf
LOCATION: Norrköping
STATUS: ✅ COMPLETED

───────────────────────────────────────────────────────────────
EXTRACTION METRICS
───────────────────────────────────────────────────────────────

Document Analysis:
  • Total pages: 12
  • Document type: Standard BRF annual report
  • Quality: Digital PDF, good quality
  • Structure: Clear sections, table of contents present

Sectionization:
  • L1 sections detected: 8
  • L2 subsections detected: 15
  • L3 subsections detected: 23
  • Agent routing: 19 agents mapped to sections

Field Extraction:
  • Total schema fields: 500
  • Extracted: 380 (76%)
  • Null: 120 (24%)
  • With evidence: 365 (96%)

Confidence Distribution:
  • Mean: 0.85
  • Median: 0.87
  • Min: 0.60 (property_designation - unclear in doc)
  • Max: 0.95 (financial fields - explicit values)
  • Std dev: 0.12

Agent Performance (Top 5):
  1. financial_agent: 11/11 fields (100%), avg conf 0.92
  2. balance_sheet_agent: 10/11 fields (91%), avg conf 0.88
  3. cashflow_agent: 5/6 fields (83%), avg conf 0.90
  4. property_agent: 8/12 fields (67%), avg conf 0.75 ⚠️
  5. chairman_agent: 6/8 fields (75%), avg conf 0.85

───────────────────────────────────────────────────────────────
VALIDATION RESULTS
───────────────────────────────────────────────────────────────

Schema Validation:
  • Critical errors: 0 ✅
  • Warnings: 5
    - 2× missing _original for _tkr fields
    - 1× date not ISO 8601 format
    - 2× placeholder values detected

Financial Equation Checks:
  • Balance sheet: ✅ Balanced (0.2% diff, within tolerance)
  • Cash flow: ✅ Consistent (1.1% diff, within tolerance)

Cross-Field Validation:
  • Revenue components sum: ✅ Match
  • Asset components sum: ✅ Match
  • Depreciation consistency: ✅ Match across agents

Evidence Quality:
  • All pages within scope: ✅ Yes
  • Reasonable distribution: ✅ Yes (not all page 1)
  • Related fields cite similar pages: ✅ Yes

Overall Pass Rate: 98% ✅

───────────────────────────────────────────────────────────────
PERFORMANCE
───────────────────────────────────────────────────────────────

Timing:
  • Start: 2025-11-17 14:30:22
  • End: 2025-11-17 15:57:34
  • Duration: 87 minutes (1h 27m)

Phase Breakdown:
  • Phase 0 (Init): 3 min
  • Phase 1 (PDF Reading): 8 min
  • Phase 2 (Sectionization): 12 min
  • Phase 3 (Extraction): 45 min (19 agents × 2.4 min avg)
  • Phase 4 (Aggregation): 4 min
  • Phase 5 (Validation): 7 min
  • Phase 6 (Learning): 15 min
  • Phase 7 (Finalization): 3 min

Cost:
  • External API calls: 0
  • Cost: $0.00 (Pure Claude - no external APIs!) 🎉

───────────────────────────────────────────────────────────────
LEARNINGS DOCUMENTED
───────────────────────────────────────────────────────────────

What Worked (✅):
  1. Clear section headers made routing highly accurate
  2. Financial tables had explicit labels → high confidence (0.92)
  3. Balance sheet equation validation caught potential extraction error

What Failed (❌):
  1. Property designation ambiguous (multiple candidates found)
     → Recommend: Add clarification prompt for ambiguous cases
  2. Chairman dates in Swedish format ("1:a juni 2023")
     → Recommend: Add date parsing/conversion step
  3. Notes subsections sometimes missed (L3 detection incomplete)
     → Recommend: Improve L3 detection prompt with more examples

New Blind Spots (🔍):
  1. **Blind Spot #14**: Swedish Date Format Conversion
     - Impact: Medium
     - Frequency: ~60% of documents
     - Fix: Add date normalization step to validation

Patterns Identified (🔄):
  1. Explicit financial tables → 20% higher confidence
     - Added to PATTERNS_THAT_WORK.md
  2. Multi-candidate property designations → ambiguity
     - Added to PATTERNS_TO_AVOID.md (need disambiguation strategy)

───────────────────────────────────────────────────────────────
FILES CREATED
───────────────────────────────────────────────────────────────

✅ pdfs/results/brf_axet_4/extraction.json (380 fields)
✅ pdfs/results/brf_axet_4/validation_report.json (98% pass)
✅ pdfs/results/brf_axet_4/metrics.json
✅ pdfs/results/brf_axet_4/learnings.md (12 observations)
✅ pdfs/results/brf_axet_4/section_map.json
✅ pdfs/results/brf_axet_4/agents/ (19 files)
✅ PDF_QUEUE.json (updated)
✅ PATTERNS_THAT_WORK.md (+1 pattern)
✅ PATTERNS_TO_AVOID.md (+1 anti-pattern)
✅ EXTRACTION_ROBUSTNESS_ANALYSIS.md (+1 blind spot)
✅ CHANGELOG.md (session entry added)

───────────────────────────────────────────────────────────────
GIT COMMIT
───────────────────────────────────────────────────────────────

Commit: a3f5b2e1
Branch: claude/review-pdf-extraction-019GPWQbw5Ln9tfuM1EGnx3X
Pushed: ✅ Yes

───────────────────────────────────────────────────────────────
QUEUE STATUS
───────────────────────────────────────────────────────────────

Total PDFs: 62
Completed: 1 (2%)
Processing: 0
Pending: 61 (98%)
Failed: 0
Success rate: 100%

───────────────────────────────────────────────────────────────
NEXT STEPS
───────────────────────────────────────────────────────────────

Ready for next PDF ✅

To process next PDF, run:
  AUTONOMOUS SESSION - PROCESS NEXT PDF

Estimated remaining time:
  • Sequential (1 session): ~53 hours (61 PDFs × 87 min avg)
  • Parallel (10 sessions): ~5-6 hours (61 PDFs ÷ 10)

═══════════════════════════════════════════════════════════════
```

---

## 🛡️ ERROR HANDLING

### If PDF Reading Fails

```
Issue: PDF unreadable, corrupted, or missing
Action:
  1. Log error with details
  2. Save error to pdfs/results/[pdf_id]/errors.log
  3. Mark status = "failed" in queue
  4. Document in session_history with error details
  5. Commit partial results (diagnostics)
  6. Report failure
  7. Continue to next PDF
```

### If Extraction Fails Mid-Session

```
Issue: Agent extraction throws error or returns invalid JSON
Action:
  1. Log which agent failed
  2. Save partial results from successful agents
  3. Mark failed agent in metrics
  4. Continue with remaining agents (graceful degradation)
  5. Note failure in learnings.md
  6. Mark session as "completed_with_errors"
  7. Commit what we have
```

### If Validation Fails Critically

```
Issue: Too many critical errors (>10% of fields)
Action:
  1. Don't mark as failed (lenient mode)
  2. Document all errors in validation_report.json
  3. Flag for human review in learnings.md
  4. Continue with learning documentation
  5. Commit with warning flag
```

### If Git Push Fails

```
Issue: Network error, authentication failure
Action:
  1. Retry with exponential backoff (4 attempts)
  2. If all fail: Log error but continue
  3. Files remain committed locally
  4. Will be pushed when network recovers
  5. Don't block next PDF processing
```

### If Queue Lock Conflict

```
Issue: Another session locked PDF first (race condition)
Action:
  1. Detect: locked_by != this session
  2. Log: "PDF already locked by [other_session]"
  3. Skip to next available PDF
  4. Retry Phase 0 step 3 with next PDF
```

---

## ✅ SUCCESS CRITERIA

A session is successful if:

**Extraction:**
- ✅ PDF read successfully
- ✅ ≥70% field coverage achieved
- ✅ Average confidence ≥0.75
- ✅ All 19 agents executed (even if some return null fields)

**Validation:**
- ✅ No critical validation errors (type mismatches, invalid JSON)
- ✅ Balance sheet equation holds (within ±1%) OR documented why not
- ✅ Evidence pages tracked for ≥80% of non-null fields

**Learning:**
- ✅ learnings.md created with ≥3 "what worked" + ≥3 "what failed"
- ✅ PATTERNS_*.md updated with ≥1 new entry
- ✅ New blind spots documented (if any discovered)
- ✅ CHANGELOG.md updated with session summary

**Commit:**
- ✅ All files saved to pdfs/results/[pdf_id]/
- ✅ PDF_QUEUE.json updated with status + metrics
- ✅ All changes committed
- ✅ Changes pushed (or queued for later push)
- ✅ No uncommitted files remaining

---

## 🎯 KEY DIFFERENCES FROM API-BASED VERSION

| Aspect | API Version (Old) | Pure Claude (New) |
|--------|-------------------|-------------------|
| **Architecture** | Code → External APIs | Prompt → Me (Claude) |
| **Dependencies** | OpenRouter, Qwen, Gemini, GPT | Zero external |
| **Cost** | $0.03-0.05 per PDF | $0 (included in Claude session) |
| **Setup** | API keys, provisioning | None |
| **Speed** | 30-45 min (parallel APIs) | 60-90 min (sequential contexts) |
| **Quality** | Ensemble consensus | Single model, multiple passes |
| **Visibility** | Black box API calls | Full transparency (all my work) |
| **Learning** | From API responses | From my own analysis |
| **Debugging** | Check API logs | Review my reasoning |
| **Reliability** | Network dependent | Conversation dependent |

**Trade-off:**
- Slower per PDF (2x time)
- But zero setup, zero cost, full transparency
- Better for learning (I see everything, not just API responses)

---

## 📚 RELATED DOCUMENTS

- `RIGOR_PROTOCOL.md` - Rigor framework (applies to all steps)
- `PDF_QUEUE_README.md` - Queue management
- `HOW_TO_INSTRUCT_CLAUDE.md` - How to invoke this protocol
- `EXTRACTION_ROBUSTNESS_ANALYSIS.md` - Known blind spots
- `PATTERNS_THAT_WORK.md` / `PATTERNS_TO_AVOID.md` - Learning database
- `CHANGELOG.md` - Session history

---

## 💡 OPTIMIZATION TIPS

### Speed Up Extraction

1. **Parallel sessions** (still recommended): 10 sessions = 10 PDFs simultaneously
2. **Skip low-value agents**: If field coverage is high enough, could skip some agents
3. **Batch similar fields**: Extract related fields together to reduce context switches

### Improve Quality

1. **Add examples to agent prompts**: More examples → higher confidence
2. **Refine section detection**: Better routing → more relevant pages per agent
3. **Iterate on failed fields**: If field consistently null, improve agent prompt

### Reduce Errors

1. **Validate early**: Check after each agent, not just at end
2. **Add guardrails**: Explicit "do not hallucinate" instructions
3. **Use evidence**: Cross-reference extracted values with evidence pages

---

## 🎓 USAGE EXAMPLE

### User starts session:

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

### I (Claude) respond:

```
✅ AUTONOMOUS SESSION INITIATED

Session ID: session_20251117_143022

─────────────────────────────────────────────
PHASE 0: INITIALIZATION
─────────────────────────────────────────────

[I execute steps 1-7, showing progress]

✅ Selected PDF: brf_axet_4
✅ Locked in queue
✅ Created results directory
✅ Session tracking initialized

─────────────────────────────────────────────
PHASE 1: PDF READING & ANALYSIS
─────────────────────────────────────────────

[I read the PDF and analyze it]

✅ PDF read successfully
✅ 12 pages detected
✅ Document type: Standard BRF annual report
✅ Quality: Good (digital PDF)

─────────────────────────────────────────────
PHASE 2: SECTIONIZATION
─────────────────────────────────────────────

[I analyze structure and detect sections]

✅ Round 1: 8 L1 sections detected
✅ Round 2: 15 L2, 23 L3 subsections detected
✅ Agent routing: 19 agents mapped

[... continues through all phases ...]

─────────────────────────────────────────────
PHASE 8: REPORTING
─────────────────────────────────────────────

[Full session report displayed]

═══════════════════════════════════════════
SESSION COMPLETE ✅
═══════════════════════════════════════════

Ready for next PDF!
```

---

## ✅ FINAL CHECKLIST

Before declaring session complete:

- [ ] PDF extracted and saved
- [ ] All 19 agents executed
- [ ] Validation run and results saved
- [ ] Metrics calculated and saved
- [ ] learnings.md created with ≥6 observations
- [ ] PATTERNS_THAT_WORK.md updated
- [ ] PATTERNS_TO_AVOID.md updated
- [ ] EXTRACTION_ROBUSTNESS_ANALYSIS.md updated (if new blind spots)
- [ ] CHANGELOG.md updated
- [ ] PDF_QUEUE.json updated (status, metrics, learnings)
- [ ] All files committed
- [ ] All files pushed (or queued)
- [ ] Report generated and displayed
- [ ] No uncommitted changes remain

**If all checked:** Session complete ✅
**If any unchecked:** Complete remaining steps before finishing.

---

**END OF PROTOCOL**

To process next PDF: Paste master prompt again!
