# Rigor Protocol

**Version**: 1.0.0
**Purpose**: Define extraction quality standards and anti-hallucination rules
**Scope**: All 19 specialist agents in the ground truth generation pipeline

---

## Core Principles

### 1. **ONLY EXTRACT WHAT IS EXPLICITLY VISIBLE**

**Rule**: If a field value is not clearly visible in the document, return `null`.

**Forbidden**:
- ❌ Inferring values from context
- ❌ Calculating values not shown in document
- ❌ Using external knowledge (e.g., "Stockholm BRFs typically...")
- ❌ Copying values from similar fields

**Allowed**:
- ✅ Extracting exact text as shown
- ✅ Normalizing units (e.g., "12,5 MSEK" → 12500 tkr)
- ✅ Standardizing formats (e.g., "2023/2024" → 2024)
- ✅ Converting currencies (only if conversion rate is in document)

---

### 2. **PRESERVE ORIGINAL STRINGS**

**Rule**: Always include `original_string` field showing the exact text from PDF.

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [5],
    "original_string": "12,5 MSEK"
  }
}
```

**Why**: Enables human verification and debugging.

---

### 3. **TRACK EVIDENCE PAGES**

**Rule**: Record the page number(s) where the value was found (1-based indexing).

**Multiple Pages**:
If a value spans multiple pages or is confirmed by multiple sections:
```json
"evidence_pages": [5, 6, 12]
```

**Page Range**:
If a value is in a section spanning pages 10-15:
```json
"evidence_pages": [10, 11, 12, 13, 14, 15]
```

**Why**: Enables rapid manual verification.

---

### 4. **CONFIDENCE SCORING**

**Scale**: 0.0 (no confidence) to 1.0 (absolute certainty)

**Guidelines**:

| Confidence | Criteria | Example |
|------------|----------|---------|
| **0.95-1.0** | Exact match, clearly labeled, unambiguous | "Totala intäkter: 12 500 tkr" in financial table |
| **0.85-0.94** | High certainty, minor ambiguity | Value found in table but label is abbreviated |
| **0.70-0.84** | Moderate certainty, requires interpretation | Value calculated from subtotals |
| **0.50-0.69** | Low certainty, significant ambiguity | Possible match but unclear context |
| **0.0-0.49** | Very low certainty, likely incorrect | Guessing based on similar field |

**Adjust for**:
- **OCR quality**: Blurry/scanned docs → lower confidence
- **Label clarity**: Exact Swedish keyword → higher confidence
- **Consensus**: Multiple models agree → higher confidence

---

### 5. **CONSENSUS MECHANISM**

**Three-Model Consensus**:

1. **Gemini 2.5 Pro** extracts fields → JSON_A
2. **GPT-4o** extracts fields → JSON_B
3. **Compare** JSON_A vs JSON_B:
   - **If AGREE** (values match within 5% for numbers, exact for strings):
     - Mark as `HIGH` confidence
     - Source: `"dual_agreement"`
   - **If DISAGREE**:
     - Call **Claude 3.7 Sonnet** as tiebreaker → JSON_C
     - Choose value with 2/3 consensus
     - Mark as `MEDIUM` confidence
     - Source: `"claude_tiebreaker"`
   - **If NO CONSENSUS** (all three differ):
     - Choose value with highest individual confidence
     - Mark as `LOW` confidence
     - Source: `"no_consensus"`

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.92,
    "source": "dual_agreement",
    "models": {
      "gemini": 12500,
      "gpt4": 12500,
      "claude": null
    }
  }
}
```

---

### 6. **FIELD-LEVEL NULL HANDLING**

**Rule**: Use `null` for missing/not found values. Do NOT use:
- ❌ Empty string `""`
- ❌ Zero `0`
- ❌ Placeholder "N/A"

**When to use null**:
1. Field not present in document
2. Section exists but value is blank/empty
3. Value is illegible (OCR failure)
4. Ambiguity too high to extract confidently

