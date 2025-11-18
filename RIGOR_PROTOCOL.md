# Rigor Protocol for BRF Extraction

**Version**: 1.0.0
**Last Updated**: 2025-11-18

## Purpose

This protocol defines quality standards for extracting structured data from Swedish BRF annual reports. Every extraction must meet these rigor requirements.

## Core Principles

### 1. Anti-Hallucination
**Rule**: Only extract data that is EXPLICITLY visible in the PDF

**Requirements**:
- Every extracted value must have evidence pages (1-based page numbers)
- Original text must be preserved in `_original` fields
- If data is not found, field must be `null` (never guess)
- Confidence score must reflect actual visibility (not model confidence)

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [5, 6],
    "original_string": "12,5 MSEK"
  }
}
```

**Violations**:
- ❌ Inferring values from context
- ❌ Calculating values not explicitly stated
- ❌ Filling in "typical" values
- ❌ Using external knowledge

### 2. Consensus Validation
**Rule**: Use 3-model consensus for high-stakes fields

**Model Roles**:
- **Gemini 2.5 Pro**: Primary extractor (fast, good at Swedish)
- **GPT-4o**: Secondary extractor (cross-validation)
- **Claude 3.7 Sonnet**: Tiebreaker (when Gemini ≠ GPT)

**Consensus Levels**:
```
HIGH confidence (0.90-1.00):
  - Gemini and GPT agree exactly
  - Both models found same value on same pages

MEDIUM confidence (0.60-0.89):
  - Claude tiebreaker resolved disagreement
  - Models agree on value but different pages

LOW confidence (0.30-0.59):
  - All 3 models disagree
  - Value found but unclear formatting
  - Flagged for human review

NO CONFIDENCE (0.00-0.29):
  - No model could extract value
  - Field set to null
