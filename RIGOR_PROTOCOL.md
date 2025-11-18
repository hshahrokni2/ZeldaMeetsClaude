# Rigor Protocol: Ground Truth Quality Assurance

**Version**: 1.0.0
**Purpose**: Ensure 95%+ accuracy in extracted ground truth data
**Scope**: All PDF extractions in ZeldaMeetsClaude project
**Last Updated**: 2025-11-18

---

## Protocol Philosophy

**Ground truth must be GROUND TRUTH** - not "best guess" or "probably correct". This protocol enforces rigorous quality standards to ensure the extracted data can be trusted for training machine learning models.

### Core Principles

1. **Evidence-Based**: Every value must have explicit evidence (page numbers + original text)
2. **Conservative**: When uncertain, mark as NULL rather than guess
3. **Traceable**: Full audit trail from PDF → extraction → consensus → final value
4. **Validated**: Cross-field validation + sanity checks + format compliance
5. **Measurable**: Confidence scores reflect actual uncertainty, not optimism

---

## Extraction Rigor Standards

### Rule 1: No Hallucination Tolerance

**Policy**: ZERO tolerance for hallucinated data

**Definition of Hallucination**:
- Value not explicitly visible in PDF
- Value inferred from context without direct evidence
- Value carried over from previous PDFs
- Value assumed based on typical BRF patterns

**Examples**:

❌ **WRONG** (Hallucination):
```json
{
  "energy_class": {
    "value": "C",
    "confidence": 0.80,
    "evidence_pages": [15],
    "original_string": "Not found - inferred from building age (1985)"
  }
}
```

✅ **CORRECT** (Conservative):
```json
{
  "energy_class": {
    "value": null,
    "confidence": 0.0,
    "evidence_pages": [],
    "original_string": null,
    "extraction_note": "Not found in document - searched pages 1-25"
  }
}
```

**Detection**:
- If `original_string` contains "inferred", "assumed", "typical": ❌ REJECT
- If `evidence_pages` empty but `value` non-null: ❌ REJECT
- If agent cannot quote exact text: ❌ REJECT

---

### Rule 2: Original String Preservation

**Policy**: Always capture exact text as it appears in PDF

**Requirements**:
- Preserve Swedish characters: å, ä, ö, Å, Ä, Ö
- Preserve formatting: spaces, commas, periods
- Preserve units: "tkr", "MSEK", "kr", "%"
- Preserve context: Include surrounding words if needed for clarity

**Examples**:

✅ **CORRECT**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "original_string": "Nettoomsättning: 12 500 tkr"
  }
}
```

✅ **CORRECT** (with normalization note):
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "original_string": "Nettoomsättning: 12,5 MSEK",
    "normalization_note": "Converted MSEK → tkr (× 1000)"
  }
}
```

❌ **WRONG** (lost precision):
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "original_string": "12500"  // Missing "tkr" unit and context
  }
}
```

---

### Rule 3: Page Evidence Tracking

**Policy**: Every extracted value must cite exact page numbers (1-based)

**Requirements**:
- Page numbers are 1-indexed (first page = 1, not 0)
- Include ALL pages where value appears (even if redundant)
- Use page ranges for multi-page tables: `[5, 6, 7]` or `[5-7]`
- If value appears in multiple sections, cite all: `[3, 15, 22]`

**Examples**:

✅ **CORRECT**:
```json
{
  "chairman_name": {
    "value": "Anna Svensson",
    "evidence_pages": [3, 25],  // Page 3: Board list, Page 25: Signature
    "original_string": "Ordförande: Anna Svensson"
  }
}
```

❌ **WRONG** (missing page citation):
```json
{
  "chairman_name": {
    "value": "Anna Svensson",
    "evidence_pages": [],  // ❌ No evidence!
    "original_string": "Anna Svensson"
  }
}
```

**Verification**:
- Automated check: If `value` is non-null, `evidence_pages` must have length ≥1
- Manual spot-check: Randomly verify 5% of extractions by reading cited pages

---

### Rule 4: Confidence Score Accuracy

**Policy**: Confidence scores must reflect ACTUAL uncertainty, not aspiration

**Calibration**:

| Confidence | Meaning | Use Case |
|------------|---------|----------|
| **0.95-1.00** | Certain | Dual model agreement + explicit text + clear formatting |
| **0.85-0.94** | Very High | Dual model agreement + minor ambiguity (formatting inconsistent) |
| **0.70-0.84** | High | Tiebreaker resolved disagreement + clear evidence |
| **0.50-0.69** | Medium | Tiebreaker resolved + some ambiguity (e.g., typo in PDF) |
| **0.30-0.49** | Low | No consensus OR weak evidence |
| **0.00-0.29** | Very Low | No consensus + conflicting evidence |
| **0.00** | Unknown | Value is NULL |

**Calibration Examples**:

✅ **Confidence 0.95** (Dual Agreement):
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "models_agreement": {
      "gemini": 12500,
      "gpt4": 12500,
      "claude": null  // Not needed
    },
    "original_string": "Nettoomsättning: 12 500 tkr"
  }
}
```

