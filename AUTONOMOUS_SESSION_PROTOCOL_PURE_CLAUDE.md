# AUTONOMOUS SESSION PROTOCOL - PURE CLAUDE

**Version**: 1.0.0
**Created**: 2025-11-18
**Mode**: 100% Claude Autonomous - No Human Intervention

## PROTOCOL OVERVIEW

This protocol enables Claude to autonomously process Swedish BRF annual reports through a 19-agent consensus extraction system, generating ground truth training data with zero human intervention.

---

## SESSION LIFECYCLE

### Phase 1: Initialization
1. **Generate Session ID**: `session_YYYYMMDD_HHMMSS`
2. **Load Processing State**: Read `processing_state.json`
3. **Select Next PDF**: Pick first unprocessed PDF from queue
4. **Lock PDF**: Mark as `processing` in state file
5. **Create Session Directory**: `outputs/sessions/{session_id}/`

### Phase 2: PDF Reading & Analysis
1. **Extract PDF Metadata**:
   - Page count
   - File size
   - Document structure
2. **Vision-based Sectionization**:
   - Identify major sections (Resultaträkning, Balansräkning, etc.)
   - Map page ranges to sections
   - Detect multi-year comparison tables
3. **Complexity Assessment**:
   - Simple (< 15 pages)
   - Standard (15-30 pages)
   - Complex (> 30 pages)

### Phase 3: Multi-Pass Extraction (19 Specialized Agents)

Execute agents in **3 dependency tiers** for optimal parallelization:

#### **Tier 1: Core Identity** (sequential - must complete first)
1. `chairman_agent` - Document identity, BRF name, org number
2. `board_members_agent` - Board composition
3. `auditor_agent` - Auditor information

#### **Tier 2: Financial Core** (parallel after Tier 1)
4. `financial_agent` - Income statement (11 _tkr fields)
5. `balance_sheet_agent` - Assets, liabilities, equity
6. `cashflow_agent` - Cash flow statement
7. `property_agent` - Building information
8. `fees_agent` - Monthly fees (avgifter)

#### **Tier 3: Specialized Extraction** (parallel after Tier 2)
9. `operational_agent` - Operating costs breakdown
10. `notes_depreciation_agent` - Depreciation details
11. `notes_maintenance_agent` - Maintenance/repairs
12. `notes_tax_agent` - Tax information
13. `events_agent` - Significant events
14. `audit_report_agent` - Audit findings
15. `loans_agent` - Loan details
16. `reserves_agent` - Reserve funds
17. `energy_agent` - Energy consumption
18. `key_metrics_agent` - Calculated metrics
19. `leverantörer_agent` - Supplier information

**Agent Execution Rules**:
- Use `openrouter-client.ts` with multi-key rotation
- Default model: `anthropic/claude-3.5-sonnet`
- Fallback models: GPT-4o, Gemini-1.5-Pro
- Timeout: 60s per agent
- Retry: 3 attempts with exponential backoff
- Each agent returns JSON with confidence scores

### Phase 4: Validation & Quality Checks

Run comprehensive validation using `schema-validator.ts`:

1. **Schema Validation**:
   - All required fields present
   - Correct data types
   - Swedish format validators (org numbers, postal codes)

2. **Confidence Scoring**:
   - `confidence >= 0.9`: High quality extraction
   - `confidence 0.7-0.9`: Acceptable with review flag
   - `confidence < 0.7`: Requires human review

3. **Cross-Field Validation**:
   - Balance sheet equation (assets = liabilities + equity)
   - Income statement (revenue - costs = net result)
   - Cash flow reconciliation

4. **Evidence Tracking**:
   - All fields have `evidence_pages` array
   - Page references are 1-based (human readable)
   - No hallucinated data (must exist in PDF)

### Phase 5: Results Persistence

1. **Save Raw Agent Outputs**:
   ```
   outputs/sessions/{session_id}/agents/
     ├── chairman_agent.json
     ├── financial_agent.json
     ├── balance_sheet_agent.json
     └── ... (19 total)
   ```

2. **Save Aggregated Result**:
   ```
   outputs/sessions/{session_id}/extraction_result.json
   ```

3. **Save Validation Report**:
   ```
   outputs/sessions/{session_id}/validation_report.json
   ```

4. **Update Processing State**:
   ```json
   {
     "pdf_filename": "...",
     "session_id": "session_20251118_042302",
     "status": "completed",
     "started_at": "2025-11-18T04:23:02Z",
     "completed_at": "2025-11-18T04:35:15Z",
     "duration_seconds": 733,
     "agents_executed": 19,
     "agents_succeeded": 18,
     "agents_failed": 1,
     "total_cost_usd": 0.87,
     "quality_score": 0.94
   }
   ```

