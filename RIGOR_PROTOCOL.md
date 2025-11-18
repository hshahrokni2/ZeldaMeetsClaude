# Rigor Protocol: Ground Truth Extraction Standards

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Purpose**: Define quality standards, consensus mechanisms, and validation rules for BRF annual report extraction

---

## Core Principles

1. **Accuracy Over Speed**: Prioritize correct extraction over fast completion
2. **Evidence-Based**: Every extracted value must cite source pages
3. **Consensus-Driven**: Multi-model agreement increases confidence
4. **Conservative Defaults**: When uncertain, mark as low confidence or null
5. **Traceable**: Full audit trail from PDF → raw extraction → consensus → validation

---

## Consensus Mechanism

### Three-Model System

**Primary Extractors**:
1. **Gemini 2.5 Pro** - Specialized in Swedish text, financial tables
2. **GPT-4o** - Strong structured data extraction, follows JSON schema

**Tiebreaker**:
3. **Claude 3.7 Sonnet** - Invoked only when Gemini and GPT disagree

### Consensus Rules

#### Rule 1: Dual Agreement (HIGH Confidence)

**Condition**: Gemini and GPT-4o extract identical values

**Confidence**: 0.90 - 1.00

**Logic**:
```python
if gemini_value == gpt4o_value:
    final_value = gemini_value
    confidence = 0.95
    source = "dual_agreement"
    evidence_pages = union(gemini_pages, gpt4o_pages)
```

**Example**:
```json
{
  "org_number": {
    "value": "556123-4567",
    "confidence": 0.95,
    "source": "dual_agreement",
    "evidence_pages": [2],
    "gemini_raw": "556123-4567",
    "gpt4o_raw": "556123-4567"
  }
}
```

---

#### Rule 2: Substantial Agreement (HIGH-MEDIUM Confidence)

**Condition**: Values differ slightly but semantically equivalent

**Confidence**: 0.80 - 0.89

**Examples of Substantial Agreement**:
- Currency: "12,5 MSEK" vs "12500 tkr" → both = 12500
- Dates: "2023-12-31" vs "31 december 2023" → same date
- Names: "Anna Svensson" vs "Svensson, Anna" → same person
- Whitespace: "BRF Axet" vs "BRF  Axet" → same name

**Logic**:
```python
if normalize(gemini_value) == normalize(gpt4o_value):
    final_value = normalized_value
    confidence = 0.85
    source = "substantial_agreement"
```

**Normalization Functions**:

**Currency**:
```python
def normalize_currency(value: str) -> int:
    # "12,5 MSEK" → 12500
    # "12 500 tkr" → 12500
    # "12.500.000 kr" → 12500
    value = value.upper()
    multipliers = {"MSEK": 1000, "MKR": 1000, "TKR": 1, "KR": 0.001}
    # Extract number and multiplier
    # Return value in tkr (thousand SEK)
```

**Dates**:
```python
def normalize_date(value: str) -> str:
    # "2023-12-31" → "2023-12-31"
    # "31 december 2023" → "2023-12-31"
    # "31/12/2023" → "2023-12-31"
    # Return ISO 8601 format
```

**Names**:
```python
def normalize_name(value: str) -> str:
    # "Anna Svensson" → "anna svensson"
    # "Svensson, Anna" → "anna svensson"
    # Remove extra whitespace, lowercase, sort if comma-separated
```

---

#### Rule 3: Claude Tiebreaker (MEDIUM Confidence)

**Condition**: Gemini and GPT-4o disagree, Claude resolves

**Confidence**: 0.70 - 0.79

**Logic**:
```python
if gemini_value != gpt4o_value:
    claude_value = extract_with_claude(pdf, field, [gemini_value, gpt4o_value])

    if claude_value == gemini_value:
        final_value = gemini_value
        confidence = 0.75
        source = "claude_agreed_with_gemini"
    elif claude_value == gpt4o_value:
        final_value = gpt4o_value
        confidence = 0.75
        source = "claude_agreed_with_gpt4o"
    else:
        # All three disagree - see Rule 4
```

**Claude Tiebreaker Prompt**:
```
You are resolving a disagreement between two AI models extracting data from a Swedish BRF annual report.

Field: [field_name]
Gemini extracted: [gemini_value]
GPT-4o extracted: [gpt4o_value]

Please review the PDF pages [page_range] and determine which value is correct, or provide the correct value if both are wrong.

Rules:
1. Only extract values explicitly visible in the PDF
2. Cite the exact page number where you found the value
3. If neither is correct, provide the correct value
4. If the field is not present, return null

Response format:
{
  "correct_value": <value or null>,
  "reasoning": "...",
  "evidence_page": <page_number>
}
```

---

#### Rule 4: No Agreement (LOW Confidence)

**Condition**: All three models disagree or ≥2 models return null

