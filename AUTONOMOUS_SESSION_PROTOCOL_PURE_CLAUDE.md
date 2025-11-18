# Autonomous Session Protocol - Pure Claude

**Version**: 1.0.0
**Session ID Format**: `session_YYYYMMDD_HHMMSS`
**Mode**: FULL AUTOMATION - 100% CLAUDE

## Protocol Overview

This protocol defines the autonomous PDF processing pipeline for BRF (Swedish Housing Cooperative) annual report extraction using 19 specialized AI agents with multi-pass extraction and validation.

## Pipeline Stages

### 1. PDF Selection & Lock (5 min)

**Objective**: Select next unprocessed PDF and acquire exclusive lock

**Actions**:
1. Read `/processing/status.json` to check completion count
2. Scan `/pdfs/` directory for all available PDFs
3. Check `/processing/completed/` for already processed PDFs
4. Check `/processing/active/` for currently locked PDFs
5. Select first unprocessed PDF (alphabetical order)
6. Create lock file: `/processing/active/{pdf_name}.lock` with session metadata
7. Update `/processing/status.json` with in_progress count

**Lock File Format**:
```json
{
  "session_id": "session_20251118_042205",
  "pdf_path": "/home/user/ZeldaMeetsClaude/pdfs/xxx.pdf",
  "locked_at": "2025-11-18T04:22:05Z",
  "status": "extracting"
}
```

**Success Criteria**:
- Lock file created successfully
- No conflicts with other sessions
- PDF path validated

### 2. PDF Reading & Analysis (10 min)

**Objective**: Load PDF, convert to images, analyze structure

**Actions**:
1. Verify PDF exists and is readable
2. Convert PDF to base64 images (one per page)
3. Run vision sectionizer to detect document structure
4. Identify all major sections (Förvaltningsberättelse, Resultaträkning, Balansräkning, Noter, etc.)
5. Map sections to relevant agents using routing algorithm
6. Log PDF metadata (pages, file size, detected sections)

**Dependencies**:
- `lib/vision-sectionizer.ts`
- OpenRouter API (Gemini Flash for sectionization)

**Success Criteria**:
- All pages converted to images
- Section map generated with L1/L2/L3 hierarchy
- Agent routing completed (19 agents mapped to sections)

### 3. Multi-Pass Extraction (60-90 min)

**Objective**: Execute all 19 specialized agents in parallel with full extraction

**Agents** (in order of execution priority):
1. `chairman_agent` - Styrelseordförande (Chairman)
2. `board_members_agent` - Styrelseledamöter (Board Members)
3. `auditor_agent` - Revisor (Auditor)
4. `financial_agent` - Resultaträkning (Income Statement) - 11 fields
5. `balance_sheet_agent` - Balansräkning (Balance Sheet)
6. `property_agent` - Fastighetsuppgifter (Property Data)
7. `fees_agent` - Avgifter (Fees)
8. `cashflow_agent` - Kassaflöde (Cash Flow)
9. `operational_agent` - Driftkostnader (Operating Costs)
10. `notes_depreciation_agent` - Not: Avskrivningar
11. `notes_maintenance_agent` - Not: Underhåll
12. `notes_tax_agent` - Not: Skatt
13. `events_agent` - Väsentliga händelser (Events)
14. `audit_report_agent` - Revisionsberättelse
15. `loans_agent` - Lån (Loans)
16. `reserves_agent` - Avsättningar (Reserves)
17. `energy_agent` - Energideklaration (Energy)
18. `key_metrics_agent` - Nyckeltal (Key Metrics)
19. `leverantörer_agent` - Leverantörer (Suppliers)

**Execution Strategy**:
- **Parallel Execution**: All agents run concurrently using OpenRouter multi-key pool
- **Model**: `google/gemini-2.5-pro` (default) or `anthropic/claude-3.7-sonnet` for complex fields
- **Timeout**: 5 minutes per agent
- **Retry Logic**: 2 retries on failure with exponential backoff

**Per-Agent Process**:
1. Get agent-specific prompt from `/agents/{agent_id}.md`
2. Extract relevant page images based on routing
3. Send prompt + images to vision model
4. Parse JSON response with robust error handling
5. Wrap response in ExtractionField format with confidence scores
6. Validate against expected schema
7. Log tokens, cost, and validation results

