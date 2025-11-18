# AUTONOMOUS SESSION PROTOCOL - PURE CLAUDE

**Version**: 1.0.0
**Mode**: 100% Autonomous - No Human Intervention
**Target**: Process all 62 PDFs with maximum rigor

---

## SESSION INITIALIZATION

### Session ID Format
```
session_YYYYMMDD_HHMMSS
```

Example: `session_20251118_043000`

### Pre-Flight Checks
1. Verify `.env` file exists with API keys
2. Check `pdfs/` directory contains unprocessed files
3. Verify all 19 agent definitions exist
4. Confirm schema files are present
5. Initialize tracking directories

---

## PHASE 1: PDF SELECTION & LOCK

### 1.1 Selection Strategy
- **Priority Order**:
  1. Main directory PDFs (20 files) - systematic sample
  2. Hjorthagen PDFs (15 files) - homogeneous cluster
  3. SRS PDFs (27 files) - heterogeneous cluster

### 1.2 Lock Mechanism
```bash
# Create lock file to prevent parallel processing
mkdir -p locks/
touch locks/{pdf_filename}.lock
echo "{session_id}|{timestamp}|{hostname}" > locks/{pdf_filename}.lock
```

### 1.3 Processing Manifest
```json
{
  "pdf_path": "pdfs/xxx.pdf",
  "session_id": "session_YYYYMMDD_HHMMSS",
  "status": "locked",
  "started_at": "ISO-8601",
  "locked_by": "claude_session_id"
}
```

---

## PHASE 2: PDF READING & ANALYSIS

### 2.1 Document Profiling
```typescript
{
  "total_pages": number,
  "file_size_mb": number,
  "estimated_sections": number,
  "language": "sv",
  "quality": "high" | "medium" | "low"
}
```

### 2.2 Vision Sectionization
- Run `vision-sectionizer.ts` to detect document structure
- Extract Level 1, 2, and 3 sections
- Map sections to semantic categories

### 2.3 Initial Assessment
- Identify fiscal year, BRF name, org number
- Estimate extraction complexity
- Calculate expected cost

---

## PHASE 3: MULTI-PASS EXTRACTION (19 AGENTS)

### 3.1 Agent Orchestration
**All agents run in parallel using OpenRouter multi-key pool**

| Agent ID | Target Fields | Expected Pages |
|----------|---------------|----------------|
| `chairman_agent` | Chairman info | 1-3 |
| `board_members_agent` | Board composition | 1-2 |
| `auditor_agent` | Auditor details | 1 |
| `financial_agent` | Income statement | 2-4 |
| `balance_sheet_agent` | Balance sheet | 2-3 |
| `property_agent` | Property info | 1-4 |
| `fees_agent` | Fee structure | 1-2 |
| `cashflow_agent` | Cash flow | 1-2 |
| `operational_agent` | Operating costs | 2-3 |
| `notes_depreciation_agent` | Depreciation | 1-2 |
| `notes_maintenance_agent` | Maintenance | 1-2 |
| `notes_tax_agent` | Tax details | 1 |
| `events_agent` | Significant events | 1-2 |
| `audit_report_agent` | Audit report | 1 |
| `loans_agent` | Loan details | 1-2 |
| `reserves_agent` | Reserve funds | 1-2 |
| `energy_agent` | Energy data | 1-2 |
| `key_metrics_agent` | Key metrics | All |
| `leverantörer_agent` | Suppliers | 1-2 |

### 3.2 Execution Flow
```typescript
// 1. Route sections to agents
const routing = await routeSectionsToAgentsWithLLM(sectionMap, allAgents);

// 2. Execute agents in parallel (multi-key pool)
const results = await executeAgentsParallel(state, groundTruth: false);

// 3. Collect results with confidence scores
const aggregated = aggregateResults(state);
```

### 3.3 Error Handling
- **Retry Logic**: 3 attempts per agent with exponential backoff
- **Graceful Degradation**: Continue with remaining agents if some fail
- **Minimum Success Threshold**: 15/19 agents must succeed

---

## PHASE 4: VALIDATION & QUALITY CHECKS

### 4.1 Schema Validation
```typescript
// Validate against full BRF schema
const validation = validateAgentResponse(agentId, data, {
  strictMode: false,     // Lenient mode
  allowNulls: true,      // Nulls are valid
  requireEvidence: false // Evidence optional
});
```

### 4.2 Confidence Thresholds
- **High Confidence**: ≥ 0.90 (directly stated, clear evidence)
- **Medium Confidence**: 0.70-0.89 (inferred from context)
- **Low Confidence**: 0.50-0.69 (weak evidence, ambiguous)
- **Very Low**: < 0.50 (guessed, should be null)

### 4.3 Quality Metrics
```typescript
{
  "total_fields_extracted": number,
  "fields_with_high_confidence": number,
  "fields_with_evidence_pages": number,
  "null_fields": number,
  "validation_errors": number,
  "validation_warnings": number
}
```

### 4.4 Critical Field Validation
**Must Extract** (fail if missing):
- `brf_name`
- `organization_number`
- `fiscal_year`
- `total_intakter_tkr`
- `total_kostnader_tkr`

---

## PHASE 5: LEARNING DOCUMENTATION

