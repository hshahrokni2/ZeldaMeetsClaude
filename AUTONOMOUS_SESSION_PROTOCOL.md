# AUTONOMOUS SESSION PROTOCOL

**Version**: 1.0.0
**Purpose**: Define structured workflow for autonomous PDF processing sessions
**Scope**: Single-PDF extraction with full validation and documentation

---

## SESSION STRUCTURE

### Session ID Format
```
session_YYYYMMDD_HHMMSS
```

**Example**: `session_20251118_143022`

**Properties**:
- Unique per execution
- Timestamp-based for chronological ordering
- Used for tracking, logging, and result isolation

---

## PIPELINE STAGES

### Stage 1: PDF SELECTION & LOCK

**Objective**: Select next unprocessed PDF and establish processing lock

**Steps**:
1. Check for existing `processing-state.json` in project root
2. If absent, create with structure:
   ```json
   {
     "processed": [],
     "in_progress": null,
     "failed": [],
     "last_updated": "ISO timestamp"
   }
   ```
3. Select next PDF from `/pdfs/` directory (alphabetical order)
4. Skip if PDF exists in `processed` or `failed` arrays
5. Set `in_progress` to selected PDF filename
6. Create session directory: `results/[session_id]/`

**Lock Validation**:
- Fail if `in_progress` is non-null (concurrent processing detected)
- Acquire lock atomically by writing state file

**Output**:
- Selected PDF path
- Session directory created
- Lock acquired

---

### Stage 2: EXTRACTION WITH RIGOR

**Objective**: Execute full 19-agent consensus extraction

**Subprocess**:
1. **Vision Sectionization** (2 rounds)
   - Round 1: L1 section detection (Gemini 2.0 Flash)
   - Round 2: L2/L3 subsection extraction (Gemini 2.0 Flash)
   - Output: `section-map.json`

2. **Orchestrator Routing**
   - Map subsections to 19 agents
   - Generate page ranges for each agent
   - Output: `routing-plan.json`

3. **19 Agent Execution** (batched)
   - Batch size: 18 agents per batch
   - Consensus mechanism:
     - Gemini 2.5 Pro extraction
     - GPT-4o extraction
     - Claude 3.7 Sonnet tiebreaker (if disagreement)
   - Output per agent: `agent-results/[agent_name].json`

4. **Field-Level Consensus**
   - Compare Gemini vs GPT-4o outputs
   - High confidence: Dual agreement
   - Medium confidence: Claude tiebreaker used
   - Low confidence: No consensus reached

**Error Handling**:
- Retry failed agents up to 3 times
- Log all errors to `session-log.txt`
- Continue pipeline even if <15/19 agents succeed
- Flag session as "partial" if <18/19 agents succeed

**Output**:
- `section-map.json`
- `routing-plan.json`
- `agent-results/` directory (19 JSON files)
- `session-log.txt`

---

### Stage 3: VALIDATION & ANALYSIS

**Objective**: Cross-validate results and compute quality metrics

**Validation Checks**:
1. **Schema Validation**
   - All agent outputs conform to TypeScript schemas
   - No missing required fields
   - Correct data types (numbers, strings, booleans)

2. **Cross-Field Validation**
   - Balance sheet: `assets_tkr = liabilities_tkr + equity_tkr`
   - Financial: `total_revenue_tkr > 0`
   - Dates: `year >= 2020 && year <= 2024`

3. **Swedish Format Validation**
   - Org numbers: `NNNNNN-NNNN` format
   - Postal codes: `NNN NN` format
   - Currency: All `_tkr` fields are integers

4. **Confidence Distribution**
   - Count fields by confidence level (HIGH/MEDIUM/LOW)
   - Calculate average confidence score
   - Identify low-confidence fields for review

**Quality Metrics**:
```json
{
  "total_fields": 95,
  "high_confidence": 78,
  "medium_confidence": 12,
  "low_confidence": 5,
  "avg_confidence": 0.89,
  "schema_valid": true,
  "cross_validation_passed": true,
  "agents_succeeded": 19,
  "agents_failed": 0
}
```

**Output**:
- `validation-report.json`
- `quality-metrics.json`

---

### Stage 4: LEARNING DOCUMENTATION

**Objective**: Document insights, failures, and improvements for future runs

**Learnings to Capture**:
1. **Document Characteristics**
   - PDF structure (pages, sections, tables)
   - Visual vs text-heavy layout
   - Unusual formatting or edge cases

2. **Agent Performance**
   - Which agents had highest/lowest confidence
   - Which fields caused consensus failures
   - Tiebreaker frequency per agent