**Confidence**: 0.50 - 0.69

**Logic**:
```python
if gemini_value != gpt4o_value and claude_value not in [gemini_value, gpt4o_value]:
    # Select value with strongest evidence (most page citations)
    final_value = select_best_supported(gemini, gpt4o, claude)
    confidence = 0.55
    source = "no_consensus_best_evidence"

    # OR if all null/missing
    if all([gemini_value is None, gpt4o_value is None, claude_value is None]):
        final_value = None
        confidence = 0.0
        source = "all_models_missing"
```

**Flag for Review**:
```json
{
  "field": "maintenance_fee_tkr",
  "value": 1250,
  "confidence": 0.55,
  "source": "no_consensus_best_evidence",
  "evidence_pages": [18],
  "needs_review": true,
  "disagreement": {
    "gemini": 1250,
    "gpt4o": 1150,
    "claude": 1200
  }
}
```

---

## Confidence Scoring

### Base Confidence by Consensus Level

| Consensus Type | Base Confidence | Range |
|---------------|----------------|-------|
| Dual Agreement | 0.95 | 0.90 - 1.00 |
| Substantial Agreement | 0.85 | 0.80 - 0.89 |
| Claude Tiebreaker | 0.75 | 0.70 - 0.79 |
| No Agreement | 0.55 | 0.50 - 0.69 |
| All Models Missing | 0.00 | 0.00 |

### Confidence Adjustments

**Increase Confidence** (+0.05 to +0.10):
- ✅ Value appears in multiple sections of PDF
- ✅ Value cross-validates with other fields (e.g., balance sheet sums)
- ✅ Value matches expected format perfectly (e.g., valid org number)
- ✅ All three models cite same evidence page

**Decrease Confidence** (-0.05 to -0.15):
- ❌ Value appears only once in PDF
- ❌ Poor scan quality or handwritten text
- ❌ Value contradicts other fields
- ❌ Models cite different evidence pages
- ❌ Value is an outlier (e.g., fee > 8000 SEK/month)

### Final Confidence Bounds

**Always constrain**: `max(0.0, min(1.0, adjusted_confidence))`

---

## Field-Level Validation

### Swedish Format Validators

**Organization Number**:
```python
def validate_org_number(value: str) -> bool:
    # Format: NNNNNN-NNNN (10 digits with hyphen)
    pattern = r'^\d{6}-\d{4}$'
    if not re.match(pattern, value):
        return False
    # Additional: Luhn algorithm check
    return validate_luhn(value.replace('-', ''))
```

**Postal Code**:
```python
def validate_postal_code(value: str) -> bool:
    # Format: NNN NN (5 digits with space) or NNNNN
    pattern = r'^\d{3}\s?\d{2}$'
    return bool(re.match(pattern, value))
```

**Bank Account**:
```python
def validate_bank_account(value: str) -> bool:
    # Clearing number (4-5 digits) + account (7-10 digits)
    pattern = r'^\d{4,5}-\d{7,10}$'
    return bool(re.match(pattern, value))
```

**Year**:
```python
def validate_year(value: int) -> bool:
    # BRF annual reports: 2020-2025
    return 2020 <= value <= 2025
```

---

### Cross-Field Validation

**Balance Sheet Equation**:
```python
def validate_balance_sheet(data: dict) -> bool:
    assets = data.get('total_assets_tkr', {}).get('value')
    liabilities = data.get('total_liabilities_tkr', {}).get('value')
    equity = data.get('total_equity_tkr', {}).get('value')

    if assets and liabilities and equity:
        # Allow 1% tolerance for rounding
        difference = abs(assets - (liabilities + equity))
        tolerance = assets * 0.01
        return difference <= tolerance
    return True  # Skip if data missing
```

**Revenue vs Expenses**:
```python
def validate_financials(data: dict) -> bool:
    revenue = data.get('total_revenue_tkr', {}).get('value')
    expenses = data.get('total_expenses_tkr', {}).get('value')

    if revenue and expenses:
        # Revenue should generally exceed expenses (or be close)
        # Flag if expenses > 2x revenue (likely error)
        return expenses <= revenue * 2
    return True
```

**Fees Reasonableness**:
```python
def validate_fees(data: dict) -> bool:
    monthly_fee = data.get('monthly_fee_sek', {}).get('value')

    if monthly_fee:
        # Typical BRF fees: 1000-8000 SEK/month
        # Flag outliers for review
        if monthly_fee < 500 or monthly_fee > 15000:
            data['monthly_fee_sek']['needs_review'] = True
            data['monthly_fee_sek']['reason'] = 'Outlier value'
    return True
```

---

## Evidence Requirements

### Mandatory Evidence Tracking

