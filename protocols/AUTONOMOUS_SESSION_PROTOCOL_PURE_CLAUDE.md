# Autonomous Session Protocol - Pure Claude Mode

**Version**: 1.0.0
**Date**: 2025-11-18
**Mode**: FULL AUTOMATION - 100% CLAUDE

## Overview

This protocol defines the complete autonomous pipeline for processing Swedish BRF annual reports through a 19-agent extraction system with zero human intervention.

## Session Structure

### Session ID Format
```
session_YYYYMMDD_HHMMSS
```
Example: `session_20251118_042147`

### Pipeline Stages

#### 1. PDF Selection & Lock (Automatic)
- **Input**: PDF queue in `pdfs/` directory
- **Output**: Locked PDF with `.lock` file
- **Lock Format**: `{pdf_filename}.lock` containing session ID and timestamp
- **Selection Algorithm**:
  - Sequential from `selected_20_pdfs.json`
  - Skip any PDF with existing `.lock` file
  - Prioritize PDFs without results in `results/` directory

#### 2. PDF Reading & Analysis (Automatic)
- **Tool**: Vision-based PDF sectionizer
- **Process**:
  1. Convert PDF to base64 images (one per page)
  2. Detect document structure using vision model
  3. Identify sections: Resultaträkning, Balansräkning, Noter, etc.
  4. Generate section map with page ranges
- **Output**: `SectionMap` object for routing

#### 3. Multi-Pass Extraction (Automatic - 19 Agents)
- **Agents** (in parallel execution):
  1. `chairman_agent` - Board chairman details
  2. `board_members_agent` - Board member list
  3. `auditor_agent` - Auditor information
  4. `financial_agent` - Income statement (11 _tkr fields)
  5. `balance_sheet_agent` - Assets, liabilities, equity
  6. `property_agent` - Building information
  7. `fees_agent` - Monthly fees
  8. `cashflow_agent` - Cash flow analysis
  9. `operational_agent` - Operating metrics
  10. `notes_depreciation_agent` - Depreciation notes
  11. `notes_maintenance_agent` - Maintenance notes
  12. `notes_tax_agent` - Tax notes
  13. `events_agent` - Significant events
  14. `audit_report_agent` - Audit report
  15. `loans_agent` - Loan details
  16. `reserves_agent` - Reserves and provisions
  17. `energy_agent` - Energy declaration
  18. `operating_costs_agent` - Operating cost breakdown
  19. `key_metrics_agent` - Calculated KPIs
  20. `leverantörer_agent` - Suppliers (Swedish: "leverantörer")

- **Execution**: Parallel using OpenRouter multi-key pool
- **Model**: `google/gemini-2.5-pro` (default) or `anthropic/claude-3.5-sonnet`
- **Output**: JSON with ExtractionField wrappers (value, confidence, evidence_pages)

#### 4. Validation & Quality Checks (Automatic)
- **Validators**:
  1. Schema validation (Zod)
  2. Field completeness check (95%+ target)
  3. Confidence scoring (average across fields)
  4. Evidence page tracking
  5. Currency normalization verification (_tkr fields)
  6. Swedish format validation (org numbers, postal codes)

- **Quality Metrics**:
  - Successful agents: 15+/19 (79%+ success rate)
  - Average confidence: 0.85+ (85%+)
  - Fields extracted: 200+ (out of 500+ possible)
  - Cost per PDF: $0.75-$1.00

#### 5. Learning Documentation (Automatic)
- **Location**: `learning/session_{id}_learning.md`
- **Content**:
  1. **What Worked**: Successful extractions, high-confidence fields
  2. **What Failed**: Missing fields, low-confidence extractions
  3. **Edge Cases**: Unusual document formats, non-standard sections
  4. **Improvements**: Suggested prompt improvements, routing refinements
  5. **Performance**: Timing, cost, token usage

- **Format**: Structured markdown with categorized observations

#### 6. Meta-Analysis (Automatic - Every 10 PDFs)
- **Trigger**: Completion count is multiple of 10 (10, 20, 30...)
- **Location**: `meta-analysis/meta_analysis_{count}.md`
- **Analysis**:
  1. Aggregate success rates across all PDFs
  2. Identify systematic failures (fields consistently missing)
  3. Cost and performance trends
  4. Agent-specific performance metrics
  5. Document complexity correlation (visual_summary vs comprehensive_report)
  6. Recommendations for pipeline improvements

- **Output**: Comprehensive report with statistics and actionable insights