✅ **Confidence 0.75** (Tiebreaker):
```json
{
  "board_member_count": {
    "value": 7,
    "confidence": 0.75,
    "models_agreement": {
      "gemini": 7,  // Counted only "ordinarie" members
      "gpt4": 9,    // Counted "ordinarie" + "suppleanter"
      "claude": 7   // Tiebreaker agreed with Gemini
    },
    "original_string": "Styrelsen består av 7 ordinarie ledamöter och 2 suppleanter"
  }
}
```

❌ **WRONG** (Overconfident):
```json
{
  "energy_class": {
    "value": "C",
    "confidence": 0.90,  // ❌ Too high! Value inferred, not stated
    "original_string": "Energiförbrukning: 120 kWh/m²"  // Not same as class!
  }
}
```

**Calibration Check**:
- If confidence ≥0.90 but models disagreed: ❌ REJECT (overconfident)
- If confidence ≥0.90 but `original_string` ambiguous: ❌ REDUCE to 0.75-0.85
- If confidence ≥0.90 but evidence weak: ❌ REDUCE to 0.60-0.70

---

### Rule 5: Consensus Mechanism Transparency

**Policy**: Document full consensus process for auditability

**Required Metadata**:
```json
{
  "field_name": {
    "value": 12500,
    "confidence": 0.95,
    "extraction_method": "dual_agreement",  // Required
    "models_agreement": {
      "gemini": 12500,
      "gpt4": 12500,
      "claude": null
    },
    "consensus_metadata": {
      "initial_disagreement": false,
      "tiebreaker_invoked": false,
      "disagreement_reason": null
    }
  }
}
```

**Extraction Methods**:
- `"dual_agreement"`: Gemini + GPT agreed immediately
- `"tiebreaker"`: Claude resolved Gemini vs GPT disagreement
- `"no_consensus"`: All 3 models disagreed
- `"single_model"`: Only 1 model could extract (others returned null)

**Disagreement Logging**:
```json
{
  "board_member_count": {
    "value": 7,
    "confidence": 0.75,
    "extraction_method": "tiebreaker",
    "consensus_metadata": {
      "initial_disagreement": true,
      "tiebreaker_invoked": true,
      "disagreement_reason": "Gemini excluded suppleants, GPT included them",
      "resolution": "Claude agreed with Gemini based on prompt specifying 'ordinarie ledamöter'"
    }
  }
}
```

---

### Rule 6: Cross-Field Validation

**Policy**: Validate extracted data against known accounting rules

**Validation Rules**:

#### Financial Consistency
```typescript
// Balance sheet must balance (±1 tkr tolerance for rounding)
abs(assets_total - (liabilities_total + equity_total)) <= 1

// Expenses should not exceed revenue by >200% (sanity check)
total_expenses_tkr <= total_revenue_tkr * 2.0

// Cash flow should be reasonable
abs(cashflow_operations_tkr) <= total_revenue_tkr * 0.5
```

#### Temporal Consistency
```typescript
// Fiscal year should be recent
fiscal_year >= 2020 && fiscal_year <= 2025

// End date should be after start date
new Date(period_end_date) > new Date(period_start_date)

// Period should be ~12 months (±2 months tolerance)
monthsDiff(period_start_date, period_end_date) >= 10 &&
monthsDiff(period_start_date, period_end_date) <= 14
```

#### Logical Consistency
```typescript
// Member count should be positive and reasonable
member_count > 0 && member_count < 10000

// Board should have 3-15 members (typical BRF range)
board_member_count >= 3 && board_member_count <= 15

// Building age should be reasonable
building_year >= 1850 && building_year <= 2025
```

**Action on Validation Failure**:

1. **If confidence ≥0.85**: Trigger re-extraction (likely error)
2. **If confidence 0.60-0.84**: Reduce confidence by 0.10, flag for review
3. **If confidence <0.60**: Mark as LOW confidence, continue
4. **Log all failures** in `learning/validation_failures_{session_id}.json`

---

### Rule 7: Swedish Format Compliance

**Policy**: All Swedish-specific formats must be validated

