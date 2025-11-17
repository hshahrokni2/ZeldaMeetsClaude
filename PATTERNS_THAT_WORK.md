# Patterns That Work

**Purpose**: Document proven patterns for prompt engineering, validation, and schema design
**Update**: After each successful experiment session

---

## Prompt Engineering

### ✅ Explicit Currency Unit Instructions
**Pattern**: Tell agents to extract RAW NUMBER + UNIT, let wrapper normalize
**Example**:
```markdown
Extract the numeric value AS WRITTEN, including the unit:
- "12,5 MSEK" → value: 12.5, unit: "MSEK"
- "1 250 tkr" → value: 1250, unit: "tkr"

DO NOT pre-convert. The wrapper will normalize to tkr.
```
**Evidence**: TBD (needs testing in experiments)
**Confidence**: 70% (logical but unproven)

---

### ✅ Numbered Step-by-Step Instructions
**Pattern**: Break complex tasks into numbered steps
**Example**:
```markdown
1. First, locate the "Resultaträkning" section
2. Then, find the line labeled "Intäkter" or "Nettoomsättning"
3. Extract the numeric value with its unit
4. Record the page number as evidence
```
**Evidence**: Standard best practice in prompt engineering
**Confidence**: 90%

---

### ✅ Negative Examples
**Pattern**: Show what NOT to do, not just what to do
**Example**:
```markdown
❌ WRONG: "12,5 MSEK" → 12.5 (missing unit!)
✅ CORRECT: "12,5 MSEK" → value: 12.5, unit: "MSEK"
```
**Evidence**: Reduces ambiguity in instructions
**Confidence**: 85%

---

### ✅ Fail-Safe Instructions
**Pattern**: Explicit instructions for uncertainty
**Example**:
```markdown
If the value is ambiguous or not visible:
- DO NOT guess or estimate
- Return null for that field
- DO NOT use placeholder strings like "Unknown"
```
**Evidence**: Reduces hallucination rate
**Confidence**: 90%

---

## Validation Design

### ✅ Warn, Don't Block (Lenient Philosophy)
**Pattern**: Use warnings for suboptimal data, errors only for critical failures
**Rationale**: BRF documents are heterogeneous; null is valid
**Evidence**: Current system philosophy (schema-validator.ts:4-9)
**Confidence**: 95% (proven in current implementation)

---

### ✅ Tolerance Thresholds
**Pattern**: Allow small deviations (±1-2%) for financial equations
**Example**: Balance sheet equation tolerance = ±1% of assets
**Rationale**: Handles rounding errors in source documents
**Evidence**: lib/schema-validator.ts:399-400
**Confidence**: 95%

---

### ✅ Magnitude Sanity Checks
**Pattern**: Detect suspiciously large/small values
**Example**: Flag if value > 1,000,000 tkr (1 billion SEK) as likely 1000x error
**Evidence**: lib/schema-validator.ts:302
**Confidence**: 90%

---

## Schema Design

### ✅ Suffix-Based Field Naming
**Pattern**: Use consistent suffixes for field types
**Examples**:
- `_tkr` for currency fields (thousands SEK)
- `_date` for date fields
- `_original` for pre-normalization values
**Rationale**: Makes fields grep-able and self-documenting
**Confidence**: 95%

---

### ✅ Paired Fields (Value + Original)
**Pattern**: Store normalized value + original text
**Example**: `total_assets_tkr` + `total_assets_tkr_original`
**Rationale**: Preserves information, enables validation
**Evidence**: Field wrapper design (lib/field-wrapper.ts:223-240)
**Confidence**: 95%

---

## Error Handling

### ✅ Multi-Strategy JSON Parsing
**Pattern**: Try 4 parsing strategies in sequence
**Evidence**: lib/extraction-workflow.ts:345-393
**Confidence**: 95% (proven robust)

---

### ✅ JSON Truncation Repair
**Pattern**: Salvage partial responses by removing incomplete fields
**Evidence**: lib/vision-sectionizer.ts:254-332
**Confidence**: 85% (works but loses data silently - see Blind Spot #6)

---

## Notes

- This document should grow with each experiment
- Add confidence ratings (0-100%) based on evidence
- Update patterns if experiments prove them wrong
- Remove patterns if better alternatives found
