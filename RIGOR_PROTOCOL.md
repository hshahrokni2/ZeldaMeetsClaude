# Rigor Protocol - Ground Truth Extraction Standards

**Version**: 1.0.0
**Purpose**: Ensure highest quality data extraction for Swedish BRF annual reports
**Application**: All autonomous PDF processing sessions

---

## Core Principles

### 1. Evidence-Based Extraction
**Rule**: NEVER infer or hallucinate data
- ✅ Extract ONLY what is explicitly visible in the PDF
- ✅ Include exact page numbers where data was found (1-based indexing)
- ✅ Store original text string alongside normalized values
- ❌ Do NOT fill in missing values with defaults
- ❌ Do NOT use values from other documents
- ❌ Do NOT calculate values that aren't explicitly stated

**Example**:
```json
// ✅ CORRECT: Value explicitly found on page 6
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [6],
    "original_string": "Summa intäkter: 12,5 MSEK"
  }
}

// ❌ INCORRECT: Value inferred/calculated
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.50,
    "evidence_pages": [],
    "original_string": "Calculated from revenue items"
  }
}
```

### 2. Confidence Scoring Discipline
**Rule**: Be conservative with confidence scores

**Confidence Tiers**:
- **HIGH (0.85-1.0)**: Value explicitly stated in standard location with clear label
  - Example: "Årsavgift: 1250 kr/månad" in fees section

- **MEDIUM (0.60-0.84)**: Value found but in non-standard location or ambiguous label
  - Example: Fee amount in notes section instead of main statement

- **LOW (0.0-0.59)**: Value unclear, multiple possible interpretations
  - Example: "Avgift varierar mellan 1000-1500 kr"

**Confidence Adjustment Rules**:
```
Base confidence: 1.0

Deductions:
- Non-standard location: -0.10
- Ambiguous label: -0.15
- Value requires interpretation: -0.20
- Partial/incomplete data: -0.25
- Conflicting information in document: -0.30

Final confidence = max(0.0, base - deductions)
```

### 3. Currency Normalization Rigor
**Rule**: Always normalize to tkr (thousands of SEK) and preserve original

**Conversion Standards**:
```
Input Format       → Output (tkr)     Original String
─────────────────────────────────────────────────────
"12,5 MSEK"       → 12500           "12,5 MSEK"
"12.5 MSEK"       → 12500           "12.5 MSEK"
"12 500 000 SEK"  → 12500           "12 500 000 SEK"
"12500000"        → 12500           "12500000"
"450 tkr"         → 450             "450 tkr"
"450 000 kr"      → 450             "450 000 kr"
```

**Edge Cases**:
- **Negative values**: Preserve sign (e.g., "-450 tkr" → -450)
- **Ranges**: Use lower bound + note ambiguity (e.g., "1000-1500" → 1000, confidence 0.60)
- **Missing values**: null (NOT 0)
- **Zero values**: Only if explicitly stated (e.g., "Räntekostnader: 0 kr")

### 4. Swedish Language Precision
**Rule**: Account for Swedish-specific formatting and keywords

**Number Formats**:
- Thousand separator: SPACE (e.g., "12 500")
- Decimal separator: COMMA (e.g., "12,5")
- Allow both Swedish and international formats

**Standard Keywords** (by category):
```
Income Statement:
- Revenue: Intäkter, Nettoomsättning, Summa intäkter
- Costs: Kostnader, Summa kostnader
- Result: Årets resultat, Nettoresultat

Balance Sheet:
- Assets: Tillgångar, Summa tillgångar
- Liabilities: Skulder, Summa skulder
- Equity: Eget kapital

Governance:
- Chairman: Styrelseordförande, Ordförande
- Board: Styrelseledamöter, Styrelse
- Auditor: Revisor, Auktoriserad revisor

Property:
- Heating: Uppvärmning, Värme
- Energy class: Energiklass
- Year built: Byggår
```

**Org Number Format**:
- Standard: NNNNNN-NNNN (e.g., "716418-8047")
- Validation: 6 digits, hyphen, 4 digits
- Allow variations: "716418 8047", "7164188047"

### 5. Page Range Precision
**Rule**: Track exact pages where each field was found

**Page Numbering**:
- Use 1-based indexing (first page = 1)
- PDF pages, NOT document page numbers
- Include ALL pages where field appears

**Examples**:
```json
// Field appears on single page
"evidence_pages": [6]

// Field appears on multiple pages (e.g., multi-year table)
"evidence_pages": [5, 6, 7]

// Field is sum of values across pages
"evidence_pages": [8, 12, 15]
```

### 6. Cross-Field Validation
**Rule**: Validate extracted data for internal consistency

**Required Validations**:
```
1. Balance Sheet Equation:
   total_assets_tkr = total_liabilities_tkr + total_equity_tkr
   Tolerance: ±0.1% (rounding errors acceptable)

2. Income Statement Coherence:
   net_result_tkr ≈ total_revenue_tkr - total_costs_tkr
   Tolerance: ±1.0% (depreciation/adjustments)

3. Date Consistency:
   - fiscal_year_end ∈ [2020-01-01, 2025-12-31]
   - If building_year: building_year < fiscal_year

4. Sanity Checks:
   - All revenue fields ≥ 0
   - All cost fields ≥ 0
   - Total assets > 0 (if balance sheet exists)
   - Number of apartments > 0 (if specified)
```

**Validation Failure Handling**:
- Log discrepancy in validation.json
- Do NOT adjust values to force balance
- Flag for human review if error >5%

### 7. Multi-Agent Consensus (When Available)
**Rule**: When multiple agents extract same field, apply consensus