### 5.1 Session Log Structure
```json
{
  "session_id": "session_YYYYMMDD_HHMMSS",
  "pdf_path": "pdfs/xxx.pdf",
  "processing_time_seconds": number,
  "total_cost_usd": number,
  "total_tokens": number,
  "agents": {
    "successful": 17,
    "failed": 2,
    "details": [...]
  },
  "quality_metrics": {...},
  "insights": {
    "document_complexity": "high" | "medium" | "low",
    "challenges": ["string array of issues"],
    "successes": ["string array of wins"]
  }
}
```

### 5.2 Learning Insights
Document in `learning/{session_id}.md`:
- Novel edge cases discovered
- Agent performance patterns
- Section detection accuracy
- Field extraction reliability

### 5.3 Failure Analysis
For any failed agents:
- Root cause (parsing, routing, API timeout)
- Impact on downstream fields
- Remediation strategy

---

## PHASE 6: META-ANALYSIS (AUTOMATIC)

### 6.1 Trigger Points
- **Every 10 PDFs**: Quick analysis
- **Every 20 PDFs**: Deep analysis
- **Every 30 PDFs**: Comprehensive review

### 6.2 Meta-Analysis Content
```markdown
# Meta-Analysis: {N} PDFs Processed

## Aggregate Statistics
- Total PDFs processed: {N}
- Total cost: ${X.XX}
- Average cost per PDF: ${X.XX}
- Average processing time: {X}s
- Overall success rate: {X}%

## Agent Performance Matrix
| Agent | Success Rate | Avg Confidence | Common Issues |
|-------|--------------|----------------|---------------|
| ...   | ...          | ...            | ...           |

## Field Extraction Heatmap
| Field | Extraction Rate | Avg Confidence | Null Rate |
|-------|-----------------|----------------|-----------|
| ...   | ...             | ...            | ...       |

## Pattern Recognition
- Common document structures
- Reliable extraction patterns
- Challenging sections
- Edge cases

## Recommendations
- Agent prompt improvements
- Routing rule adjustments
- Confidence calibration
```

---

## PHASE 7: COMMIT & UNLOCK

### 7.1 Output Structure
```
output/
├── extractions/
│   ├── {pdf_id}.json           # Full extraction result
│   └── {pdf_id}_metadata.json  # Processing metadata
├── learning/
│   └── session_{id}.md         # Session insights
└── meta_analysis/
    └── analysis_{N}_pdfs.md    # Meta-analysis reports
```

### 7.2 Git Commit Message Format
```
feat(extraction): Process {pdf_filename} - Session {session_id}

Agents: {successful}/{total} successful
Cost: ${X.XX} USD
Time: {X}s
Quality: {high/medium/low}

Key fields extracted:
- fiscal_year: {value}
- total_intakter_tkr: {value}
- total_kostnader_tkr: {value}

{Any notable insights or issues}
```

### 7.3 Unlock Sequence
```bash
# Remove lock file
rm locks/{pdf_filename}.lock

# Update processing manifest
echo "completed" > manifest/{pdf_id}.status

# Commit to git
git add output/ learning/ manifest/
git commit -m "..."
git push -u origin {branch}
```

---

## ERROR RECOVERY PROTOCOLS

### Scenario 1: API Timeout
- Retry with exponential backoff (2s, 4s, 8s, 16s)
- Switch to backup model if primary fails
- Log timeout for pattern analysis

### Scenario 2: Malformed JSON
- Apply JSON repair (repairTruncatedJSON)
- Salvage partial fields if possible
- Log for agent prompt improvement

### Scenario 3: Section Detection Failure
- Fallback to full-document extraction
- All agents process entire PDF
- Flag for manual review

### Scenario 4: Critical Field Missing
- **Do not fail** - mark as low confidence null
- Document in learning log
- Continue processing

### Scenario 5: Lock File Exists
- Check lock timestamp
- If > 30 minutes old, assume stale and override
- Log potential race condition

---

## AUTONOMOUS EXECUTION CHECKLIST

Before starting:
- [ ] Session ID generated
- [ ] Environment variables loaded
- [ ] API keys validated
- [ ] Output directories created

During processing:
- [ ] PDF locked successfully
- [ ] Document profiled
- [ ] Sections detected
- [ ] Agents routed correctly
- [ ] 15+ agents succeeded
- [ ] Critical fields extracted
- [ ] Validation passed

After processing:
- [ ] Results saved to `output/`
- [ ] Learning documented
- [ ] Meta-analysis triggered (if applicable)
- [ ] Git commit created
- [ ] Changes pushed to remote
- [ ] Lock file removed

---

## SUCCESS CRITERIA

### Minimum Viable Extraction
- At least 15/19 agents succeed
- All 5 critical fields extracted
- Processing time < 15 minutes
- Cost < $1.50 per PDF
- No fatal errors

### High Quality Extraction
- 17+ agents succeed
- 90%+ fields have evidence pages
- Average confidence ≥ 0.80
- Processing time < 10 minutes
- Cost < $1.00 per PDF

### Excellence
- All 19 agents succeed
- 95%+ fields have evidence pages
- Average confidence ≥ 0.90
- Processing time < 8 minutes
- Cost < $0.75 per PDF

---

## NEXT PDF SELECTION LOGIC

```typescript
// Priority queue based on:
1. Unprocessed PDFs in main directory (systematic sample)
2. Cluster diversity (alternate between Hjorthagen/SRS)
3. Document complexity (process simpler docs first to build confidence)
4. Historical success rate (avoid problematic patterns until later)
```

---

**Protocol Version**: 1.0.0
**Last Updated**: 2025-11-18
**Owned By**: Autonomous Claude Session
