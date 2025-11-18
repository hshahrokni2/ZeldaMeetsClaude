# Rigor Protocol: Ground Truth Validation Rules

## Purpose
Ensure extracted BRF data meets production-grade quality standards through systematic validation checks.

---

## Validation Levels

### Level 1: Structural Integrity
**Checks:**
1. **JSON Validity**: Output is valid JSON (no parse errors)
2. **Schema Compliance**: All expected fields present (nulls allowed)
3. **Type Correctness**: Fields match expected types (string, number, boolean, array)
4. **ExtractionField Wrapper**: All fields wrapped with `{ value, confidence, evidence_pages, source }`

**Pass Criteria:** 100% pass rate (structural issues are FATAL)

---

### Level 2: Field-Level Quality
**Checks:**
1. **Confidence Distribution**:
   - Target: 80%+ HIGH confidence (≥0.8)
   - Acceptable: 70%+ MEDIUM confidence (≥0.5)
   - Warning: >30% LOW confidence (<0.5)

2. **Evidence Tracking**:
   - All non-null fields have `evidence_pages` array
   - Page numbers are valid (1-indexed, within PDF bounds)
   - Evidence pages align with section structure

3. **Null Field Analysis**:
   - Expected nulls: Fields genuinely missing from PDF (e.g., loans_agent if no loans)
   - Unexpected nulls: Fields that should exist but weren't extracted
   - Target: <10% unexpected nulls

**Pass Criteria:**
- 70%+ fields at MEDIUM+ confidence
- <15% unexpected nulls

---

### Level 3: Cross-Field Consistency
**Checks:**
1. **Balance Sheet Equation**:
   ```
   total_assets_tkr ≈ total_liabilities_tkr + total_equity_tkr
   ```
   - Tolerance: ±1% (rounding allowed)
   - Severity: CRITICAL if off by >5%

2. **Financial Ratios**:
   ```
   total_revenue_tkr > 0 (BRF must have revenue)
   operational_result_tkr = total_revenue_tkr - total_costs_tkr (within ±2%)
   ```

3. **Date Consistency**:
   ```
   financial_year ∈ [2023, 2024, 2025] (recent reports only)
   audit_date >= financial_year (audits happen after year-end)
   ```

4. **Swedish Format Validation**:
   - Org number: `NNNNNN-NNNN` (10 digits with hyphen)
   - Postal code: `NNN NN` (5 digits with space)
   - Currency: Always in `tkr` (thousands SEK)

**Pass Criteria:**
- Balance sheet equation passes (CRITICAL)
- At least 2/3 financial ratios pass
- All Swedish formats valid (if present)

---

### Level 4: Consensus Quality
**Checks:**
1. **Dual Agreement Rate**:
   - HIGH: 85%+ fields where Gemini + GPT agree
   - MEDIUM: 70-85% agreement
   - LOW: <70% agreement (indicates prompt ambiguity)

2. **Tiebreaker Usage**:
   - Target: <15% fields requiring Claude tiebreaker
   - Warning: >25% tiebreakers (suggests model confusion)

3. **Disagreement Analysis**:
   - Log all 3-way disagreements (no consensus)
   - Categorize by type:
     - Currency normalization (MSEK vs. tkr)
     - Date format (Swedish vs. ISO)
     - Null vs. "N/A" vs. 0
   - Target: <5% unresolved disagreements

**Pass Criteria:**
- Dual agreement rate ≥70%
- Tiebreaker usage <20%
- Unresolved disagreements <10%

---

## Quality Tiers

### HIGH Quality (Production-Ready)
- ✅ Structural integrity: 100%
- ✅ Field confidence: 80%+ HIGH
- ✅ Cross-field consistency: All CRITICAL checks pass
- ✅ Consensus: 85%+ dual agreement
- **Action:** Approve for training data

### MEDIUM Quality (Review Recommended)
- ✅ Structural integrity: 100%
- ⚠️ Field confidence: 70-80% HIGH
- ⚠️ Cross-field consistency: 1-2 warnings
- ⚠️ Consensus: 70-85% dual agreement
- **Action:** Flag for human review, usable with caveats

