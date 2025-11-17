# PDF Queue Management

**Purpose**: Track all PDFs to be processed with status management for parallel sessions

---

## Queue Status

Current state is tracked in `pdfs/PDF_QUEUE.json`

**Statuses:**
- `pending` - Not yet started
- `processing` - Currently being extracted (locked by a session)
- `completed` - Successfully extracted and documented
- `failed` - Extraction failed (needs investigation)

---

## File Structure

```
pdfs/
├── PDF_QUEUE.json           ← Master queue (status tracking)
├── documents/               ← Source PDF files
│   ├── brf_001.pdf
│   ├── brf_002.pdf
│   └── ...
└── results/                 ← Extraction results (one per PDF)
    ├── brf_001/
    │   ├── extraction.json          ← Final extracted data
    │   ├── validation_report.json   ← Validation results
    │   ├── metrics.json              ← Cost, tokens, time
    │   ├── learnings.md              ← Session-specific learnings
    │   └── errors.log                ← Any errors encountered
    ├── brf_002/
    │   └── ...
    └── ...
```

---

## Queue Format

### JSON Schema

```json
{
  "queue_version": "1.0.0",
  "last_updated": "ISO-8601 timestamp",
  "total_pdfs": 10,
  "completed": 3,
  "processing": 2,
  "pending": 4,
  "failed": 1,
  "pdfs": [
    {
      "id": "brf_001",
      "filename": "brf_001.pdf",
      "path": "pdfs/documents/brf_001.pdf",
      "status": "completed",
      "priority": 1,
      "metadata": {
        "fiscal_year": 2023,
        "pages": 12,
        "size_kb": 1248,
        "added_date": "2025-11-17T10:00:00Z",
        "characteristics": ["standard_format", "clear_sections"]
      },
      "session_history": [
        {
          "session_id": "session_001",
          "started_at": "2025-11-17T10:30:00Z",
          "completed_at": "2025-11-17T10:45:00Z",
          "status": "completed",
          "metrics": {
            "field_coverage": 0.87,
            "avg_confidence": 0.85,
            "validation_errors": 0,
            "validation_warnings": 2,
            "cost_usd": 0.042,
            "tokens": 12450,
            "duration_seconds": 872
          },
          "learnings": [
            "Clear section headers improved routing accuracy",
            "Multi-year table on page 10 required special handling"
          ]
        }
      ]
    },
    {
      "id": "brf_002",
      "filename": "brf_002.pdf",
      "path": "pdfs/documents/brf_002.pdf",
      "status": "processing",
      "priority": 1,
      "locked_by": "session_002",
      "locked_at": "2025-11-17T11:00:00Z",
      "metadata": {
        "fiscal_year": 2022,
        "pages": 18,
        "size_kb": 2156,
        "added_date": "2025-11-17T10:00:00Z",
        "characteristics": ["consolidated_statements", "complex_notes"]
      },
      "session_history": []
    },
    {
      "id": "brf_003",
      "filename": "brf_003.pdf",
      "path": "pdfs/documents/brf_003.pdf",
      "status": "pending",
      "priority": 2,
      "metadata": {
        "fiscal_year": 2023,
        "pages": 15,
        "size_kb": 1856,
        "added_date": "2025-11-17T10:00:00Z",
        "characteristics": ["standard_format"]
      },
      "session_history": []
    }
  ]
}
```

---

## Queue Operations

### 1. Initialize Queue (First Time)

```bash
# Scan pdfs/documents/ directory and populate queue
# Run once to set up the queue
```

### 2. Get Next Available PDF

**Logic:**
1. Filter: `status == "pending"` AND `locked_at` is null OR older than 30 minutes (stale lock)
2. Sort by: `priority DESC`, then `added_date ASC`
3. Return: First result

**Atomic Lock:**
- Set `status = "processing"`
- Set `locked_by = [session_id]`
- Set `locked_at = [timestamp]`
- Write to disk immediately

### 3. Mark Completed

**Update:**
- Set `status = "completed"`
- Clear `locked_by` and `locked_at`
- Add session to `session_history` with metrics
- Update counters
- Write to disk

### 4. Mark Failed

**Update:**
- Set `status = "failed"`
- Clear `locked_by` and `locked_at`
- Add session to `session_history` with error details
- Update counters
- Write to disk

---

## Adding New PDFs