```

**Cost Optimization**:
- Use Gemini + GPT for all 19 agents (dual agreement)
- Only invoke Claude tiebreaker when disagreement occurs
- Expected Claude usage: 10-15% of fields

### 3. Swedish Format Validation

**Organization Numbers**:
- Format: `NNNNNN-NNNN` (6 digits, hyphen, 4 digits)
- Example: `716416-8411`
- Validation: Regex `^\d{6}-\d{4}$`

**Postal Codes**:
- Format: `NNN NN` (3 digits, space, 2 digits)
- Example: `115 42`
- Validation: Regex `^\d{3}\s\d{2}$`

**Currency (tkr = thousands SEK)**:
- Input formats accepted:
  - `12 500 tkr`
  - `12,5 MSEK`
  - `0.0125 GSEK`
  - `12500000 kr`
- Output: Normalized to thousands (tkr)
- Example: `12.5 MSEK` → `12500` (tkr)

**Dates**:
- Format: `YYYY-MM-DD`
- Example: `2024-04-15`
- Validation: ISO 8601

### 4. Cross-Field Validation

**Balance Sheet Identity**:
```
assets_total_tkr = liabilities_total_tkr + equity_total_tkr
```
- Tolerance: ±1 tkr (rounding errors allowed)
- If violated: Flag entire balance sheet as LOW confidence

**Revenue Sanity Checks**:
```
total_revenue_tkr > 0
total_revenue_tkr = member_fees_revenue_tkr + other_revenue_tkr
```
- If violated: Re-extract financial_agent data

**Year Validation**:
```
fiscal_year ∈ {2023, 2024, 2025}
```
- If older: Verify PDF is correct
- If newer: Flag as edge case

### 5. Evidence Tracking

**Page Numbers**:
- **1-based indexing** (first page = 1)
- Example: Value on cover page → `"evidence_pages": [1]`

**Multiple Pages**:
- If value spans pages, list all: `[5, 6, 7]`
- If same value on multiple pages, list first occurrence only

**Original Text**:
- Copy EXACT text from PDF (preserve Swedish characters: åäöÅÄÖ)
- Include context if needed (e.g., "Årsavgift: 45 000 kr/år")
- Max length: 200 characters

### 6. Confidence Scoring

**Scoring Rubric**:

**0.95-1.00** (Exceptional):
- Value clearly labeled
- Dual model agreement
- Multiple confirmations in document
- Standard format

**0.85-0.94** (High):
- Value clearly visible
- Dual model agreement
- Single clear occurrence

**0.70-0.84** (Good):
- Value found but ambiguous label
- Tiebreaker needed
- Non-standard format

**0.50-0.69** (Moderate):
- Value inferred from context
- Conflicting information in document
- Requires calculation

**0.30-0.49** (Low):
- Value barely visible
- Heavy disagreement
- Unclear formatting

**0.00-0.29** (Unreliable):
- Should be null instead
- Too uncertain to use

### 7. Field-Specific Standards

**Financial Fields (_tkr)**:
- Always normalize to thousands (tkr)
- Preserve sign (negative values for expenses)
- Round to nearest integer
- Evidence: Must show calculation if derived

**Text Fields**:
- Preserve Swedish characters
- Trim whitespace
- Max length: 500 characters
- No HTML/formatting codes

**Boolean Fields**:
- Only true/false (never null unless truly unknown)
- Evidence: Must cite explicit statement

**List Fields** (e.g., board members):
- Preserve order from PDF
- Include all visible entries
- Each entry needs evidence page

### 8. Agent-Specific Requirements

**financial_agent** (11 _tkr fields):
- MUST extract from "Resultaträkning" section
- Cross-validate: total_revenue = sum of revenue components
- Cross-validate: total_costs = sum of cost components
- Evidence pages must match for related fields

**balance_sheet_agent**:
- MUST satisfy balance equation (assets = liabilities + equity)
- Extract from "Balansräkning" section only
- All values must be from same fiscal year

**chairman_agent**:
- Name format: "Firstname Lastname" (no titles)
- Role must be "Ordförande" or "Styrelseordförande"
- Evidence: Must show both name and role

**property_agent**:
- Address format: Swedish postal code standard
- Energy class: A-G only (or null)
- Building year: 1800-2025 range

## Quality Gates

Every extraction must pass these gates:

### Gate 1: Schema Validation
- ✅ All required fields present
- ✅ No extra fields
- ✅ Correct data types
- ✅ Confidence scores in [0.0, 1.0]

### Gate 2: Evidence Completeness
- ✅ Every non-null field has evidence_pages
- ✅ Every non-null field has original_string (or valid reason for omission)
- ✅ Evidence pages exist in PDF (not out of bounds)

### Gate 3: Cross-Field Consistency
- ✅ Balance sheet equation holds
- ✅ Revenue components sum correctly
- ✅ Date formats valid
- ✅ Swedish format validation passes

### Gate 4: Confidence Threshold
- ✅ At least 70% of fields have confidence ≥ 0.5
- ✅ Critical fields (revenue, assets, BRF name) have confidence ≥ 0.7
- ✅ Low confidence fields flagged for review

### Gate 5: Cost Compliance
- ✅ Total cost < $1.50 per PDF
- ✅ No unnecessary model calls
- ✅ Claude tiebreaker used sparingly (<20% of fields)

## Failure Handling

**If Gate Fails**:
1. Log specific failure reason
2. Save partial results with failure flag
3. Generate detailed error report
4. Do NOT retry automatically (log for human review)

**Acceptable Partial Results**:
- If ≥50% of fields extracted successfully
- If critical fields (name, revenue, assets) present
- If failure is due to PDF quality (not extraction logic)

## Success Metrics

**Per PDF**:
- 95%+ field-level accuracy (vs. ground truth)
- 85%+ dual agreement rate (Gemini + GPT)
- <5% unresolved disagreements
- Balance sheet equation holds (±1 tkr tolerance)

**Per Batch**:
- Zero schema validation failures
- <10% PDFs requiring human review
- Cost within budget ($0.50-1.50 per PDF)

## Protocol Updates

**When to Update**:
- New edge case discovered
- Systematic extraction error found
- Cost optimization opportunity identified

**Update Process**:
1. Document issue in learning log
2. Propose protocol change
3. Test on 3 PDFs
4. Update version number (semantic versioning)
5. Commit with detailed changelog

---

**End of Protocol**

This protocol ensures every extraction is:
- Evidence-based (no hallucination)
- Validated (consensus + cross-checks)
- Traceable (evidence pages + original text)
- High-quality (confidence scoring + QA gates)