### LOW Quality (Reject)
- ❌ Structural integrity: Parse errors or missing fields
- ❌ Field confidence: <70% HIGH
- ❌ Cross-field consistency: CRITICAL checks fail
- ❌ Consensus: <70% dual agreement
- **Action:** Reject, escalate for manual extraction

---

## Validation Workflow

### Step 1: Automated Checks (Zero Cost)
Run all Level 1-4 checks programmatically after extraction.

**Output:** `validation_report.json`

### Step 2: Manual Review (If MEDIUM Quality)
Human reviewer checks:
- Low confidence fields against source PDF
- Cross-field inconsistencies
- Null field justifications

**Output:** Annotated validation report with corrections

### Step 3: Ground Truth Export (If HIGH/MEDIUM)
Export to JSONL for DSPy training:
```jsonl
{
  "pdf_id": "brf_82665",
  "quality_tier": "HIGH",
  "agent": "financial_agent",
  "images": [...],
  "ground_truth": {...},
  "validation_metadata": {
    "confidence_distribution": {"high": 0.82, "medium": 0.14, "low": 0.04},
    "rigor_checks_passed": 8,
    "rigor_checks_warned": 0,
    "rigor_checks_failed": 0
  }
}
```

---

## Edge Case Handling

### Missing Sections
**Scenario:** PDF has no "Revisionsberättelse" (audit report) section
- **Expected Behavior:** audit_report_agent returns all nulls
- **Validation:** Null fields OK if agent explicitly states "section not found"
- **Rigor Check:** PASS (not a quality issue)

### Multi-Year Data
**Scenario:** Balance sheet shows 2023 + 2024 columns
- **Expected Behavior:** Extract latest year (2024)
- **Validation:** Check `evidence_pages` points to correct column
- **Rigor Check:** Warn if unclear which year was extracted

### Image-Only Data
**Scenario:** Energy class embedded as image (no OCR)
- **Expected Behavior:** energy_agent returns null with note "Image-based, OCR required"
- **Validation:** Null field OK if source type = "image"
- **Rigor Check:** PASS (flag for future OCR enhancement)

### Currency Ambiguity
**Scenario:** Revenue shown as "12.5 MSEK" (million SEK)
- **Expected Behavior:** Normalize to `12500` tkr (thousands)
- **Validation:** Check `original_string` field matches source
- **Rigor Check:** Warn if normalization unclear

---

## Continuous Improvement

After each batch of 10 PDFs:
1. **Aggregate Validation Metrics**:
   - Average confidence distribution
   - Common failure patterns
   - Agent-specific weaknesses

2. **Update Prompts**:
   - Fix ambiguities causing low consensus
   - Add examples for edge cases
   - Clarify normalization rules

3. **Update Rigor Protocol**:
   - Add new validation checks for discovered edge cases
   - Refine pass/fail thresholds based on empirical data

4. **Document Learnings**:
   - Update `LEARNINGS.md` with systemic issues
   - Share insights in `PROCESSING_LOG.md`

---

## Success Metrics (Target After 62 PDFs)

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| HIGH quality PDFs | 80% (50/62) | 70% (44/62) |
| MEDIUM quality PDFs | 15% (9/62) | 25% (16/62) |
| LOW quality (rejected) | 5% (3/62) | 10% (6/62) |
| Avg field confidence | 0.85 | 0.75 |
| Avg dual agreement | 88% | 75% |
| Avg cost per PDF | $0.85 | $1.50 |
| Avg duration per PDF | 9 minutes | 15 minutes |

---

## Fatal Error Escalation

**Trigger Conditions:**
- 3+ consecutive PDFs marked LOW quality
- 5+ agents consistently failing across PDFs
- Balance sheet equation fails on 50%+ PDFs

**Action:**
- HALT autonomous processing
- Generate diagnostic report
- Alert for manual intervention
- Review agent prompts and validation logic