**Consensus Levels**:
```
HIGH (dual agreement):
- 2+ agents extract same value
- Example: financial_agent and key_metrics_agent both find total_revenue_tkr = 12500

MEDIUM (tiebreaker):
- 2 agents disagree, 3rd agent resolves
- Example: Agent A: 12500, Agent B: 12550, Agent C: 12500 → 12500

LOW (no agreement):
- All agents extract different values
- Use most confident extraction
- Flag for human review
```

**Note**: In Pure Claude mode (single-model extraction), consensus is N/A. Confidence scores replace consensus.

### 8. Completeness Over Speed
**Rule**: Thorough extraction beats fast extraction

**Priorities**:
1. **Accuracy**: Correct values with evidence
2. **Completeness**: Extract all available fields
3. **Confidence**: Conservative scoring
4. **Speed**: Optimize only after quality assured

**Time Budgets** (per agent):
- Simple agents (1-5 fields): 30-60 seconds
- Medium agents (6-15 fields): 60-120 seconds
- Complex agents (16+ fields): 120-180 seconds

**If time budget exceeded**:
- Continue extraction (do NOT truncate)
- Log extended execution time
- Investigate optimization opportunities after completion

### 9. Error Propagation Prevention
**Rule**: One agent's error must not affect others

**Isolation**:
- Each agent executes independently
- No shared state between agents (except PDF)
- Failed agent does NOT block others
- Partial results are valid

**Error Handling**:
```
Agent Failure:
1. Log error with context
2. Mark agent as "failed" in output
3. Continue with remaining agents
4. Include failure reason in final report

Extraction Uncertainty:
1. Mark field as null if truly ambiguous
2. Set confidence to LOW if unsure
3. Document uncertainty in notes
4. Do NOT guess or infer
```

### 10. Documentation Discipline
**Rule**: Every extraction decision must be traceable

**Required Documentation**:
```json
{
  "field_name": "total_revenue_tkr",
  "value": 12500,
  "confidence": 0.95,
  "evidence_pages": [6],
  "original_string": "Summa intäkter: 12,5 MSEK",
  "extraction_method": "vision_direct_read",
  "notes": "Found in Resultaträkning section, clearly labeled",
  "ambiguities": null,
  "validation_checks_passed": ["value_positive", "format_valid"]
}
```

**Learning Documentation**:
- Document layout variations encountered
- Note keyword alternatives found
- Record extraction challenges
- Suggest agent prompt improvements

---

## Quality Assurance Checklist

Before marking a PDF as complete, verify:

- [ ] All 19 agents executed (or failures logged)
- [ ] Each extracted field has:
  - [ ] Value (or null if missing)
  - [ ] Confidence score (0.0-1.0)
  - [ ] Evidence pages (1-based)
  - [ ] Original string (exact text from PDF)
- [ ] Cross-field validations performed
- [ ] Validation errors flagged (if any)
- [ ] Learning insights documented
- [ ] Session metadata complete (duration, field counts, etc.)
- [ ] Final JSON validates against schema
- [ ] Results committed to Git

---

## Anti-Patterns to Avoid

### ❌ Hallucination
```json
// WRONG: Guessing missing data
{
  "building_year": {
    "value": 1965,
    "confidence": 0.50,
    "evidence_pages": [],
    "original_string": "Estimated from architectural style"
  }
}

// CORRECT: Admit when data is missing
{
  "building_year": {
    "value": null,
    "confidence": 0.0,
    "evidence_pages": [],
    "original_string": null,
    "notes": "Building year not found in document"
  }
}
```

### ❌ Over-Confidence
```json
// WRONG: High confidence for ambiguous data
{
  "maintenance_costs_tkr": {
    "value": 850,
    "confidence": 0.95,  // Too high!
    "evidence_pages": [14],
    "original_string": "Underhåll och reparationer: ca 850 tkr",
    "notes": "Value is approximate ('ca')"
  }
}

// CORRECT: Confidence reflects uncertainty
{
  "maintenance_costs_tkr": {
    "value": 850,
    "confidence": 0.70,  // Reduced for "ca"
    "evidence_pages": [14],
    "original_string": "Underhåll och reparationer: ca 850 tkr",
    "notes": "Value marked as approximate with 'ca' prefix"
  }
}
```

### ❌ Calculation Instead of Extraction
```json
// WRONG: Calculating instead of extracting
{
  "total_costs_tkr": {
    "value": 10300,
    "confidence": 0.80,
    "evidence_pages": [6, 7, 8],
    "original_string": "Sum of line items",
    "notes": "Calculated by adding all cost categories"
  }
}

// CORRECT: Extract the stated total
{
  "total_costs_tkr": {
    "value": 10300,
    "confidence": 0.95,
    "evidence_pages": [6],
    "original_string": "Summa kostnader: 10 300 tkr",
    "notes": "Total explicitly stated in document"
  }
}
```

---

## Performance Targets

**Per PDF**:
- Field coverage: ≥70% (≥66/95 fields)
- High confidence: ≥60% (≥40/66 extracted fields)
- Validation pass rate: ≥95%
- Cross-validation errors: <5%
- Execution time: 15-25 minutes

**Batch Quality** (10+ PDFs):
- Consistency: Same fields extracted across similar documents
- Pattern learning: Improving confidence over time
- Error reduction: Fewer validation failures in later PDFs

---

## Continuous Improvement

**Learning Loop**:
1. Extract PDF → Document challenges
2. Every 10 PDFs → Meta-analysis
3. Identify patterns → Update agent prompts
4. Re-extract sample → Measure improvement

**Success Metric**:
- Confidence scores increase over time
- Validation pass rate approaches 100%
- Extraction time decreases (efficiency improves)

---

**Protocol Status**: ACTIVE
**Enforcement**: MANDATORY for all autonomous sessions
**Last Updated**: 2025-11-18
**Version**: 1.0.0