**Success Criteria**:
- Minimum 15/19 agents complete successfully
- All critical agents succeed (financial, balance_sheet, property, governance)
- Total cost within $0.75-$1.50 per PDF
- Duration < 20 minutes

### 4. Validation & Quality Checks (10 min)

**Objective**: Verify extraction quality and completeness

**Validation Checks**:

**A. Schema Validation** (LENIENT mode):
- All fields conform to expected types (string, number, array, etc.)
- No critical parsing errors
- Evidence pages are valid (1-based page numbers)
- Confidence scores are in valid range (0.0-1.0)

**B. Completeness Checks**:
- High-priority fields extracted (>50% of critical fields)
- At least 3/5 governance fields present
- At least 6/11 financial fields present
- Property designation or BRF name extracted

**C. Confidence Analysis**:
- Overall confidence score (weighted average)
- High confidence: ≥0.8 (target: >60% of fields)
- Medium confidence: 0.5-0.8 (acceptable: <30% of fields)
- Low confidence: <0.5 (acceptable: <10% of fields)

**D. Cross-Agent Consistency**:
- Check for duplicate/conflicting fields across agents
- Validate financial totals (assets = liabilities + equity)
- Verify date consistency (fiscal year)

**Validation Report Format**:
```json
{
  "status": "PASS" | "PARTIAL" | "FAIL",
  "overall_confidence": 0.87,
  "fields_extracted": 127,
  "high_confidence": 89,
  "medium_confidence": 32,
  "low_confidence": 6,
  "critical_errors": [],
  "warnings": ["balance_sheet_agent: Missing equity field"],
  "agent_success_rate": "17/19 (89%)"
}
```

**Success Criteria**:
- Status: PASS or PARTIAL
- Overall confidence ≥ 0.7
- Critical errors = 0
- Agent success rate ≥ 15/19 (79%)

### 5. Learning Documentation (15 min)

**Objective**: Document insights, patterns, and edge cases for continuous improvement

**Learning Categories**:

**A. Document Patterns**:
- PDF structure variations (table layouts, multi-column, scanned vs native)
- Section naming conventions (alternative Swedish terms)
- Table formats (vertical vs horizontal orientation)
- Page numbering schemes

**B. Extraction Challenges**:
- Fields that required multiple attempts
- Ambiguous labels or values
- Missing sections or incomplete data
- OCR errors (for scanned documents)

**C. Agent Performance**:
- Agents with low confidence scores
- Agents that exceeded token limits
- Routing mismatches (sections mapped to wrong agents)

**D. Success Patterns**:
- High-confidence extractions (what worked well)
- Effective prompt variations
- Optimal page range selections

**Learning Entry Format**:
```json
{
  "session_id": "session_20251118_042205",
  "pdf_id": "79446",
  "pdf_name": "årsredovisning_stockholm_brf_roslagsbanan_12.pdf",
  "timestamp": "2025-11-18T04:22:05Z",
  "patterns": [
    "Non-standard balance sheet layout with assets on right side"
  ],
  "challenges": [
    "Board members listed in footer across multiple pages - required full doc scan"
  ],
  "agent_insights": {
    "financial_agent": "High confidence (0.92) - clean table format",
    "board_members_agent": "Medium confidence (0.64) - names split across pages"
  },
  "recommendations": [
    "Consider adding footer detection to board_members_agent routing"
  ]
}
```

**Storage**: `/output/learnings/session_{id}_learnings.json`

**Success Criteria**:
- Learning entry created
- At least 3 insights documented
- Stored successfully for future meta-analysis

### 6. Meta-Analysis Trigger Check (5 min)

**Objective**: Check if meta-analysis should run (every 10 completions)

**Trigger Conditions**:
- Completions = 10, 20, 30, 40, 50, ... (every 10th)
- OR on-demand via user request
- OR after significant error pattern detected (≥3 consecutive failures)

**Meta-Analysis Process** (if triggered):
1. Load all learning entries since last meta-analysis
2. Aggregate patterns and challenges
3. Identify common failure modes
4. Calculate per-agent success rates
5. Generate improvement recommendations
6. Create meta-analysis report