**Every extracted field MUST include**:
```json
{
  "value": <extracted_value>,
  "confidence": <0.0-1.0>,
  "evidence_pages": [<page_numbers>],  // 1-based page numbers
  "source": "<consensus_type>",
  "original_string": "<text_from_pdf>"
}
```

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [5, 6],
    "source": "dual_agreement",
    "original_string": "Intäkter: 12,5 MSEK"
  }
}
```

### Evidence Page Rules

1. **1-based indexing**: First page = page 1 (not page 0)
2. **Multiple pages**: If value appears on multiple pages, cite all
3. **Calculated values**: Cite pages where components appear
4. **Missing values**: Empty array `[]` if field not found

---

## Anti-Hallucination Rules

### Strict Extraction Constraints

**ONLY extract if**:
1. ✅ Value is explicitly visible in PDF text
2. ✅ Can cite exact page number(s)
3. ✅ Text is readable (not blurred or obscured)
4. ✅ Context matches field definition

**NEVER extract**:
1. ❌ Values from table headers (extract actual data)
2. ❌ Placeholder text (e.g., "XXX", "TBD", "---")
3. ❌ Values from previous years (unless field specifies)
4. ❌ Inferred/calculated values (unless explicitly shown)
5. ❌ Values from redacted sections

### Null vs Empty String vs Zero

**Use `null`**:
- Field not present in document
- Text is illegible
- Redacted/censored

**Use empty string `""`**:
- String field is present but blank
- Name field with no text

**Use `0`**:
- Numeric field explicitly shows "0 kr", "0,00", "0"
- NOT when field is missing

---

## Quality Thresholds

### Field-Level Thresholds

**Publish as Ground Truth**:
- Confidence ≥ 0.80
- Evidence pages cited
- Passes format validation

**Flag for Review**:
- Confidence 0.60 - 0.79
- OR no consensus
- OR failed cross-validation

**Exclude from Training**:
- Confidence < 0.60
- OR all models returned null
- OR critical validation failure

---

### Agent-Level Thresholds

**Agent Success**:
- ≥70% of target fields extracted with confidence ≥ 0.70
- No critical validation failures
- At least 1 field with confidence ≥ 0.80

**Agent Partial Success**:
- 40-69% of target fields extracted
- OR multiple low-confidence fields
- Still contributes to final result

**Agent Failure**:
- <40% of target fields extracted
- OR all extractions below 0.60 confidence
- OR critical errors (API failure, timeout)
- Exclude agent's data from final result

---

### Document-Level Thresholds

**EXCELLENT Quality**:
- ≥90% of fields with confidence ≥ 0.80
- 18-19 agents succeeded
- All critical fields present (org_number, brf_name, year)
- Balance sheet validates
- Cost: $0.70-1.00

**GOOD Quality**:
- 70-89% of fields with confidence ≥ 0.70
- 15-17 agents succeeded
- Critical fields present
- Minor validation issues
- Cost: $0.60-0.90

**ACCEPTABLE Quality**:
- 50-69% of fields with confidence ≥ 0.60
- 12-14 agents succeeded
- Some critical fields missing
- Multiple validation warnings
- Cost: $0.50-0.80

**POOR Quality**:
- <50% of fields with confidence ≥ 0.60
- <12 agents succeeded
- Critical fields missing
- Failed cross-validation
- Requires re-processing or manual review

---

## Error Handling Standards

### Retryable Errors

**Network Errors** (retry up to 3 times):
- Connection timeout
- DNS resolution failure
- SSL handshake failure

**API Errors** (retry with exponential backoff):
- 429 Rate Limit → wait 2s, 4s, 8s, 16s
- 500 Internal Server Error → wait 1s, 2s, 4s
- 503 Service Unavailable → wait 2s, 4s, 8s

**Backoff Formula**:
```python
def exponential_backoff(attempt: int) -> float:
    return min(2 ** attempt, 32)  # Max 32 seconds
```

### Fatal Errors

**Abort Immediately**:
- 401 Unauthorized (invalid API key)
- 403 Forbidden (quota exceeded)
- 404 PDF not found
- 422 Invalid request format
- Corrupted PDF (cannot parse)
- Schema definition errors

**Action**: Log error, save partial results, mark session FAILED

---

## Logging Requirements

### Extraction Log Format

**File**: `sessions/[session_id]/extraction_log.md`

**Template**:
```markdown
# Extraction Log: [session_id]

## Session Info
- PDF: [filename]
- Started: [timestamp]
- Status: [IN_PROGRESS/COMPLETED/FAILED]

## Vision Sectionizer
- Round 1 (L1 sections): [N] sections detected
- Round 2 (L2/L3 subsections): [M] subsections detected
- Cost: $[X.XX]
- Duration: [N]s

## Agent Execution