**Organization Numbers** (Organisationsnummer):
```typescript
// Format: NNNNNN-NNNN (6 digits - 4 digits)
const orgNumberRegex = /^\d{6}-\d{4}$/

// Valid examples:
"556789-1234" // ✅
"559001-2345" // ✅

// Invalid examples:
"556789-123"  // ❌ Missing digit
"55-6789-1234" // ❌ Wrong format
```

**Postal Codes** (Postnummer):
```typescript
// Format: NNN NN (3 digits space 2 digits)
const postalCodeRegex = /^\d{3} \d{2}$/

// Valid examples:
"112 51" // ✅ Stockholm
"411 05" // ✅ Göteborg

// Invalid examples:
"11251"  // ❌ Missing space
"1125"   // ❌ Missing digits
```

**Currency** (Always in tkr = thousands of SEK):
```typescript
// All _tkr fields must be integers (no decimals)
total_revenue_tkr: 12500  // ✅ (represents 12,500,000 SEK)
total_revenue_tkr: 12500.5 // ❌ Decimals not allowed in tkr

// Conversion rules:
"12,5 MSEK" → 12500 tkr  // 1 MSEK = 1000 tkr
"12 500 000 kr" → 12500 tkr  // Divide by 1000
"12 500 tkr" → 12500 tkr  // Already in tkr
```

**Dates**:
```typescript
// Format: ISO 8601 (YYYY-MM-DD)
fiscal_year_end: "2024-12-31"  // ✅
fiscal_year_end: "31/12/2024"  // ❌ Wrong format
fiscal_year_end: "2024-12-31T23:59:59Z"  // ❌ Too precise (date only, no time)
```

---

## Validation Rigor Standards

### Validation Pipeline

Every extraction goes through 4 validation layers:

```
Layer 1: Schema Validation (Zod)
   ↓
Layer 2: Cross-Field Validation (Accounting Rules)
   ↓
Layer 3: Format Validation (Swedish Standards)
   ↓
Layer 4: Completeness Check (Coverage ≥70%)
```

**Pass Criteria**: ALL 4 layers must pass

**Failure Handling**:
- Layer 1 fail: ❌ REJECT extraction (schema violation)
- Layer 2 fail: ⚠️ FLAG for review, reduce confidence
- Layer 3 fail: ⚠️ FLAG for review, mark field as invalid
- Layer 4 fail: ⚠️ RETRY with extended context (once)

---

### Completeness Thresholds

**Minimum Viable Extraction**:
```typescript
{
  critical_fields_extracted: >= 50,  // Out of 60 critical fields
  total_fields_extracted: >= 70,     // Out of 95 total fields
  high_confidence_rate: >= 0.60,     // 60% of extracted fields
  low_confidence_rate: <= 0.10       // ≤10% of extracted fields
}
```

**Critical Fields** (Must extract ≥50/60):
- BRF name, org number, address, city
- Fiscal year, period start/end dates
- Total revenue, total expenses, net income
- Total assets, total liabilities, equity
- Chairman name, auditor name
- Member count, apartment count

**Optional Fields** (Nice-to-have):
- Energy class, heating type
- Board member roles, individual salaries
- Detailed expense breakdowns
- Maintenance plans, future projects

---

## Quality Assurance Checks

### Automated QA (Every Extraction)

**1. Evidence Integrity**:
```typescript
for (const field of allFields) {
  if (field.value !== null) {
    assert(field.evidence_pages.length > 0, "Missing evidence pages")
    assert(field.original_string !== null, "Missing original_string")
    assert(field.confidence > 0, "Invalid confidence for non-null value")
  }
}
```

**2. Confidence Calibration**:
```typescript
for (const field of allFields) {
  if (field.confidence >= 0.90) {
    assert(field.extraction_method === "dual_agreement", "Overconfident without dual agreement")
  }
  if (field.extraction_method === "no_consensus") {
    assert(field.confidence < 0.60, "Underconfident with no consensus")
  }
}
```

**3. Format Compliance**:
```typescript
if (field.name.endsWith("_tkr")) {
  assert(Number.isInteger(field.value), "tkr field must be integer")
  assert(field.value >= 0, "tkr field must be non-negative")
}

if (field.name === "organization_number") {
  assert(/^\d{6}-\d{4}$/.test(field.value), "Invalid org number format")
}
```

### Manual QA (Spot Checks)

**Frequency**: Every 10 PDFs, manually review 1 PDF (10% sample rate)

**Review Checklist**:
- [ ] Open PDF at cited evidence_pages, verify value matches
- [ ] Check 5 random high-confidence fields (should be obvious in PDF)
- [ ] Check 3 random low-confidence fields (should be ambiguous or missing)
- [ ] Verify `original_string` exactly matches PDF text
- [ ] Confirm no hallucinated data (all values have evidence)
- [ ] Validate cross-field math (balance sheet balances, etc.)

