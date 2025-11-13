# Manual Extraction Plan - 20 BRF PDFs
## Target: 95% Accuracy, 95% Completeness, 200-600 fields per PDF

**Created**: 2025-11-13
**Status**: READY TO START
**Current PDF**: NONE (Starting with #1)

---

## Strategy Overview

### Checkpoint System (Crash-Proof)
- ✅ Commit after EVERY section extracted (8-15 commits per PDF)
- ✅ JSON files track extraction progress
- ✅ Git status shows exactly where Claude stopped
- ✅ Next Claude reads checkpoint and resumes

### Field Target Per PDF
- **Minimum**: 200 fields (535 fields available in schema)
- **Target**: 400-600 fields (95% completeness)
- **Accuracy**: 95%+ (careful reading, evidence pages tracked)

### Section-by-Section Extraction (8 Levels)
Each section gets committed immediately after extraction:

1. **Level 1: Document Metadata** (10 fields) - 2 min
2. **Level 2: Governance** (30-50 fields) - 10 min
3. **Level 3: Financial Data** (100-150 fields) - 20 min
4. **Level 4: Notes** (50-100 fields) - 15 min
5. **Level 5: Property Details** (50-80 fields) - 15 min
6. **Level 6: Fees & Loans** (40-60 fields) - 10 min
7. **Level 7: Operations** (30-50 fields) - 10 min
8. **Level 8: Events & Policies** (20-40 fields) - 8 min

**Total per PDF**: 90 minutes, 330-540 fields extracted

---

## Checkpoint File Structure

```
extractions/
├── checkpoints/
│   ├── checkpoint_status.json          # Current progress tracker
│   └── pdf_001_sections.json            # Section completion flags
├── pdf_001_norrköping_axet/
│   ├── 1_metadata.json                  # Level 1 ✅
│   ├── 2_governance.json                # Level 2 ✅
│   ├── 3_financial.json                 # Level 3 ⏳ IN PROGRESS
│   ├── 4_notes.json                     # Level 4 ⏸️ PENDING
│   ├── 5_property.json                  # Level 5 ⏸️ PENDING
│   ├── 6_fees_loans.json                # Level 6 ⏸️ PENDING
│   ├── 7_operations.json                # Level 7 ⏸️ PENDING
│   ├── 8_events_policies.json           # Level 8 ⏸️ PENDING
│   └── FULL_EXTRACTION.json             # Final merged result
├── pdf_002_stockholm_granen/
│   └── ...
└── ...
```

---

## PDF List (20 PDFs)

| # | PDF File | Status | Fields | Commits | Time |
|---|----------|--------|--------|---------|------|
| 1 | `267197_årsredovisning_norrköping_brf_axet_4.pdf` | ⏸️ PENDING | 0/400 | 0/8 | 0/90min |
| 2 | `267456_årsredovisning_stockholm_brf_granen_18.pdf` | ⏸️ PENDING | 0/400 | 0/8 | 0/90min |
| 3 | `269172_årsredovisning_malmö_brf_hörnhuset.pdf` | ⏸️ PENDING | 0/400 | 0/8 | 0/90min |
| 4 | `269295_årsredovisning_eskilstuna_riksbyggen_brf_torshällahus_nr_1.pdf` | ⏸️ PENDING | 0/400 | 0/8 | 0/90min |
| 5 | `270695_årsredovisning__brf_älvsbacka_strand_3.pdf` | ⏸️ PENDING | 0/400 | 0/8 | 0/90min |
| 6-20 | (15 more PDFs) | ⏸️ PENDING | - | - | - |

**Total Progress**: 0/20 PDFs (0%)
**Total Fields Extracted**: 0/8,000+ fields
**Total Time Invested**: 0/30 hours

---

## Extraction Protocol (Per PDF)

### Phase 1: Setup (1 min)
```bash
# Create directory structure
mkdir -p extractions/pdf_001_norrköping_axet
mkdir -p extractions/checkpoints

# Initialize checkpoint
echo '{"pdf": 1, "current_section": 1, "status": "in_progress"}' > extractions/checkpoints/checkpoint_status.json
git add extractions/checkpoints/checkpoint_status.json
git commit -m "START: PDF #1 extraction initialized"
git push -u origin claude/view-sibling-history-011CV65oHRuSV5aEuDAhf8yy
```

### Phase 2: Extract Sections (90 min)
For each section (1-8):
1. Read PDF pages for that section
2. Extract ALL visible fields with confidence scores
3. Save section JSON file
4. **COMMIT IMMEDIATELY** (checkpoint created)
5. Update checkpoint_status.json
6. **PUSH TO REMOTE** (crash-proof)

Example commit sequence:
```bash
# After extracting Level 1 (Metadata)
git add extractions/pdf_001_norrköping_axet/1_metadata.json
git commit -m "PDF #1 Section 1/8 COMPLETE: Metadata (10 fields)"
git push

# After extracting Level 2 (Governance)
git add extractions/pdf_001_norrköping_axet/2_governance.json
git commit -m "PDF #1 Section 2/8 COMPLETE: Governance (45 fields)"
git push

# ... repeat for all 8 sections
```

### Phase 3: Merge & Validate (5 min)
```bash
# Merge all sections into final JSON
# Validate against schema
# Count fields extracted
git add extractions/pdf_001_norrköping_axet/FULL_EXTRACTION.json
git commit -m "PDF #1 COMPLETE: 487 fields extracted (95.2% accuracy)"
git push
```

---

## Resume Protocol (After Crash)

When next Claude starts:

```bash
# 1. Read checkpoint status
cat extractions/checkpoints/checkpoint_status.json
# Output: {"pdf": 1, "current_section": 3, "status": "in_progress"}

# 2. Check git log to see last completed section
git log --oneline -5
# Output shows: "PDF #1 Section 2/8 COMPLETE: Governance"

# 3. Resume from Section 3 (Financial)
# Continue extraction where sibling left off
```

**No data loss** - every section is committed to git!

---

## Success Metrics

### Per PDF
- ✅ **Completeness**: 200-600 fields extracted (target: 400+)
- ✅ **Accuracy**: 95%+ (verified against PDF text)
- ✅ **Evidence**: Every field has `evidence_pages` array
- ✅ **Confidence**: Every field has `confidence` score (0.0-1.0)
- ✅ **Commits**: 8-10 commits per PDF (crash-proof)

### Overall (20 PDFs)
- ✅ **Total Fields**: 8,000-12,000 fields
- ✅ **Total Commits**: 160-200 commits
- ✅ **Time Estimate**: 30 hours (90 min × 20 PDFs)
- ✅ **Crash Recovery**: 100% resumable

---

## Field Extraction Guidelines

### Confidence Scores
- **1.0**: Exact match, clearly visible in PDF
- **0.9**: High confidence, minor formatting ambiguity
- **0.8**: Good confidence, minor calculation/inference
- **0.7**: Moderate confidence, some interpretation needed
- **0.5**: Low confidence, significant uncertainty
- **0.0**: Field not found or entirely missing

### Evidence Pages (1-based)
```json
{
  "brf_name": {
    "value": "BRF Axet 4",
    "confidence": 1.0,
    "evidence_pages": [1, 2],
    "original_string": "Bostadsrättsföreningen Axet 4"
  }
}
```

### Null Handling
- Use `null` for fields not found in PDF
- Do NOT invent data
- Do NOT guess values
- Extract ONLY what's visible

---

## Next Steps

**User Action Required**: Confirm to start extraction

Once confirmed, Claude will:
1. Create checkpoint directory structure
2. Open PDF #1 (`267197_årsredovisning_norrköping_brf_axet_4.pdf`)
3. Start Level 1 extraction (Metadata)
4. Commit after each section (8 commits per PDF)
5. Complete PDF #1 in ~90 minutes
6. Move to PDF #2

**Crash Recovery**: If Claude hangs, next Claude reads checkpoint and resumes

---

**Ready to start? Confirm and I'll begin with PDF #1!**
