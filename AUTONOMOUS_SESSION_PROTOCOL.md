# Autonomous Session Protocol

**Version**: 1.0.0
**Last Updated**: 2025-11-18

## Purpose

This protocol enables Claude Code to autonomously process BRF annual reports through the complete extraction pipeline without human intervention.

## Session Lifecycle

### 1. Session Initialization

```
Session ID Format: session_YYYYMMDD_HHMMSS
Example: session_20251118_022149
```

**Actions**:
- Generate unique session ID with timestamp
- Create session log file: `logs/sessions/[session_id].log`
- Initialize tracking state

### 2. PDF Selection & Lock

**Lock File Format**: `.processing/[pdf_filename].lock`

**Selection Algorithm**:
1. Scan `pdfs/` directory recursively for all PDFs
2. Check for existing lock files in `.processing/`
3. Check for completed extractions in `results/`
4. Select first unlocked, unprocessed PDF (alphabetically)
5. Create lock file with session metadata

**Lock File Contents**:
```json
{
  "session_id": "session_20251118_022149",
  "pdf_path": "pdfs/267197_årsredovisning_norrköping_brf_axet_4.pdf",
  "started_at": "2025-11-18T02:21:49Z",
  "status": "processing"
}
```

### 3. Extraction Execution

**Pipeline Steps** (see RIGOR_PROTOCOL.md for detailed rigor requirements):

1. **Vision Sectionizer**
   - Round 1: Detect L1 sections (9 major sections)
   - Round 2: Extract L2+L3 subsections (50+ subsections)
   - Output: Hierarchical document map

2. **Agent Orchestration**
   - Route subsections to 19 specialized agents
   - Execute consensus extraction (Gemini + GPT + Claude tiebreaker)
   - Track confidence scores

3. **Validation**
   - Schema validation (all required fields present)
   - Cross-field validation (assets = liabilities + equity)
   - Swedish format validation (org numbers, postal codes)

4. **Output Generation**
   - Generate JSON output: `results/[pdf_id]_ground_truth.json`
   - Include metadata: cost, duration, confidence stats
   - Generate summary report

### 4. Learning Documentation

**Learning Log Format**: `logs/learnings/[session_id]_learnings.md`

**Required Sections**:
- **PDF Characteristics**: Size, pages, document type
- **Extraction Challenges**: What was difficult?
- **Model Performance**: Which models performed best?
- **Confidence Analysis**: High vs low confidence fields
- **Edge Cases Discovered**: New patterns or formats
- **Recommendations**: Improvements for next iteration

### 5. Commit & Unlock

**Git Operations**:
1. Add extraction result: `git add results/[pdf_id]_ground_truth.json`
2. Add learning log: `git add logs/learnings/[session_id]_learnings.md`
3. Commit with standardized message:
   ```
   feat: Extract [pdf_id] via autonomous session [session_id]

   - PDF: [pdf_filename]
   - Fields extracted: [count]
   - High confidence: [percentage]%
   - Duration: [time]
   - Cost: $[amount]
   ```
4. Push to branch: `git push -u origin [branch_name]`
5. Remove lock file: `rm .processing/[pdf_filename].lock`

## Directory Structure

```
ZeldaMeetsClaude/
├── .processing/              # PDF lock files
│   └── [pdf_filename].lock
├── logs/
│   ├── sessions/            # Session execution logs
│   │   └── [session_id].log
│   └── learnings/           # Learning documentation
│       └── [session_id]_learnings.md
├── results/                 # Extraction outputs
│   └── [pdf_id]_ground_truth.json
└── pdfs/                    # Source PDFs
```

## Error Handling

### Recoverable Errors
- **API Rate Limits**: Exponential backoff (2s, 4s, 8s, 16s)
- **Network Timeouts**: Retry up to 4 times
- **Low Confidence Fields**: Flag for human review, continue

### Non-Recoverable Errors
- **Invalid PDF**: Log error, unlock, skip to next PDF
- **Schema Validation Failure**: Save partial results, log error
- **Cost Overrun** (>$2.00 per PDF): Abort, log warning

**Unlock on Error**:
- Always remove lock file on error
- Update lock file status to "failed"
- Log full error details to session log

## Success Criteria

**Per Session**:
- ✅ PDF processed without crashes
- ✅ JSON output validates against schema
- ✅ At least 70% fields extracted with confidence >0.5
- ✅ Cost within budget ($0.50-$1.50 per PDF)
- ✅ Learning documentation generated
- ✅ Changes committed and pushed

## Monitoring

**Progress Tracking**:
- Total PDFs: 60
- Processed: `ls results/*.json | wc -l`
- In Progress: `ls .processing/*.lock | wc -l`
- Remaining: 60 - processed - in_progress

**Cost Tracking**:
- Per session: Logged in session file
- Cumulative: `jq '.summary.totalCost' results/*.json | paste -sd+ | bc`

## Parallel Execution

**NOT RECOMMENDED for initial sessions**:
- Single session at a time ensures stable learning
- After 10 successful sessions, consider 2-3 parallel sessions
- Maximum 5 parallel sessions (to avoid rate limits)

## Protocol Compliance

Every autonomous session MUST:
1. Follow this protocol exactly
2. Apply RIGOR_PROTOCOL.md standards
3. Document learnings thoroughly
4. Commit and push successfully
5. Clean up lock files

**Violation Handling**:
- If protocol is violated, log incident
- Fix issues before next session
- Update protocol if needed

---

**End of Protocol**

Next: See RIGOR_PROTOCOL.md for extraction quality standards