**Acceptance Criteria**:
- ✅ 0 hallucinations found
- ✅ 0 evidence mismatches
- ✅ 0 format violations
- ⚠️ ≤1 minor issue (e.g., missing normalization_note)
- ❌ ≥2 issues: Trigger full re-extraction of PDF

---

## Error Budgets

### Acceptable Error Rates

**Per PDF** (1 extraction):
- Hallucinations: 0 (zero tolerance)
- Evidence mismatches: ≤1 (should be obvious corrections)
- Format violations: ≤2 (edge cases only)
- Low confidence flags: ≤10% of fields

**Per Batch** (20 PDFs):
- PDFs requiring re-extraction: ≤2 (10%)
- Average completeness: ≥75%
- Average high-confidence rate: ≥70%
- Critical field success rate: ≥90% (54/60 fields across all PDFs)

**Escalation Triggers**:
- If 3 consecutive PDFs fail validation: ❌ STOP, investigate systematic issue
- If same field fails in >50% of PDFs: ❌ STOP, update agent prompt
- If hallucination rate >0%: ❌ STOP, audit consensus mechanism

---

## Learning & Improvement

### Failure Analysis

**For every failed extraction**:

```json
{
  "pdf_id": "82665_årsredovisning_lund_brf_vipemöllan_3",
  "failure_type": "completeness_below_threshold",
  "details": {
    "completeness_rate": 0.58,  // Below 70% threshold
    "missing_critical_fields": 15,
    "common_missing_categories": ["energy_data", "board_member_roles"]
  },
  "root_cause_analysis": {
    "hypothesis": "Energy data in separate appendix not detected by sectionizer",
    "evidence": "Searched pages 1-21, appendix on pages 22-25 not included",
    "proposed_fix": "Extend sectionizer to include appendices (pages beyond main report)"
  },
  "action_taken": "Re-extracted with full PDF (pages 1-25), completeness improved to 72%"
}
```

**Save to**: `learning/failure_analysis_{pdf_id}.json`

### Success Pattern Recognition

**For high-performing extractions** (completeness ≥85%):

```json
{
  "pdf_id": "79446_årsredovisning_stockholm_brf_roslagsbanan_12",
  "success_factors": {
    "completeness_rate": 0.89,
    "high_confidence_rate": 0.88,
    "document_characteristics": {
      "layout": "traditional_text",  // vs modern_visual
      "table_clarity": "high",  // Clear borders, good OCR
      "language_clarity": "high"  // Standard Swedish, no abbreviations
    }
  },
  "best_practices": [
    "Financial tables in clear grid format → 100% extraction accuracy",
    "Board list in bulleted format → Easy name extraction",
    "Auditor signature clearly labeled → No ambiguity"
  ]
}
```

**Save to**: `learning/success_patterns_{pdf_id}.json`

---

## Rigor Compliance Checklist

Before marking a PDF as complete, verify:

### Extraction Quality
- [x] Zero hallucinated values
- [x] All non-null values have `evidence_pages` (length ≥1)
- [x] All non-null values have `original_string`
- [x] Confidence scores calibrated correctly (no overconfidence)
- [x] Consensus metadata complete

### Validation Quality
- [x] Schema validation passed (Zod)
- [x] Cross-field validation passed (accounting rules)
- [x] Format validation passed (Swedish standards)
- [x] Completeness ≥70% (or documented failure reason)

### Documentation Quality
- [x] Extraction log saved with full metadata
- [x] Any failures documented in `failure_analysis_{pdf_id}.json`
- [x] Session summary includes quality metrics
- [x] Learning patterns captured (if applicable)

### Auditability
- [x] Full consensus trail preserved (all model responses)
- [x] Disagreements logged with reasons
- [x] Tiebreaker decisions explained
- [x] Validation failures logged with corrective actions

---

## Protocol Versioning

**Current Version**: 1.0.0

**Version History**:
- **1.0.0** (2025-11-18): Initial rigor protocol
  - Established 7 extraction rules
  - Defined confidence calibration
  - Created validation pipeline
  - Set error budgets

**Future Enhancements**:
- **1.1.0**: Add automated confidence calibration tuning based on manual QA feedback
- **1.2.0**: Introduce field-specific validation rules (e.g., energy_class must be A-G)
- **2.0.0**: Multi-language support (Norwegian, Danish BRF equivalents)

---

**END OF RIGOR PROTOCOL**

**Maintained by**: Claude Code Quality Assurance System
**Review Frequency**: After every 50 PDFs processed
**Last Reviewed**: 2025-11-18