3. **Error Patterns**
   - Repeated extraction mistakes
   - Schema validation failures
   - Cross-field inconsistencies

4. **Cost & Duration**
   - Total API cost (per model)
   - Processing duration (per stage)
   - Token usage breakdown

**Learning Format**:
```markdown
# Session Learnings: [session_id]

## Document: [filename]

### Characteristics
- Pages: 42
- Structure: Comprehensive report with full financial statements
- Complexity: High (multiple tables, Swedish-English mix)

### Agent Performance
- Highest confidence: financial_agent (0.97)
- Lowest confidence: energy_agent (0.42)
- Tiebreakers needed: 7/95 fields

### Issues Encountered
1. Energy certificate section missing → energy_agent returned nulls
2. Board member titles in English → required translation
3. Table OCR errors on page 18 → manual review needed

### Cost & Duration
- Total cost: $0.84
- Duration: 9m 42s
- Gemini tokens: 125k
- GPT-4o tokens: 98k
- Claude tokens: 12k (tiebreaker only)

### Recommendations
- Add energy certificate detection logic
- Improve multilingual handling for board titles
- Enhanced table OCR preprocessing
```

**Output**:
- `learnings/[session_id].md`

---

### Stage 5: COMMIT & UNLOCK

**Objective**: Persist results and release processing lock

**Commit Steps**:
1. **Copy Final Results**
   - Copy `agent-results/` to `results/[session_id]/`
   - Copy all validation reports
   - Copy session log and learnings

2. **Update Processing State**
   - Move PDF from `in_progress` to `processed` array
   - Add session metadata:
     ```json
     {
       "filename": "267197_årsredovisning_norrköping_brf_axet_4.pdf",
       "session_id": "session_20251118_143022",
       "completed_at": "2025-11-18T14:40:15Z",
       "status": "success",
       "quality_score": 0.89,
       "agents_succeeded": 19
     }
     ```
   - Clear `in_progress` field
   - Write updated `processing-state.json`

3. **Git Commit**
   - Add all session results
   - Commit message format:
     ```
     feat: Process PDF [filename] - Session [session_id]

     - Agents succeeded: 19/19
     - Quality score: 0.89
     - High confidence fields: 78/95
     - Duration: 9m 42s
     - Cost: $0.84
     ```

4. **Git Push**
   - Push to branch: `claude/process-pdf-automation-01EqAvp1r3YJfyEcQNN7U9V7`
   - Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

**Lock Release**:
- Ensure `in_progress` is null before completing
- Atomic write to prevent race conditions

**Output**:
- Git commit created
- Changes pushed to remote
- Lock released

---

## ERROR HANDLING

### Recoverable Errors
- API rate limits → Exponential backoff + retry
- Network failures → Retry up to 4 times
- Agent timeout → Skip agent, continue pipeline

### Unrecoverable Errors
- Invalid PDF (corrupt file) → Mark as failed, unlock
- Missing API keys → Abort, report to user
- Disk space exhausted → Abort, report to user

### Failure Protocol
1. Log error to `session-log.txt`
2. Update `processing-state.json`:
   - Move PDF from `in_progress` to `failed`
   - Add failure reason and timestamp
3. Preserve partial results in `results/[session_id]/`
4. Release lock
5. Do NOT commit failed sessions

---

## SUCCESS CRITERIA

A session is successful if:
1. ✅ PDF selected and locked
2. ✅ 18+ agents executed successfully
3. ✅ Schema validation passed
4. ✅ Quality score ≥ 0.75
5. ✅ Results committed and pushed
6. ✅ Lock released

**Minimum Viable Success**:
- 15/19 agents succeeded
- Quality score ≥ 0.60
- No schema validation errors

---

## DIRECTORY STRUCTURE

After session completion:

```
results/
└── session_20251118_143022/
    ├── section-map.json
    ├── routing-plan.json
    ├── agent-results/
    │   ├── chairman_agent.json
    │   ├── financial_agent.json
    │   └── ... (19 total)
    ├── validation-report.json
    ├── quality-metrics.json
    ├── session-log.txt
    └── learnings/
        └── session_20251118_143022.md

processing-state.json (root)
```

---

## AUTONOMOUS EXECUTION

When invoked with `AUTONOMOUS SESSION - PROCESS NEXT PDF`:

1. Generate session ID
2. Execute Stages 1-5 sequentially
3. Report progress at each stage
4. Log all actions to session log
5. Commit and push on success
6. Report final metrics to user

**No user input required** except for:
- API key verification (if missing)
- Critical errors (disk space, auth failures)

---

**End of Protocol**