**Example**:
```json
{
  "energy_class": {
    "value": null,
    "confidence": 0.0,
    "evidence_pages": [],
    "original_string": null,
    "reason": "Energy data section not found in document"
  }
}
```

---

### 7. **ANTI-HALLUCINATION RULES**

**Strict Prohibitions**:

1. **NO DEFAULT VALUES**
   - ❌ Don't assume "Stockholm" if location unclear
   - ❌ Don't use "2024" if year not visible
   - ✅ Use `null` instead

2. **NO CALCULATIONS** (unless shown in doc)
   - ❌ Don't compute `total_assets = buildings + cash` unless total is shown
   - ✅ Extract only values explicitly printed

3. **NO EXTERNAL KNOWLEDGE**
   - ❌ Don't use "BRF typically have 20-50 members" to guess `num_members`
   - ✅ Extract only from this specific document

4. **NO CROSS-FIELD INFERENCE**
   - ❌ Don't infer `chairman_name` from `board_members` list
   - ✅ Each field must be independently verified

5. **NO LANGUAGE TRANSLATION** (for names/addresses)
   - ❌ Don't translate "Storgatan" to "Main Street"
   - ✅ Keep original Swedish text

6. **NO UNIT GUESSING**
   - ❌ Don't assume "12,500" means tkr
   - ✅ Only convert if unit is labeled (MSEK, tkr, etc.)

---

### 8. **VALIDATION GATES**

**Each agent must pass validation before output is accepted**:

#### 8.1 Schema Validation
- All required fields present (even if null)
- Field types correct (string, number, boolean, null)
- No extra fields beyond schema

#### 8.2 Format Validation
- `org_number`: NNNNNN-NNNN (6 digits, dash, 4 digits)
- `postal_code`: NNNNN (5 digits)
- `financial_year`: 2020-2025
- All `_tkr` fields: integers or null

#### 8.3 Range Validation
- Confidence scores: 0.0-1.0
- Evidence pages: 1-based, within document length
- Financial values: non-negative (revenue, costs)
- Percentages: 0-100

#### 8.4 Cross-Field Validation
- **Balance Sheet Equation**:
  ```
  total_assets_tkr === total_liabilities_tkr + total_equity_tkr
  ```
  Tolerance: ±1 tkr (rounding)

- **Revenue Components**:
  If components are extracted, they should sum to total:
  ```
  total_revenue_tkr ≈ rent_revenue_tkr + other_revenue_tkr
  ```
  Tolerance: ±5%

---

### 9. **AGENT-SPECIFIC RIGOR**

Each agent has specialized quality checks:

#### Financial Agent
- Must extract at least 8/11 fields (73% threshold)
- All `_tkr` values must be integers
- Must check for currency symbols (MSEK, tkr, kr)
- Must handle Swedish number format (12 500 or 12.500 or 12,500)

#### Balance Sheet Agent
- **MUST VALIDATE** balance equation before returning
- If equation doesn't balance, retry extraction
- Mark as LOW confidence if off by >1 tkr

#### Chairman Agent
- Must extract full name (not just last name)
- Must verify role is "Ordförande" or "Styrelseordförande"
- Must distinguish from board members

#### Board Members Agent
- Must extract list (array) not single name
- Must track count (num_board_members)
- Must exclude chairman from board members list

#### Property Agent
- Must normalize address format
- Must validate postal code format (5 digits)
- Must extract city from address context

---

### 10. **ERROR HANDLING**

**If extraction fails**:

1. **Retry once** with 2x timeout
2. **If still fails**:
   - Return partial results (fields extracted so far)
   - Mark agent as `PARTIAL` status
   - Document failure reason in `error_log`
3. **Never crash** - always return valid JSON (even if all fields are null)

**Example Error Response**:
```json
{
  "agent_id": "balance_sheet_agent",
  "status": "PARTIAL",
  "error_log": "Timeout after 60s - large PDF (150 pages)",
  "fields_extracted": 5,
  "fields_total": 12,
  "data": {
    "total_assets_tkr": { "value": 125000, "confidence": 0.88, ... },
    "total_liabilities_tkr": { "value": null, "confidence": 0.0, ... },
    ...
  }
}
```

