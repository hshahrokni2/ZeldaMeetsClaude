# Rigor Protocol

**Version**: 1.0.0
**Purpose**: Define extraction quality standards and anti-hallucination rules
**Applies to**: All 19 specialist agents

## Core Principles

### 1. No Hallucination
- **ONLY extract text that is explicitly visible in the PDF**
- If a field is not found → return `null` (not a guess)
- Never infer, assume, or calculate values not present in source
- Example violations:
  - ❌ "Revenue is probably around 10M SEK" (guessing)
  - ❌ Calculating board_member_count by counting names in narrative text
  - ✅ Extracting "10,500 tkr" from financial table

### 2. Evidence-Based Extraction
- **Every non-null field MUST have evidence_pages**
- Evidence pages = 1-based page numbers where value was found
- Example:
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
- If value appears on multiple pages → list all pages
- If value is inferred from multiple sources → list all contributing pages

### 3. Confidence Calibration

**High Confidence (0.85-1.0)**:
- Text is explicitly stated in clear, unambiguous format
- Value appears in structured table or labeled field
- Multiple models agree (dual agreement)
- Example: "Årsavgift: 45,000 kr/år" → 0.95 confidence

**Medium Confidence (0.60-0.84)**:
- Text is present but requires interpretation
- Value appears in narrative paragraph
- Claude tiebreaker needed (models disagreed initially)
- Example: "Styrelsen består av ordförande Jan Svensson..." → 0.75 for chairman

**Low Confidence (0.40-0.59)**:
- Text is partially visible or unclear (OCR issues)
- Value is ambiguous (multiple interpretations possible)
- Consensus not reached (all 3 models disagree)
- Example: Handwritten signature → 0.50

**No Extraction (<0.40)**:
- Return `null` instead of low-quality guess
- Flag for human review

### 4. Consensus Mechanism

**For EACH field**:
1. **Gemini 2.5 Pro** extracts → `result_gemini`
2. **GPT-4o** extracts → `result_gpt`
3. **Compare**:
   - If `result_gemini == result_gpt` → **DUAL AGREEMENT** (High confidence)
   - If `result_gemini != result_gpt` → Invoke **Claude 3.7 Sonnet** as tiebreaker
4. **Tiebreaker logic**:
   - If Claude agrees with Gemini → Use Gemini's value (Medium confidence)
   - If Claude agrees with GPT → Use GPT's value (Medium confidence)
   - If Claude disagrees with both → Return `null` (Low confidence, no consensus)

**Consensus metadata**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.92,
    "consensus_source": "dual_agreement",
    "model_results": {
      "gemini": 12500,
      "gpt": 12500,
      "claude": null
    }
  }
}
```

### 5. Swedish Format Validation

**Organization numbers**:
- Format: `NNNNNN-NNNN` (6 digits, hyphen, 4 digits)
- Example: `769621-2194`
- Validation: Regex `^\d{6}-\d{4}$`
- If format invalid → flag for review but preserve original string

**Postal codes**:
- Format: `NNN NN` (3 digits, space, 2 digits)
- Example: `115 42`
- Validation: Regex `^\d{3}\s\d{2}$`

**Currency normalization**:
- Input: "12,5 MSEK", "12500 tkr", "12.5 miljoner"
- Output: `12500` (always in tkr)
- Preserve original: `"original_string": "12,5 MSEK"`

**Dates**:
- Fiscal year format: `2023`, `2023/2024`, `2023-07-01 to 2024-06-30`
- Normalize to: `2024` (ending year)
- Validate: Year must be 2023-2025

### 6. Agent Specialization Rules

Each agent MUST:
- Only extract fields in its assigned domain
- Not override other agents' fields
- Focus on specific PDF sections (routing defined by orchestrator)
- Return structured JSON matching schema exactly

**Example: financial_agent**:
- Extracts: 11 _tkr fields (revenue, costs, operating income, etc.)
- Looks in: "Resultaträkning", "Intäkter", "Kostnader" sections
- Ignores: Board member names, property details (other agents' domains)

### 7. Error Handling

**OCR failures**:
- If text is unreadable → return `null`
- Add note: `"extraction_note": "OCR failed, text illegible"`

**Missing sections**:
- If entire section not found → return `null` for all fields in that section
- Example: PDF has no "Energideklaration" → energy_agent returns all nulls

**Conflicting values**:
- If same field appears with different values on different pages → flag both:
  ```json
  {
    "total_revenue_tkr": {
      "value": null,
      "confidence": 0.0,
      "extraction_note": "Conflicting values found: 12500 (p5), 12800 (p7)",
      "evidence_pages": [5, 7]
    }
  }
  ```

### 8. Cross-Field Validation (Auditor Agent)

**Mathematical consistency**:
- `total_assets_tkr == total_liabilities_tkr + total_equity_tkr` (±1% tolerance)
- `net_income_tkr == total_revenue_tkr - total_costs_tkr` (±1% tolerance)
- If inconsistent → flag for review

**Logical consistency**:
- `board_member_count >= 3` (Swedish BRF law requires ≥3 board members)
- `fiscal_year_end >= fiscal_year_start` (chronological)
- `annual_fee_kr > 0` (fees must be positive)

**Format consistency**:
- All `_tkr` fields must be numeric
- All `_date` fields must be valid ISO dates or fiscal years
- All `org_number` fields must match Swedish format

### 9. Transparency & Auditability

**All extraction results must include**:
- `original_string`: Exact text as it appears in PDF
- `evidence_pages`: Where the value was found
- `confidence`: Numeric score (0.0-1.0)
- `consensus_source`: "dual_agreement" | "claude_tiebreaker" | "no_consensus"
- `extraction_note`: Optional human-readable explanation

**Session logs must document**:
- Which agents succeeded vs failed
- Retry attempts and outcomes
- Total API calls and costs
- Duration per agent
- Overall quality metrics

### 10. Quality Gates

**Extraction is REJECTED if**:
- High confidence rate < 70%
- Total cost > $1.50 per PDF
- Schema validation fails
- Critical fields missing (e.g., org_number, fiscal_year)
- Auditor detects >5 cross-field inconsistencies

**Extraction is FLAGGED if**:
- High confidence rate 70-80% (marginal)
- Medium confidence rate > 30% (too many ambiguous fields)
- Low confidence rate > 10% (quality concerns)
- Cost $1.00-1.50 (expensive but acceptable)

**Extraction is ACCEPTED if**:
- High confidence rate ≥ 80%
- Medium confidence rate ≤ 20%
- Low confidence rate ≤ 5%
- Total cost $0.75-1.00
- All quality gates passed

## Implementation Checklist

Before processing ANY PDF:
- [ ] All 19 agent prompts include anti-hallucination rules
- [ ] Consensus mechanism implemented (Gemini + GPT + Claude)
- [ ] Evidence pages tracked for every field
- [ ] Confidence scores calibrated
- [ ] Swedish validators configured
- [ ] Cross-field validation enabled
- [ ] Session logging implemented
- [ ] Quality gates enforced

## Revision History

- **v1.0.0** (2025-11-18): Initial protocol definition
