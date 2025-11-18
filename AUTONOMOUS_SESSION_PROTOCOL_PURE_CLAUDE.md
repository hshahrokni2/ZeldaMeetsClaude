# AUTONOMOUS SESSION PROTOCOL - PURE CLAUDE

**Version**: 1.0.0
**Mode**: FULL AUTOMATION - 100% CLAUDE
**Purpose**: Define the autonomous PDF processing workflow for ground truth generation

---

## OVERVIEW

This protocol enables Claude to autonomously process Swedish BRF annual reports without human intervention. Each session processes ONE PDF through a complete extraction pipeline with 19 specialized agents.

---

## SESSION LIFECYCLE

### Session Initialization
```
SESSION_ID: session_YYYYMMDD_HHMMSS
TIMESTAMP: Generated at session start
MODE: AUTONOMOUS
RIGOR: FULL (see RIGOR_PROTOCOL.md)
```

---

## 7-STEP PIPELINE

### STEP 1: PDF Selection & Lock
**Objective**: Select next unprocessed PDF and acquire exclusive lock

**Actions**:
1. Scan `pdfs/` directory for all PDF files (recursive)
2. Check `locks/` directory for existing `.lock` files
3. Check `results/` directory for completed `.json` files
4. Select first PDF without lock or result
5. Create lock file: `locks/{pdf_basename}.lock`
6. Lock contains: `{session_id, timestamp, status: "processing"}`

**Failure Modes**:
- All PDFs locked → Wait 60s and retry (max 3 attempts)
- All PDFs processed → Execute meta-analysis, then STOP

**Output**: `SELECTED_PDF_PATH`, `LOCK_FILE_PATH`

---

### STEP 2: PDF Reading & Analysis
**Objective**: Load PDF and perform vision-based sectionization

**Actions**:
1. Read PDF using `lib/vision-sectionizer.ts`
2. Round 1: Detect L1 sections (Gemini 2.0 Flash)
   - Expected: 9 L1 sections (Styrelse, Resultaträkning, Balansräkning, etc.)
3. Round 2: Extract L2/L3 subsections (Gemini 2.0 Flash)
   - Expected: 50-100 subsections
4. Generate hierarchical document map
5. Extract total page count

**Quality Checks**:
- L1 sections >= 5 (minimum viable)
- L2/L3 subsections >= 20 (comprehensive)
- Page count matches PDF

**Failure Modes**:
- Sectionization fails → Retry once with higher temperature
- Still fails → Mark as FAILED in lock, unlock, skip to next PDF

**Output**: `DOCUMENT_MAP` (JSON), `PAGE_COUNT`

---

### STEP 3: Multi-Pass Extraction (19 Specialized Agents)
**Objective**: Extract all fields using consensus-based multi-model approach

**Routing Logic** (from `orchestrator/routing.ts` - if exists, otherwise inline):
```
For each agent:
  1. Map relevant subsections → agent
  2. Extract page ranges for subsections
  3. Build agent context (prompt + pages + schema)
```

**Execution Strategy**:
```
FOR EACH AGENT in [chairman, board_members, auditor, financial,
                    balance_sheet, property, fees, cashflow, operational,
                    notes_depreciation, notes_maintenance, notes_tax,
                    events, audit_report, loans, reserves, energy,
                    operating_costs, key_metrics, leverantörer]:

  # ROUND 1: Gemini 2.5 Pro
  response_gemini = extract_with_gemini(agent_prompt, relevant_pages)

  # ROUND 2: GPT-4o
  response_gpt = extract_with_gpt(agent_prompt, relevant_pages)

  # CONSENSUS CHECK
  IF gemini_fields == gpt_fields FOR >80% of fields:
    consensus = "HIGH"
    final_data = gemini_fields  # Dual agreement
    skip Claude round
  ELSE:
    # ROUND 3: Claude 3.7 Sonnet (Tiebreaker)
    response_claude = extract_with_claude(agent_prompt, relevant_pages)
    consensus = "MEDIUM"
    final_data = resolve_conflicts(gemini, gpt, claude)

  # STORE RESULTS
  agent_results[agent] = {
    data: final_data,
    consensus: consensus,
    confidence: calculate_avg_confidence(final_data),
    model_responses: {gemini, gpt, claude?}
  }
```