### Phase 6: Learning Documentation

Create session learning report:

```markdown
# Session Learning Report: {session_id}

## PDF Characteristics
- Name: BRF Älvsbacka Strand 3
- Complexity: Comprehensive (42 pages)
- Notable features: Multi-year comparison tables, energy report

## Extraction Insights
- **What worked**: Balance sheet agent found all values in Note 1
- **Challenges**: Fees agent struggled with bundled service fees
- **Novel patterns**: Property agent detected "byggnad nr 1-3" pattern

## Agent Performance
| Agent | Success | Confidence | Notes |
|-------|---------|------------|-------|
| financial_agent | ✓ | 0.95 | Clean income statement |
| fees_agent | ✓ | 0.78 | Bundled fees required inference |
| ... | ... | ... | ... |

## Improvements for Next Session
1. Add pattern for bundled fees detection
2. Improve energy_agent Swedish keyword coverage
3. Consider pre-extracting Note cross-references
```

### Phase 7: Meta-Analysis (Automatic Triggers)

**After every 10 completions** (10, 20, 30, ...):

1. **Aggregate Agent Performance**:
   - Success rates per agent
   - Average confidence scores
   - Common failure patterns

2. **Identify Extraction Patterns**:
   - Document structure variations
   - Swedish terminology variations
   - Layout patterns across different accounting firms

3. **Generate Improvement Recommendations**:
   - Agent prompt refinements
   - New Swedish keywords
   - Enhanced routing rules

4. **Save Meta-Analysis**:
   ```
   outputs/meta_analysis/
     ├── meta_after_10.md
     ├── meta_after_20.md
     └── ...
   ```

### Phase 8: Commit & Unlock

1. **Git Commit**:
   ```bash
   git add outputs/sessions/{session_id}/
   git add processing_state.json
   git commit -m "feat: Complete extraction for {pdf_name} ({session_id})

   - Agents executed: 19/19
   - Quality score: 0.94
   - Duration: 12m 13s
   - Cost: $0.87"
   git push origin {branch_name}
   ```

2. **Unlock PDF**:
   - Update `processing_state.json` status to `completed`
   - Increment completion counter
   - Update meta-analysis trigger check

---

## ERROR HANDLING

### Agent Failure
- **Retry**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Model Fallback**: Try GPT-4o if Claude fails
- **Graceful Degradation**: Continue with other agents
- **Failure Documentation**: Log error details in session report

### PDF Parsing Failure
- **Vision Fallback**: Use vision model if text extraction fails
- **Manual Flag**: Mark PDF for human review if unrecoverable
- **Skip & Continue**: Move to next PDF, don't block queue

### API Key Exhaustion
- **Multi-Key Rotation**: Automatically switch to next key
- **Rate Limit Backoff**: Wait and retry with different provider
- **Cost Monitoring**: Alert if session exceeds $2.00

---

## QUALITY GUARANTEES

### Minimum Acceptable Quality (MAQ)
- **Success Rate**: ≥ 15/19 agents (79%)
- **Confidence Score**: ≥ 0.80 average
- **Evidence Coverage**: 100% of extracted fields
- **No Hallucinations**: All values must exist in PDF

### If Quality Below MAQ
1. **Flag for Review**: Mark in `processing_state.json`
2. **Enhanced Retry**: Re-run failed agents with higher token limits
3. **Human Review**: Add to manual review queue if still failing
4. **Don't Block Pipeline**: Continue to next PDF

---

## AUTONOMOUS EXECUTION RULES

1. **No Human Approval Required**: Proceed with all steps automatically
2. **Self-Correcting**: Fix obvious errors during validation phase
3. **Transparent Logging**: Document all decisions in session report
4. **Continuous Improvement**: Apply learnings to subsequent sessions
5. **Safe Defaults**: Use conservative confidence thresholds

---

## SUCCESS METRICS

Per session:
- **Throughput**: 1 PDF every 12-15 minutes
- **Cost**: $0.75-$1.00 per PDF
- **Quality**: 95%+ field extraction accuracy
- **Completeness**: 500+ fields extracted per PDF

Cumulative (after 20 PDFs):
- **Ground Truth Dataset**: 10,000+ extracted fields
- **Agent Optimization**: Performance improvement visible in meta-analysis
- **Pattern Library**: 50+ identified document patterns
- **Ready for DSPy Training**: Exported to JSONL format

---

## TERMINATION CONDITIONS

Continue processing until:
1. All 20 PDFs completed
2. OR fatal system error (disk full, API access revoked)
3. OR user explicitly requests stop

**Do NOT stop for**:
- Individual agent failures
- Low confidence on specific fields
- PDF parsing warnings
- Temporary API errors

---

**PROTOCOL END**