---

### 11. **COST CONTROL**

**Per-Agent Budget**: Max $0.10 per agent
**Per-PDF Budget**: Max $1.50 total

**If budget exceeded**:
1. **Warning** at 80% ($1.20 spent)
2. **Abort** remaining agents if >$1.50
3. **Document** cost breakdown in session report

**Token Limits**:
- **Sectionizer**: Max 100K tokens per round
- **Agent extraction**: Max 50K tokens per agent
- **Validation**: Max 10K tokens

---

### 12. **QUALITY METRICS**

**Track for each session**:

| Metric | Target | Threshold |
|--------|--------|-----------|
| Agent success rate | ≥15/19 | ≥10/19 minimum |
| Average confidence | ≥0.85 | ≥0.70 minimum |
| High confidence % | ≥80% | ≥60% minimum |
| Balance sheet accuracy | 100% | Must pass |
| Cross-field validation pass rate | ≥90% | ≥70% minimum |
| Cost per PDF | ≤$1.00 | ≤$1.50 maximum |
| Duration per PDF | ≤10 min | ≤20 min maximum |

**If ANY threshold violated**:
- Mark session as `NEEDS_REVIEW`
- Document issue in session report
- Human review required before using data

---

### 13. **DOCUMENTATION REQUIREMENTS**

**Every extraction must include**:

1. **Session metadata**:
   - Session ID
   - PDF path
   - Start/end timestamps
   - Total duration
   - Total cost

2. **Agent performance**:
   - Success/failure status
   - Fields extracted vs total
   - Average confidence per agent
   - Duration per agent
   - Cost per agent

3. **Validation results**:
   - Balance sheet check: PASS/FAIL
   - Cross-field checks: passed/total
   - Sanity checks: passed/total
   - Warnings/errors encountered

4. **Challenges & learnings**:
   - Non-standard document structures
   - OCR quality issues
   - Missing sections
   - Retry attempts
   - Edge cases discovered

---

### 14. **HUMAN VERIFICATION PROTOCOL**

**Randomly sample 5% of extractions** for human verification:

1. Select random PDF from processed batch
2. Manually verify 10 high-stakes fields:
   - `total_revenue_tkr`
   - `total_assets_tkr`
   - `total_liabilities_tkr`
   - `total_equity_tkr`
   - `chairman_name`
   - `num_members`
   - `org_number`
   - `financial_year`
   - `address`
   - `postal_code`

3. Calculate accuracy: `correct_fields / 10`
4. **If accuracy < 90%**: Flag entire batch for review

---

### 15. **CONTINUOUS IMPROVEMENT**

**After each session**:

1. **Analyze failures**: Why did agents fail?
2. **Update prompts**: Add edge cases to agent definitions
3. **Improve routing**: Better section-to-agent mapping
4. **Refine validation**: Tighter sanity checks
5. **Document learnings**: Update this protocol

**Monthly review**:
- Aggregate all session reports
- Identify patterns in failures
- Update agent prompts with learnings
- Adjust confidence thresholds based on accuracy data

---

## Rigor Checklist

Before marking extraction as COMPLETE, verify:

- [ ] All 19 agents executed (or documented failures)
- [ ] ≥15/19 agents succeeded
- [ ] All fields have confidence scores
- [ ] All extracted values have evidence pages
- [ ] All extracted values have original strings
- [ ] Balance sheet equation validates (±1 tkr)
- [ ] No hallucinated/inferred values
- [ ] Cost within budget (≤$1.50)
- [ ] Duration reasonable (≤20 min)
- [ ] Session report created
- [ ] Learnings documented

---

**Protocol Version**: 1.0.0
**Last Updated**: 2025-11-18
**Compliance**: Mandatory for all autonomous sessions