**Consensus Rules**:
- **HIGH** (>0.90): Gemini + GPT agree on >80% of fields
- **MEDIUM** (0.70-0.90): Claude tiebreaker used, 2-out-of-3 agreement
- **LOW** (<0.70): Models disagree, flag for human review

**Quality Metrics** (tracked per agent):
- Fields extracted: count
- High confidence fields: count (confidence >= 0.85)
- Medium confidence fields: count (0.60 <= confidence < 0.85)
- Low confidence fields: count (confidence < 0.60)
- Null fields: count (not found in PDF)

**Cost Tracking**:
- Gemini 2.5 Pro: tokens × rate
- GPT-4o: tokens × rate
- Claude 3.7 Sonnet: tokens × rate (if tiebreaker needed)
- **Target**: $0.75-1.00 per PDF

**Failure Modes**:
- Agent fails 3 times → Skip agent, mark as SKIPPED in results
- Cost exceeds $2.00 → ABORT, unlock PDF, log issue
- Total duration > 20 minutes → ABORT (likely API issue)

**Output**: `AGENT_RESULTS` (JSON object with 19 agent outputs)

---

### STEP 4: Validation & Quality Checks
**Objective**: Cross-field validation and sanity checks

**Validations** (from `lib/schema-validator.ts`):
1. **Balance Sheet Integrity**:
   - `total_assets_tkr == total_liabilities_equity_tkr` (±5% tolerance)

2. **Financial Sanity**:
   - `total_revenue_tkr > 0`
   - `operating_costs_tkr > 0`
   - `net_result_tkr = revenue - costs` (±10% tolerance)

3. **Swedish Format Validation**:
   - Org number: `NNNNNN-NNNN` pattern
   - Postal code: `NNN NN` pattern
   - Phone: `+46` or `0` prefix

4. **Year Consistency**:
   - All year fields = 2023 OR 2024 (expected range)

5. **Confidence Thresholds**:
   - High confidence fields: >= 70%
   - Medium confidence fields: >= 20%
   - Low confidence fields: < 10%

**Failure Modes**:
- Critical validation fails → Flag in results, but CONTINUE
- Confidence too low (high < 50%) → Flag for human review

**Output**: `VALIDATION_REPORT` (JSON with pass/fail/warnings)

---

### STEP 5: Learning Documentation
**Objective**: Document extraction insights for future improvement

**Create Learning Entry** (`learning/{session_id}_{pdf_basename}.md`):
```markdown
# Learning Entry: {pdf_basename}

**Session ID**: {session_id}
**Timestamp**: {timestamp}
**PDF**: {pdf_path}
**Status**: {SUCCESS | PARTIAL | FAILED}

## Extraction Summary
- Total fields: X
- High confidence: Y (Z%)
- Medium confidence: A (B%)
- Low confidence: C (D%)
- Total cost: $E.EE
- Duration: M minutes S seconds

## Agent Performance
{For each agent}:
- **{agent_name}**: {fields_extracted} fields, avg confidence {X.XX}, consensus {HIGH|MEDIUM|LOW}

## Challenges Encountered
{Auto-detected issues}:
- Field {field_name} had low confidence (0.XX) - Reason: {inconsistent formatting}
- Agent {agent_name} disagreed with others on {field_name}
- Validation failed: {validation_rule}

## Document Characteristics
- Structure: {Standard | Visual-heavy | Financial-focus}
- Page count: {N}
- L1 sections detected: {N}
- L2/L3 subsections: {N}
- Special formatting: {Swedish characters, tables, charts}

## Recommendations for Future
- Consider additional context for {field_name}
- {agent_name} might need refined prompt for {pattern}
- Validation rule {rule_name} might need adjustment

## Model Comparison
- Gemini 2.5 Pro: Strengths {Swedish text}, Weaknesses {complex tables}
- GPT-4o: Strengths {numerical extraction}, Weaknesses {Swedish names}
- Claude 3.7: Strengths {tiebreaking}, Used in {X}% of agents
```

**Output**: `LEARNING_FILE_PATH`

---

### STEP 6: Meta-Analysis (Automatic at Milestones)
**Objective**: Aggregate learning across N processed PDFs

**Triggers**:
- After 10 PDFs processed
- After 20 PDFs processed
- After 30 PDFs processed
- ... (every 10 PDFs)
- After ALL PDFs processed

