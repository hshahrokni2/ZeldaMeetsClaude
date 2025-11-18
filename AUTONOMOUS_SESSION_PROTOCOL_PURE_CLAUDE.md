# Autonomous Session Protocol - Pure Claude Mode

**Version**: 1.0.0
**Session Type**: AUTONOMOUS_PDF_PROCESSING
**Execution Mode**: 100% Claude Code (No external APIs)

---

## Overview

This protocol defines how Claude Code autonomously processes BRF annual reports from start to finish without human intervention, using only Claude's native capabilities.

## Session Structure

```
Session ID Format: session_YYYYMMDD_HHMMSS
Example: session_20251118_042209
```

## 7-Step Pipeline

### Step 1: PDF Selection & Lock
**Duration**: 30 seconds
**Actions**:
1. Check `processing/status.json` for unprocessed PDFs
2. Select next PDF from queue (FIFO order)
3. Create lock file: `processing/locks/{pdf_id}.lock`
4. Update status.json with: `{status: "processing", session_id, started_at}`

**Lock File Format**:
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_042209",
  "locked_at": "2025-11-18T04:22:09Z",
  "locked_by": "claude-code-autonomous"
}
```

### Step 2: PDF Reading & Analysis
**Duration**: 2-3 minutes
**Actions**:
1. Read PDF using Claude's vision (Read tool with .pdf support)
2. Identify document structure (cover, governance, financials, notes, audit)
3. Extract page ranges for each section
4. Create section map: `processing/sessions/{session_id}/section_map.json`

**Section Map Format**:
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "total_pages": 24,
  "sections": [
    {"name": "Styrelse", "pages": [2, 3], "relevant_agents": ["chairman_agent", "board_members_agent"]},
    {"name": "Resultaträkning", "pages": [5, 6, 7], "relevant_agents": ["financial_agent"]},
    {"name": "Balansräkning", "pages": [8, 9], "relevant_agents": ["balance_sheet_agent"]},
    {"name": "Noter", "pages": [10, 15], "relevant_agents": ["notes_*"]},
    {"name": "Revisionsberättelse", "pages": [22, 24], "relevant_agents": ["audit_report_agent"]}
  ]
}
```

### Step 3: Multi-Pass Extraction (19 Specialized Contexts)
**Duration**: 15-20 minutes
**Process**: For each of 19 agents, execute specialized extraction

**Agent Execution Order**:
1. **Governance** (3 agents):
   - chairman_agent
   - board_members_agent
   - auditor_agent

2. **Financials** (3 agents):
   - financial_agent (income statement)
   - balance_sheet_agent
   - cashflow_agent

3. **Property** (2 agents):
   - property_agent
   - fees_agent

4. **Operations** (3 agents):
   - operational_agent
   - energy_agent
   - leverantörer_agent

5. **Notes** (3 agents):
   - notes_depreciation_agent
   - notes_maintenance_agent
   - notes_tax_agent

6. **Other** (5 agents):
   - events_agent
   - audit_report_agent
   - loans_agent
   - reserves_agent
   - key_metrics_agent

**Per-Agent Execution**:
```
1. Read agent prompt from agents/{agent_name}.md
2. Read relevant PDF pages (from section map)
3. Extract fields using Claude's vision + reasoning
4. Assign confidence scores (0.0-1.0)
5. Record evidence pages (1-based page numbers)
6. Save to processing/sessions/{session_id}/extractions/{agent_name}.json
```

**Extraction Output Format**:
```json
{
  "agent_id": "financial_agent",
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_042209",
  "extracted_at": "2025-11-18T04:35:12Z",
  "execution_time_seconds": 42,
  "data": {
    "total_revenue_tkr": {
      "value": 12500,
      "confidence": 0.95,
      "evidence_pages": [5, 6],
      "original_string": "12,5 MSEK",
      "extraction_method": "vision_direct_read"
    },
    "total_costs_tkr": {
      "value": 10300,
      "confidence": 0.92,
      "evidence_pages": [6],
      "original_string": "10 300 tkr",
      "extraction_method": "vision_direct_read"
    }
  },
  "fields_extracted": 11,
  "high_confidence_count": 9,
  "medium_confidence_count": 2,
  "low_confidence_count": 0
}
```

### Step 4: Validation & Quality Checks
**Duration**: 2 minutes
**Checks**:
1. **Completeness**: All 19 agents executed
2. **Field Coverage**: Target fields extracted (min 70% coverage)
3. **Confidence Distribution**: High confidence ≥60%
4. **Cross-field Validation**:
   - Balance sheet: assets = liabilities + equity
   - Income statement: revenue - costs ≈ net_result
   - Sanity checks: revenue > 0, year ∈ [2020, 2025]
5. **Swedish Format Validation**:
   - Org numbers: NNNNNN-NNNN
   - Postal codes: NNN NN
   - Currency: SEK, MSEK, tkr

**Validation Output**:
```json
{
  "session_id": "session_20251118_042209",
  "validation_passed": true,
  "checks": {
    "completeness": {"passed": true, "score": 1.0},
    "field_coverage": {"passed": true, "score": 0.87},
    "confidence_distribution": {"passed": true, "high_pct": 0.73},
    "cross_validation": {"passed": true, "balance_sheet_balanced": true},
    "format_validation": {"passed": true, "swedish_formats_valid": true}
  },
  "warnings": ["interest_costs_tkr has medium confidence (0.65)"],
  "errors": []
}
```