1. Copy PDF to `pdfs/documents/[filename].pdf`
2. Update `PDF_QUEUE.json`:
   ```json
   {
     "id": "brf_XXX",
     "filename": "brf_XXX.pdf",
     "path": "pdfs/documents/brf_XXX.pdf",
     "status": "pending",
     "priority": 1,
     "metadata": {
       "fiscal_year": 2023,
       "pages": 0,
       "size_kb": 0,
       "added_date": "ISO-8601",
       "characteristics": []
     },
     "session_history": []
   }
   ```
3. Increment `total_pdfs` and `pending` counters
4. Commit changes

---

## Stale Lock Detection

If a session crashes, locks may become stale.

**Detection Logic:**
- If `status == "processing"` AND `locked_at` > 30 minutes ago
- Assume session died
- Reset: `status = "pending"`, clear `locked_by` and `locked_at`

**Prevention:**
- Sessions should heartbeat every 5 minutes (update `locked_at`)
- Sessions should always mark status on completion/failure

---

## Priority System

**Priority Levels:**
- `1` - High priority (process first)
- `2` - Normal priority
- `3` - Low priority (process last)

**Use Cases:**
- High priority: Ground truth documents with known labels
- Normal priority: Regular processing
- Low priority: Edge cases, large documents

---

## Parallel Session Safety

Multiple sessions can run in parallel safely:

1. **Atomic Lock:** Each session acquires exclusive lock on PDF
2. **No Double Processing:** If PDF is `processing`, skip to next
3. **Stale Lock Recovery:** Detect and recover from crashed sessions
4. **Commit After Each:** Results committed immediately after completion

**Example: 10 Parallel Sessions**
- Session 1 locks brf_001 → processes → marks completed
- Session 2 locks brf_002 → processes → marks completed
- Session 3 locks brf_003 → processes → marks completed
- ...
- All sessions commit independently
- No conflicts, no race conditions

---

## Queue Statistics

Track progress with counters:

```json
{
  "total_pdfs": 100,
  "completed": 42,    // 42% done
  "processing": 3,    // Currently active
  "pending": 53,      // Remaining
  "failed": 2,        // Need investigation
  "success_rate": 0.955  // 42/(42+2) = 95.5%
}
```

---

## Monitoring

### Quick Status Check

```bash
cat pdfs/PDF_QUEUE.json | jq '{total_pdfs, completed, processing, pending, failed, success_rate: (.completed / (.completed + .failed))}'
```

### List Pending PDFs

```bash
cat pdfs/PDF_QUEUE.json | jq '.pdfs[] | select(.status == "pending") | {id, filename, priority}'
```

### List Failed PDFs

```bash
cat pdfs/PDF_QUEUE.json | jq '.pdfs[] | select(.status == "failed") | {id, filename, last_error: .session_history[-1].error}'
```

### Average Metrics Across Completed

```bash
cat pdfs/PDF_QUEUE.json | jq '[.pdfs[] | select(.status == "completed") | .session_history[-1].metrics] | {avg_coverage: (map(.field_coverage) | add / length), avg_cost: (map(.cost_usd) | add / length)}'
```

---

## Error Recovery

### If Session Crashes

1. Stale lock detector will reset PDF to `pending` after 30 minutes
2. Next session will pick it up automatically
3. Previous partial results should be cleaned up

### If Extraction Fails

1. Mark `status = "failed"`
2. Log error in `session_history`
3. Investigate root cause
4. Fix issue (prompt, validator, etc.)
5. Reset to `pending` to retry

### If Queue Corrupted

1. Backup: `cp PDF_QUEUE.json PDF_QUEUE.json.backup`
2. Fix JSON manually
3. Verify with: `cat PDF_QUEUE.json | jq .`
4. If unfixable, restore from git history

---

## Best Practices

1. **Commit After Each PDF:** Don't batch, commit immediately
2. **Clean Results Directory:** Remove partial results on failure
3. **Update Queue Atomically:** Write entire JSON, don't append
4. **Monitor Failed PDFs:** Investigate patterns in failures
5. **Track Learnings:** Add to PATTERNS_*.md as you go
6. **Backup Queue Regularly:** Git commit after every N PDFs

---

## Integration with RIGOR_PROTOCOL

When processing a PDF:
1. Get next available (lock it)
2. Follow AUTONOMOUS_SESSION_PROTOCOL.md
3. Document learnings
4. Mark completed (unlock it)
5. Commit everything
6. Repeat for next PDF
