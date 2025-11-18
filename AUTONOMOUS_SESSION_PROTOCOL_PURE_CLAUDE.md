# Autonomous Session Protocol - Pure Claude Mode

**Version**: 1.0.0
**Mode**: FULL AUTOMATION - 100% CLAUDE
**Purpose**: Enable Claude to autonomously process BRF PDFs without human intervention

---

## Session Lifecycle

### 1. Session Initialization
```
Session ID Format: session_YYYYMMDD_HHMMSS
Example: session_20251118_143052
```

**Actions**:
- Generate unique session ID with timestamp
- Create session directory: `sessions/{session_id}/`
- Initialize session log: `sessions/{session_id}/session.log`
- Lock tracking system for atomic operations

### 2. PDF Selection & Locking

**Selection Algorithm**:
1. Read `tracking/processing_status.json`
2. Filter PDFs where `status === "pending"`
3. Select first available PDF (FIFO order)
4. Atomically lock PDF: `status = "processing"`, `locked_at = ISO timestamp`, `locked_by = session_id`
5. If no PDFs available, exit gracefully

**Lock Safety**:
- Maximum lock duration: 60 minutes
- Stale lock detection: If `locked_at` > 60 min ago, treat as failed and unlock
- Lock must be released on: completion, error, timeout

### 3. PDF Reading & Analysis

**Step 3.1: Load PDF**
- Read PDF from: `pdfs/{filename}`
- Convert to base64 images (one per page)
- Store in: `sessions/{session_id}/pages/`
- Page numbering: 1-based (human readable)

**Step 3.2: Vision Sectionization**
- Execute Round 1: Detect 9 L1 sections (Styrelse, Förvaltning, etc.)
- Execute Round 2: Extract L2+L3 subsections (50-100 subsections)
- Output: `sessions/{session_id}/section_map.json`
- Use: Gemini 2.0 Flash (cost-effective, vision-optimized)

### 4. Multi-Pass Extraction (19 Specialized Agents)

**Agent Execution Order**:
```
Phase 1: Governance (3 agents)
  - chairman_agent
  - board_members_agent
  - auditor_agent

Phase 2: Financial Core (3 agents)
  - financial_agent
  - balance_sheet_agent
  - cashflow_agent

Phase 3: Property & Operations (4 agents)
  - property_agent
  - fees_agent
  - operational_agent
  - energy_agent

Phase 4: Notes & Details (3 agents)
  - notes_depreciation_agent
  - notes_maintenance_agent
  - notes_tax_agent

Phase 5: Supplementary (6 agents)
  - events_agent
  - audit_report_agent
  - loans_agent
  - reserves_agent
  - key_metrics_agent
  - leverantörer_agent
```

**Per-Agent Protocol**:
1. **Route sections**: Use orchestrator to find relevant subsections
2. **Extract pages**: Get page ranges from subsections
3. **Consensus extraction**:
   - Round 1: Gemini 2.5 Pro extracts fields → JSON
   - Round 2: GPT-4o extracts fields → JSON
   - Round 3: Claude 3.7 Sonnet acts as tiebreaker (if disagreement)
4. **Consensus rules**:
   - Both agree (Gemini + GPT) → HIGH confidence (0.9-1.0)
   - Claude tiebreaker needed → MEDIUM confidence (0.6-0.8)
   - No consensus → LOW confidence (0.3-0.5), flag for manual review
5. **Save result**: `sessions/{session_id}/agents/{agent_id}.json`

**Error Handling**:
- API timeout (>120s): Retry with exponential backoff (3 attempts)
- Invalid JSON: Use repair algorithm (from extraction-workflow.ts)
- Missing fields: Mark as `null` with `confidence: 0.0`
- Agent failure: Continue processing, flag in validation report

### 5. Validation & Quality Checks

**Cross-Field Validation**:
- Balance sheet equation: `assets_tkr = liabilities_tkr + equity_tkr` (±5% tolerance)
- Date sanity: `year >= 2020 && year <= 2025`
- Revenue sanity: `total_revenue_tkr > 0`
- Swedish format: org_number matches `NNNNNN-NNNN`, postal_code matches `NNN NN`

**Quality Metrics**:
- Field coverage: `(fields_extracted / total_fields) * 100`
- Average confidence: `mean(all_field_confidences)`
- High-confidence fields: `count(confidence >= 0.8)`
- Flagged fields: Fields with `confidence < 0.6` or validation errors

**Output**: `sessions/{session_id}/validation_report.json`

### 6. Learning Documentation