### Step 5: Learning Documentation
**Duration**: 3 minutes
**Actions**:
1. Analyze extraction challenges
2. Document insights
3. Update learning log

**Learning Log Entry**:
```json
{
  "session_id": "session_20251118_042209",
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "insights": [
    {
      "type": "layout_variation",
      "description": "Income statement used 'Intäkter' instead of standard 'Nettoomsättning'",
      "impact": "Required keyword flexibility in financial_agent",
      "confidence_impact": -0.05
    },
    {
      "type": "data_quality",
      "description": "Board member signatures were clear, all names extracted with high confidence",
      "impact": "Governance data quality: excellent",
      "confidence_impact": +0.10
    }
  ],
  "challenges": [
    {
      "agent": "notes_depreciation_agent",
      "issue": "Depreciation schedule was in footnote, not main notes section",
      "resolution": "Expanded search to all pages containing 'Avskrivningar'",
      "future_guidance": "Always search full document for depreciation data"
    }
  ],
  "performance": {
    "total_duration_minutes": 18.5,
    "avg_confidence": 0.84,
    "high_confidence_pct": 0.73
  }
}
```

### Step 6: Meta-Analysis (Conditional)
**Trigger**: Every 10 completions (10, 20, 30...)
**Duration**: 5 minutes
**Actions**:
1. Aggregate learning logs from last 10 sessions
2. Identify patterns (common challenges, layout variations)
3. Generate insights for agent prompt refinement
4. Save meta-analysis report

**Meta-Analysis Output**:
```json
{
  "analysis_id": "meta_20251118_001",
  "completions_analyzed": [1, 10],
  "total_pdfs": 10,
  "aggregated_insights": {
    "layout_patterns": [
      {"pattern": "Resultaträkning on pages 5-7", "frequency": 0.8},
      {"pattern": "Board info on page 2-3", "frequency": 0.9}
    ],
    "common_challenges": [
      {"challenge": "Interest costs in notes vs main statement", "frequency": 0.4},
      {"challenge": "Multi-year comparison tables", "frequency": 0.6}
    ],
    "agent_performance": {
      "financial_agent": {"avg_confidence": 0.89, "avg_fields": 9.2},
      "board_members_agent": {"avg_confidence": 0.92, "avg_fields": 5.8}
    }
  },
  "recommendations": [
    "Update financial_agent to check notes section for interest costs",
    "Add multi-year table detection to all agents"
  ]
}
```

### Step 7: Commit & Unlock
**Duration**: 1 minute
**Actions**:
1. Consolidate all extractions into final JSON
2. Move results to `results/completed/{pdf_id}.json`
3. Delete lock file
4. Update status.json: `{status: "completed", completed_at, session_id}`
5. Git commit with message: `feat: Complete extraction for {pdf_id} (session_{id})`
6. Git push to branch

**Final Output Structure**:
```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "session_id": "session_20251118_042209",
  "extracted_at": "2025-11-18T04:40:23Z",
  "total_duration_minutes": 18.5,
  "agents": [
    {
      "agent_id": "financial_agent",
      "fields_extracted": 11,
      "avg_confidence": 0.89,
      "data": { /* extraction data */ }
    }
    // ... 18 more agents
  ],
  "summary": {
    "total_fields": 87,
    "high_confidence": 64,
    "medium_confidence": 18,
    "low_confidence": 5,
    "field_coverage": 0.87,
    "validation_passed": true
  },
  "learning": { /* learning log entry */ },
  "meta_analysis": null // or meta-analysis if triggered
}
```

---

## Error Handling

### PDF Read Failure
- **Action**: Retry 3 times with 10s delay
- **If persists**: Mark PDF as `failed_read`, skip to next PDF
- **Log**: Error details in `processing/errors/{pdf_id}_read_error.json`

### Agent Execution Failure
- **Action**: Retry agent 2 times
- **If persists**: Mark agent as `failed`, continue with remaining agents
- **Log**: Error in session log with context

### Validation Failure
- **Action**: Flag as `needs_review` but still save results
- **Log**: Validation errors in final output
- **Continue**: Do not block completion

---

## Success Criteria

A session is successful when:
1. ✅ PDF successfully read and analyzed
2. ✅ ≥15/19 agents executed (79% completion)
3. ✅ ≥60 fields extracted (63% coverage)
4. ✅ ≥60% high confidence fields
5. ✅ Results committed to Git
6. ✅ Status updated to "completed"

---

## Directory Structure

```
processing/
├── status.json                          # Master status tracker
├── locks/                               # Active lock files
│   └── {pdf_id}.lock
├── sessions/                            # Session-specific data
│   └── {session_id}/
│       ├── session_info.json
│       ├── section_map.json
│       ├── extractions/
│       │   ├── financial_agent.json
│       │   ├── board_members_agent.json
│       │   └── ... (17 more)
│       ├── validation.json
│       └── learning.json
└── errors/                              # Error logs
    └── {pdf_id}_error.json

results/
├── completed/                           # Final outputs
│   └── {pdf_id}.json
└── meta_analysis/                       # Meta-analysis reports
    └── meta_{timestamp}.json
```

---

## Autonomous Execution Command

```bash
# Claude Code executes this protocol autonomously:
# 1. Read this protocol
# 2. Execute steps 1-7 sequentially
# 3. Handle errors gracefully
# 4. Commit and continue to next PDF
```

**Execution continues until**:
- All PDFs processed, OR
- User interrupts, OR
- Critical system error

---

**Protocol Status**: ACTIVE
**Last Updated**: 2025-11-18
**Version**: 1.0.0