### Agent: financial_agent
- Status: ✅ SUCCESS
- Fields Extracted: 11/11
- Consensus: 9 dual_agreement, 2 claude_tiebreaker
- Confidence: avg=0.89, min=0.75, max=0.95
- Cost: $0.04
- Duration: 12s

### Agent: balance_sheet_agent
- Status: ⚠️ PARTIAL
- Fields Extracted: 8/12
- Consensus: 6 dual_agreement, 2 no_consensus
- Confidence: avg=0.81, min=0.55, max=0.95
- Warnings: 2 fields below 0.70 threshold
- Cost: $0.05
- Duration: 15s

### Agent: property_agent
- Status: ❌ FAILED
- Error: 429 Rate Limit Exceeded (after 3 retries)
- Fields Extracted: 0/8
- Cost: $0.00
- Duration: 45s (including retries)

## Summary
- Total Agents: 19
- Succeeded: 16
- Partial: 2
- Failed: 1
- Total Cost: $0.87
- Total Duration: 8m 32s
```

---

## Consensus Edge Cases

### Case 1: One Model Null, Two Agree

**Scenario**:
- Gemini: 12500
- GPT-4o: 12500
- Claude: null

**Resolution**: DUAL AGREEMENT (ignore Claude null)
```json
{
  "value": 12500,
  "confidence": 0.93,  // Slightly reduced from 0.95
  "source": "dual_agreement_one_null"
}
```

---

### Case 2: Two Models Null, One Extracts

**Scenario**:
- Gemini: null
- GPT-4o: null
- Claude: 12500

**Resolution**: LOW CONFIDENCE (likely hallucination)
```json
{
  "value": 12500,
  "confidence": 0.50,
  "source": "single_model_only",
  "needs_review": true,
  "warning": "Only one model found this value"
}
```

---

### Case 3: Three Different Values

**Scenario**:
- Gemini: 12500
- GPT-4o: 12000
- Claude: 12300

**Resolution**: NO CONSENSUS (select most supported)
```json
{
  "value": null,  // Too uncertain
  "confidence": 0.0,
  "source": "all_models_disagree",
  "needs_review": true,
  "disagreement": {
    "gemini": 12500,
    "gpt4o": 12000,
    "claude": 12300
  }
}
```

**OR** if one value has stronger evidence:
```json
{
  "value": 12500,
  "confidence": 0.55,
  "source": "best_evidence_selected",
  "reasoning": "Gemini cited 2 pages, others cited 1"
}
```

---

### Case 4: Semantic Equivalence

**Scenario**:
- Gemini: "Anna Svensson"
- GPT-4o: "Svensson, Anna"
- Claude: "Anna Svensson"

**Resolution**: SUBSTANTIAL AGREEMENT (after normalization)
```json
{
  "value": "Anna Svensson",
  "confidence": 0.88,
  "source": "substantial_agreement_after_normalization",
  "normalized_form": "anna svensson"
}
```

---

## Performance Benchmarks

### Expected Metrics (Per PDF)

**Timing**:
- Sectionizer: 30-60s
- Agent Execution: 6-8 minutes (19 agents × ~20s each)
- Validation: 10-20s
- Total: 8-10 minutes

**Cost**:
- Sectionizer: $0.03-0.05 (Gemini Flash)
- Agents: $0.60-0.80 (19 × $0.03-0.04)
- Tiebreakers: $0.05-0.10 (Claude as needed)
- Total: $0.70-1.00 per PDF

**Quality** (Target):
- High confidence fields: ≥80%
- Agent success rate: ≥85% (16+/19)
- Balance sheet validation: ≥90%
- Critical fields present: 100%

---

## Continuous Improvement

### Learning Loop

After each session:
1. **Analyze low-confidence fields** → identify prompt improvements
2. **Review agent failures** → detect systemic issues
3. **Track consensus patterns** → optimize model selection
4. **Monitor costs** → adjust retry policies
5. **Update agent prompts** → incorporate learnings

### Monthly Review

Track across all sessions:
- Consensus distribution (dual vs tiebreaker vs no agreement)
- Model-specific strengths (which model is best for which fields?)
- Common failure patterns (which fields are hardest to extract?)
- Cost trends (are costs increasing or decreasing?)
- Quality trends (is accuracy improving over time?)

---

## Protocol Compliance Checklist

For each extraction session, verify:

- [ ] Multi-model consensus applied to all fields
- [ ] Confidence scores calculated correctly
- [ ] Evidence pages cited (1-based indexing)
- [ ] Original strings preserved
- [ ] Format validation passed
- [ ] Cross-field validation executed
- [ ] Anti-hallucination rules enforced
- [ ] Errors handled per retry policy
- [ ] Complete extraction log generated
- [ ] Quality metrics calculated
- [ ] Learnings documented

**Non-compliance** = Results flagged for audit and re-processing.

---

**END OF PROTOCOL**