**Meta-Analysis Report** (`/output/meta-analysis/meta_{completion_count}.json`):
```json
{
  "completion_count": 10,
  "sessions_analyzed": 10,
  "timestamp": "2025-11-18T05:30:00Z",
  "aggregate_metrics": {
    "avg_confidence": 0.83,
    "avg_cost": 0.92,
    "avg_duration": 14.5,
    "agent_success_rates": {
      "financial_agent": "10/10 (100%)",
      "board_members_agent": "8/10 (80%)",
      ...
    }
  },
  "common_patterns": [
    "65% of PDFs use standard HSB template",
    "Board members often in footer (40% of cases)"
  ],
  "failure_modes": [
    "Scanned PDFs with poor OCR quality (2 cases)",
    "Missing Noter section (1 case)"
  ],
  "recommendations": [
    "Add OCR preprocessing for scanned documents",
    "Implement fallback routing for missing sections",
    "Increase board_members_agent page range to include footers"
  ]
}
```

**Success Criteria**:
- Trigger condition evaluated
- Meta-analysis executed if needed
- Report stored and committed

### 7. Commit & Unlock (10 min)

**Objective**: Store results, commit to git, release lock

**Actions**:
1. Save extraction result to `/output/extractions/{pdf_id}_extraction.json`
2. Save validation report to `/output/extractions/{pdf_id}_validation.json`
3. Save learning entry to `/output/learnings/session_{id}_learnings.json`
4. Update `/processing/status.json`:
   - Increment `processed` count
   - Decrement `in_progress` count
   - Add session to `sessions` array
5. Move lock file from `/processing/active/` to `/processing/completed/`
6. Add completion metadata to lock file
7. Git commit with message: `feat: Extract {pdf_name} - Session {session_id}`
8. Git push to remote branch

**Commit Message Template**:
```
feat: Extract {pdf_name} - Session {session_id}

- Agents: {success_count}/{total_count} successful
- Confidence: {overall_confidence}
- Cost: ${total_cost}
- Duration: {duration}min

{meta_analysis_note if triggered}
```

**Success Criteria**:
- All outputs saved successfully
- Git commit created and pushed
- Lock released
- Status updated
- Session marked complete

## Error Handling

### Recoverable Errors
- **Agent timeout**: Retry up to 2 times, continue with other agents
- **JSON parse error**: Apply repair logic, fallback to partial extraction
- **Rate limit**: Wait and retry with exponential backoff
- **Low confidence**: Document in learnings, continue

### Fatal Errors
- **PDF not readable**: Mark as failed, unlock, move to `/processing/failed/`
- **API key invalid**: Stop session, notify user
- **All agents fail**: Mark as failed, unlock, document in learnings
- **Lock conflict**: Abort session, do not process

## Cost & Performance Targets

**Per-PDF Targets**:
- **Cost**: $0.75 - $1.50 (avg: $0.92)
- **Duration**: 10-20 minutes (target: 15min)
- **Confidence**: ≥0.75 overall
- **Agent Success**: ≥15/19 (79%)

**Session Limits**:
- **Max retries**: 2 per agent
- **Max duration**: 30 minutes per PDF
- **Max cost**: $2.00 per PDF (abort if exceeded)

## Autonomous Operation Requirements

**Prerequisites**:
1. OpenRouter API key configured in `.env`
2. All 19 agent definitions in `/agents/`
3. All core library files in `/lib/`
4. All schema files in `/schemas/`
5. Processing directories initialized

**Fully Autonomous**:
- No user intervention required during session
- Automatic error recovery
- Self-documenting (learnings + meta-analysis)
- Git commit/push automated
- Next PDF selection automatic

**User Notifications** (via commit messages only):
- Session start/complete
- Meta-analysis triggered
- Fatal errors encountered

## Success Metrics

**Overall Project Success**:
- **Completion Rate**: ≥95% of PDFs processed
- **Avg Confidence**: ≥0.80
- **Avg Cost**: $0.75-$1.00 per PDF
- **Meta-Analysis**: Continuous improvement demonstrated
- **Autonomous**: Zero manual interventions

---

**Protocol Status**: ✅ Active
**Last Updated**: 2025-11-18
**Maintained By**: Claude (Autonomous Agent)