**Capture for Each PDF**:
1. **Extraction challenges**: Which fields were hard to find? Why?
2. **Section structure**: Deviations from standard BRF format
3. **Model performance**: Which models struggled? Which excelled?
4. **Cost breakdown**: Token usage per agent, total cost
5. **Timing**: Duration per phase, bottlenecks

**Output**: `sessions/{session_id}/learning_notes.md`

**Accumulation**: Append summary to `learning/cumulative_insights.md`

### 7. Meta-Analysis (Triggered at Milestones)

**Triggers**:
- Every 10 PDFs: Generate summary (10, 20, 30, etc.)
- Every 50 PDFs: Deep analysis with charts

**Meta-Analysis Content**:
1. **Performance trends**: Accuracy over time, field coverage improvements
2. **Cost trends**: Average cost per PDF, cost reduction strategies
3. **Model comparison**: Gemini vs GPT vs Claude accuracy by field type
4. **Common failures**: Top 10 fields with lowest confidence
5. **Recommendations**: Protocol adjustments, agent prompt improvements

**Output**: `meta_analysis/milestone_{count}.md`

### 8. Commit & Unlock

**Commit Strategy**:
```bash
git add sessions/{session_id}/
git add tracking/processing_status.json
git add learning/cumulative_insights.md
git commit -m "feat: Process PDF {filename} - Session {session_id}

Extracted: {field_coverage}% fields
Avg Confidence: {avg_confidence}
Duration: {duration_minutes} min
Cost: ${total_cost}

Agents: {successful_agents}/19 succeeded
Quality: {quality_tier} (HIGH/MEDIUM/LOW)"

git push -u origin {branch_name}
```

**Unlock PDF**:
- Update `tracking/processing_status.json`:
  - `status = "completed"`
  - `completed_at = ISO timestamp`
  - `locked_by = null`
  - `session_id = {session_id}`
  - `metrics = { field_coverage, avg_confidence, cost, duration }`

**Cleanup**:
- Remove page images if > 100MB: `sessions/{session_id}/pages/` (keep section_map.json)
- Archive session data: Compress to `sessions/{session_id}.tar.gz` after 7 days

---

## Autonomous Decision Rules

### When to Continue vs. Stop

**Continue Processing**:
- PDF locked successfully
- At least 10/19 agents succeeded
- Field coverage >= 30%
- No critical errors (filesystem, git, API keys)

**Stop Processing (Graceful)**:
- No pending PDFs available
- Reached processing limit (e.g., 100 PDFs)
- Critical API key exhausted (all models)
- Unrecoverable error (corrupted PDF, invalid schema)

**Stop Processing (Emergency)**:
- Git push fails 3 times (network issue)
- Filesystem full (disk space < 1GB)
- Session duration > 2 hours (infinite loop detection)

### Error Recovery

**Transient Errors** (retry with backoff):
- Network timeouts
- API rate limits (429 errors)
- Temporary API outages (503 errors)

**Permanent Errors** (skip and flag):
- Corrupted PDF (unreadable)
- Invalid PDF format
- Missing API keys
- Schema validation failure (JSON structure broken)

**Recovery Log**: `sessions/{session_id}/errors.json`

---

## Quality Tiers

**HIGH Quality** (production-ready):
- Field coverage >= 80%
- Avg confidence >= 0.85
- At least 16/19 agents succeeded
- All critical fields present (brf_name, org_number, year)

**MEDIUM Quality** (needs review):
- Field coverage 50-79%
- Avg confidence 0.70-0.84
- At least 12/19 agents succeeded

**LOW Quality** (flag for manual)**:
- Field coverage < 50%
- Avg confidence < 0.70
- Fewer than 12/19 agents succeeded

---

## Session Output Structure

```
sessions/{session_id}/
├── session.log                      # Timestamped execution log
├── section_map.json                 # Vision sectionizer output
├── pages/                           # PDF page images (temp)
│   ├── page_001.png
│   ├── page_002.png
│   └── ...
├── agents/                          # Per-agent extraction results
│   ├── chairman_agent.json
│   ├── financial_agent.json
│   └── ... (19 files)
├── final_extraction.json            # Merged ground truth
├── validation_report.json           # Quality metrics + errors
├── learning_notes.md                # Session insights
└── errors.json                      # Error log (if any)
```

---

## Success Criteria

A session is successful when:
1. ✅ PDF processed from start to finish
2. ✅ Final extraction JSON generated
3. ✅ Validation report shows quality >= MEDIUM
4. ✅ Learning notes documented
5. ✅ Results committed to git
6. ✅ PDF unlocked in tracking system
7. ✅ No unrecovered errors

---

**Next Protocol**: See `RIGOR_PROTOCOL.md` for quality standards