#### 7. Commit & Unlock (Automatic)
- **Actions**:
  1. Save extraction results to `results/{pdf_id}_extraction.json`
  2. Save learning documentation to `learning/`
  3. Remove `.lock` file from PDF
  4. Update processing log: `logs/processing_log.jsonl`
  5. Git commit with message: `feat: Process PDF {pdf_name} - session {session_id}`
  6. Git push to remote branch

- **Error Handling**: If commit fails, keep lock and retry on next run

## File Structure

```
ZeldaMeetsClaude/
├── pdfs/                          # Input PDFs
│   ├── {pdf_name}.pdf
│   └── {pdf_name}.pdf.lock       # Lock file (if processing)
├── results/                       # Extraction outputs
│   ├── {pdf_id}_extraction.json
│   └── {pdf_id}_metadata.json
├── learning/                      # Per-session learnings
│   ├── session_{id}_learning.md
│   └── session_{id}_debug.log
├── meta-analysis/                 # Aggregate analysis
│   ├── meta_analysis_10.md
│   ├── meta_analysis_20.md
│   └── trends_chart.png
├── logs/                          # Processing logs
│   ├── processing_log.jsonl      # Append-only log
│   └── error_log.jsonl           # Errors only
├── locks/                         # Orphaned lock cleanup
│   └── lock_registry.json        # Track all locks
└── protocols/                     # Protocol documentation
    ├── AUTONOMOUS_SESSION_PROTOCOL_PURE_CLAUDE.md
    └── RIGOR_PROTOCOL.md
```

## Execution Flow

```
START
  ↓
[1. Select & Lock PDF]
  ↓
[2. Read PDF & Sectionize]
  ↓
[3. Execute 19 Agents in Parallel]
  ↓
[4. Validate Results]
  ↓
[5. Document Learning]
  ↓
[6. Check Meta-Analysis Trigger] → (if N % 10 == 0) → [Generate Meta-Analysis]
  ↓
[7. Save, Commit, Push]
  ↓
[8. Unlock PDF]
  ↓
END
```

## Recovery & Resilience

### Orphaned Locks
- **Detection**: Locks older than 30 minutes
- **Action**: Auto-cleanup and log to `logs/orphaned_locks.json`

### Failed Extractions
- **Retry**: Automatic retry once with exponential backoff
- **Partial Results**: Save partial results with `status: "partial"`
- **Error Logging**: Full stack trace to `logs/error_log.jsonl`

### Network Failures
- **Git Push**: Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- **API Calls**: Retry transient errors (429, 500, 503)

## Success Criteria

### Per-PDF Success
- ✅ 15+/19 agents complete successfully (79%+)
- ✅ 200+ fields extracted
- ✅ Average confidence ≥ 0.85
- ✅ Cost ≤ $1.00
- ✅ Duration ≤ 15 minutes

### Overall Success (20 PDFs)
- ✅ 18+/20 PDFs processed successfully (90%+)
- ✅ Total cost ≤ $20.00
- ✅ All meta-analyses generated (at 10, 20)
- ✅ Learning documentation complete for all sessions
- ✅ All results committed to Git

## Command Execution

```bash
# Single autonomous run (processes next available PDF)
npm run autonomous

# Continuous mode (processes all remaining PDFs)
npm run autonomous:continuous

# Status check (without processing)
npm run status
```

## Logging Format

### processing_log.jsonl
```jsonl
{"session_id":"session_20251118_042147","pdf":"270695_årsredovisning__brf_älvsbacka_strand_3.pdf","status":"started","timestamp":"2025-11-18T04:21:47Z"}
{"session_id":"session_20251118_042147","pdf":"270695_årsredovisning__brf_älvsbacka_strand_3.pdf","agents_completed":17,"agents_failed":2,"cost":0.87,"duration_ms":240000,"status":"completed","timestamp":"2025-11-18T04:25:47Z"}
```

### error_log.jsonl
```jsonl
{"session_id":"session_20251118_042147","agent":"leverantörer_agent","error":"Timeout after 60s","timestamp":"2025-11-18T04:23:12Z"}
```

## Quality Assurance

### Pre-Flight Checks
1. ✅ All 19 agent prompts exist in `agents/`
2. ✅ All core library files present in `lib/`
3. ✅ Environment variables configured (`.env`)
4. ✅ OpenRouter API key valid
5. ✅ Git branch is `claude/autonomous-pdf-processing-*`

### Post-Flight Validation
1. ✅ Results JSON validates against schema
2. ✅ Learning documentation generated
3. ✅ Lock file removed
4. ✅ Git commit successful
5. ✅ Processing log updated

---

**Protocol Status**: ✅ ACTIVE
**Last Updated**: 2025-11-18
**Maintained By**: Claude (Autonomous Agent)