**Create Meta-Analysis** (`learning/meta_analysis_{N}_pdfs.md`):
```markdown
# Meta-Analysis: {N} PDFs Processed

**Generated**: {timestamp}
**PDFs Analyzed**: {list of basenames}

## Aggregate Statistics
- Total fields extracted: {sum across all PDFs}
- Avg high confidence: {X.XX}%
- Avg medium confidence: {Y.YY}%
- Avg low confidence: {Z.ZZ}%
- Total cost: ${sum}
- Avg cost per PDF: ${avg}
- Avg duration: {M}m {S}s

## Agent Performance Ranking
{Sorted by avg confidence}:
1. {agent_name}: {avg_confidence}, {success_rate}
2. ...

## Common Failure Patterns
{Aggregated from all learning entries}:
- Field {field_name} frequently has low confidence across {X}% of PDFs
- Agent {agent_name} often disagrees on {field_pattern}
- Validation {rule_name} fails in {Y}% of cases

## Document Cluster Insights
- Hjorthagen cluster: {characteristics}
- SRS cluster: {characteristics}
- Test set: {characteristics}

## Model Performance Comparison
- Gemini 2.5 Pro: Avg confidence {X.XX}, best for {categories}
- GPT-4o: Avg confidence {Y.YY}, best for {categories}
- Claude 3.7: Used {Z}% of time, avg improvement {W.WW}

## Recommendations
{Data-driven suggestions}:
1. Refine prompt for {agent_name} to improve {field_pattern}
2. Add validation rule for {pattern}
3. Consider alternative model for {use_case}
```

**Output**: `META_ANALYSIS_FILE_PATH`

---

### STEP 7: Commit & Unlock
**Objective**: Save results, update git, release lock

**Actions**:
1. Save extraction results:
   - `results/{pdf_basename}_extraction.json` (full results)

2. Update lock file:
   - Status: "completed" (or "failed" if errors)
   - End timestamp
   - Final statistics

3. Git commit (if successful):
   ```bash
   git add results/{pdf_basename}_extraction.json
   git add learning/{session_id}_{pdf_basename}.md
   git add locks/{pdf_basename}.lock

   # If meta-analysis triggered
   git add learning/meta_analysis_{N}_pdfs.md

   git commit -m "feat: Complete extraction for {pdf_basename} (session {session_id})"
   ```

4. Delete lock file (only if commit succeeds):
   ```bash
   rm locks/{pdf_basename}.lock
   ```

5. Push to remote:
   ```bash
   git push -u origin {branch_name}
   ```

**Failure Modes**:
- Git commit fails → Retry once
- Push fails → Retry with exponential backoff (2s, 4s, 8s, 16s)
- Still fails → Keep lock file, log error, STOP session

**Output**: Committed and pushed results

---

## SESSION TERMINATION

### Success Criteria
- PDF processed successfully
- Results saved to `results/` directory
- Learning documented
- Git commit successful
- Lock file removed

### Failure Handling
- Lock file remains with status "failed"
- Error logged in lock file
- Git commit with failure metadata
- Next session will skip this PDF

### Next PDF Trigger
- Immediately select next PDF and start new session
- Continue until all PDFs processed OR error threshold reached

---

## AUTONOMOUS OPERATION RULES

### No Human Intervention Required For:
- PDF selection
- Lock management
- Extraction execution
- Validation failures (logged, not blocking)
- Learning documentation
- Meta-analysis generation
- Git commits and pushes

### Human Review Required For:
- Cost overruns (>$2.00 per PDF)
- Consecutive failures (>3 PDFs in a row)
- API key issues
- Critical git errors

### Logging
All operations logged to: `logs/session_{session_id}.log`

---

## SESSION CONTEXT REQUIREMENTS

Each autonomous session requires:
- `.env` file with API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)
- All infrastructure in place (agents/, schemas/, lib/, scripts/)
- Git repository initialized and connected to remote
- Branch: `claude/autonomous-pdf-processing-{session_id_short}`

---

## SUCCESS METRICS

### Per PDF
- Extraction success rate: >90%
- High confidence fields: >70%
- Cost: <$1.00
- Duration: <15 minutes

### Across All PDFs
- Total success rate: >95%
- Avg high confidence: >75%
- Avg cost: <$0.85
- Zero human interventions required

---

**Protocol Status**: ✅ ACTIVE
**Last Updated**: 2025-11-18
**Maintainer**: Claude (Autonomous Agent)
