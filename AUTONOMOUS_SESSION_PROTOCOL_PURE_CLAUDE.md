# Autonomous Session Protocol - Pure Claude Mode

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Mode**: FULL AUTOMATION - 100% CLAUDE

## Session ID Format
```
session_YYYYMMDD_HHMMSS
```

## Protocol Overview

This protocol enables Claude Code to autonomously process Swedish BRF annual reports through a complete 7-step pipeline without human intervention.

## Complete Pipeline Steps

### Step 1: PDF Selection & Lock
**Objective**: Select next unprocessed PDF and acquire exclusive lock

**Actions**:
1. Read `processed_pdfs.json` tracking file (create if doesn't exist)
2. Scan `pdfs/` directory for all PDF files
3. Select first PDF not in processed list
4. Create lock file: `.locks/[pdf_filename].lock` with session ID
5. Log selection to `sessions/[session_id]/selection.json`

**Success Criteria**:
- Lock file created successfully
- PDF is readable and accessible
- No conflicting locks exist

### Step 2: PDF Reading & Analysis
**Objective**: Extract and analyze PDF structure

**Actions**:
1. Use vision-sectionizer to detect document structure
2. Round 1: Identify L1 sections (9 major sections)
3. Round 2: Extract L2/L3 subsections (50+ subsections)
4. Generate hierarchical document map
5. Save to `sessions/[session_id]/document_map.json`

**Success Criteria**:
- Document map contains all major sections
- Page ranges identified correctly
- Subsections mapped to page numbers

### Step 3: Multi-Pass Extraction (19 Specialized Contexts)
**Objective**: Execute all 19 agent extractions with consensus

**Agents** (in execution order):
1. chairman_agent
2. board_members_agent
3. auditor_agent
4. financial_agent
5. balance_sheet_agent
6. property_agent
7. fees_agent
8. cashflow_agent
9. operational_agent
10. notes_depreciation_agent
11. notes_maintenance_agent
12. notes_tax_agent
13. events_agent
14. audit_report_agent
15. loans_agent
16. reserves_agent
17. energy_agent
18. key_metrics_agent
19. leverantörer_agent

**Consensus Mechanism**:
- Model 1 (Primary): Gemini 2.5 Pro
- Model 2 (Secondary): GPT-4o
- Model 3 (Tiebreaker): Claude 3.7 Sonnet

**Confidence Levels**:
- HIGH: Dual agreement (Gemini + GPT)
- MEDIUM: Claude tiebreaker
- LOW: No agreement

**Actions per Agent**:
1. Route relevant subsections to agent
2. Execute Gemini 2.5 Pro extraction
3. Execute GPT-4o extraction
4. Compare results
5. If disagreement, execute Claude 3.7 Sonnet tiebreaker
6. Calculate confidence scores
7. Save individual agent results to `sessions/[session_id]/agents/[agent_name].json`

**Success Criteria**:
- Minimum 15/19 agents complete successfully
- Average confidence score > 0.80
- All high-priority fields extracted (financial, governance)

### Step 4: Validation & Quality Checks
**Objective**: Validate extracted data for consistency and accuracy

**Validation Types**:
1. **Cross-field validation**
   - Assets = Liabilities + Equity
   - Revenue components sum to total revenue
   - Cost components sum to total costs

2. **Sanity checks**
   - Revenue > 0
   - Fiscal year in range [2020-2025]
   - Organization number format: NNNNNN-NNNN
   - Postal code format: NNN NN

3. **Completeness checks**
   - Minimum required fields present
   - Evidence pages tracked
   - Original strings captured

**Actions**:
1. Run schema-validator on complete extraction
2. Log validation results to `sessions/[session_id]/validation.json`
3. Flag fields with LOW confidence for review
4. Calculate overall quality score

**Success Criteria**:
- Overall quality score > 0.85
- No critical validation errors
- All required fields present

### Step 5: Learning Documentation
**Objective**: Document insights and learnings from this extraction

**Actions**:
1. Identify extraction challenges encountered
2. Document unusual document structures
3. Note fields with low confidence
4. Record successful extraction patterns
5. Save to `sessions/[session_id]/learnings.md`

**Documentation Includes**:
- Document characteristics
- Field extraction accuracy by agent
- Time and cost metrics
- Challenges and solutions
- Recommendations for improvement

### Step 6: Meta-Analysis (Conditional)
**Objective**: Perform cross-document analysis at milestones

**Trigger**: Every 10 completions (10, 20, 30...)

**Actions**:
1. Aggregate statistics across all processed PDFs
2. Calculate average confidence by field
3. Identify systematic extraction patterns
4. Generate insights report
5. Save to `meta_analysis/analysis_[count].json`

**Meta-Analysis Includes**:
- Field extraction success rates
- Common document variations
- Model performance comparison
- Cost efficiency trends
- Quality improvement trajectory

### Step 7: Commit & Unlock
**Objective**: Finalize extraction and release lock

**Actions**:
1. Consolidate all agent results into final JSON
2. Save to `results/[pdf_id]_extraction.json`
3. Update `processed_pdfs.json` with completion metadata
4. Remove lock file `.locks/[pdf_filename].lock`
5. Git commit with message: `feat: Process [pdf_name] - Session [session_id]`
6. Git push to branch

**Success Criteria**:
- Final JSON validates against schema
- Processed list updated
- Lock removed
- Changes committed to git

## Session State Management

### Directory Structure
```
ZeldaMeetsClaude/
├── sessions/
│   └── session_YYYYMMDD_HHMMSS/
│       ├── selection.json
│       ├── document_map.json
│       ├── agents/
│       │   ├── financial_agent.json
│       │   ├── balance_sheet_agent.json
│       │   └── ... (19 total)
│       ├── validation.json
│       ├── learnings.md
│       └── summary.json
├── results/
│   ├── [pdf_id]_extraction.json
│   └── ... (one per processed PDF)
├── .locks/
│   └── [pdf_filename].lock (temporary)
├── meta_analysis/
│   ├── analysis_10.json
│   ├── analysis_20.json
│   └── ...
├── processed_pdfs.json
└── extraction_log.jsonl
```

### Tracking File Format: processed_pdfs.json
```json
{
  "processed": [
    {
      "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
      "session_id": "session_20251118_143022",
      "processed_at": "2025-11-18T14:42:15Z",
      "status": "completed",
      "quality_score": 0.91,
      "agents_succeeded": 18,
      "total_cost": 0.87,
      "duration_seconds": 512
    }
  ]
}
```

### Lock File Format: .locks/[filename].lock
```json
{
  "session_id": "session_20251118_143022",
  "locked_at": "2025-11-18T14:30:22Z",
  "pdf_path": "pdfs/82665_årsredovisning_lund_brf_vipemöllan_3.pdf"
}
```

## Error Handling

### Retry Strategy
- API failures: Exponential backoff (2s, 4s, 8s, 16s)
- Max retries: 3 per API call
- Timeout: 2 minutes per agent extraction

### Failure Recovery
1. **Agent Failure**: Continue with remaining agents
2. **Validation Failure**: Mark fields as LOW confidence, continue
3. **Critical Failure**: Unlock PDF, log error, skip to next PDF

### Partial Success
- Minimum threshold: 15/19 agents must succeed
- Below threshold: Mark as "partial", allow manual review

## Cost Management

**Target per PDF**: $0.75 - $1.00

**Breakdown**:
- Sectionizer: ~$0.05
- 19 Agents × 2 models: ~$0.65
- Tiebreakers (estimated 3): ~$0.15
- Validation: ~$0.05

**Cost Tracking**:
- Log per-agent cost in agent JSON
- Sum total cost in summary.json
- Track cumulative cost in extraction_log.jsonl

## Performance Targets

**Time per PDF**: 8-12 minutes
**Success Rate**: >95% (18+/19 agents)
**Quality Score**: >0.85
**Confidence**: >80% HIGH confidence fields

## Autonomous Operation Rules

1. **No Human Intervention**: System must handle all decisions
2. **Graceful Degradation**: Accept partial results if quality threshold met
3. **Complete Logging**: Every decision and result must be logged
4. **Idempotent**: Can safely re-run on same PDF (checks locks)
5. **Resource Management**: Clean up locks on any exit path

## Session Completion Criteria

A session is considered successful when:
1. ✅ PDF locked successfully
2. ✅ Document structure extracted
3. ✅ Minimum 15/19 agents completed
4. ✅ Quality score > 0.85
5. ✅ Results saved and validated
6. ✅ Learning documentation created
7. ✅ Changes committed to git
8. ✅ Lock released

## Next Session Trigger

After successful completion:
1. System automatically selects next unprocessed PDF
2. Generates new session ID
3. Begins Step 1 of pipeline

**Continuous Operation**: System can process entire PDF corpus autonomously
