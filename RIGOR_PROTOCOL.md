# Rigor Protocol - Quality Standards for Ground Truth Extraction

**Version**: 1.0.0
**Purpose**: Ensure production-grade accuracy and consistency across all extractions

---

## Core Principles

### 1. Evidence-Based Extraction
**Rule**: Every field must have verifiable evidence from the PDF

✅ **CORRECT**:
```json
{
  "total_revenue_tkr": {
    "value": 8542,
    "confidence": 0.95,
    "evidence_pages": [12],
    "evidence_text": "Summa intäkter: 8 542 tkr"
  }
}
```

❌ **WRONG** (no evidence):
```json
{
  "total_revenue_tkr": {
    "value": 8542,
    "confidence": 0.95,
    "evidence_pages": [],
    "evidence_text": null
  }
}
```

### 2. Conservative Confidence Scoring
**Rule**: When in doubt, lower the confidence. Overconfidence is worse than uncertainty.

**Confidence Scale**:
- `0.95-1.0`: Direct exact match, unambiguous, verified by multiple models
- `0.85-0.94`: Clear evidence, minor formatting variations
- `0.70-0.84`: Inferred from context, reasonable certainty
- `0.50-0.69`: Weak evidence, multiple interpretations possible
- `0.30-0.49`: Speculative, educated guess
- `0.0-0.29`: No evidence, placeholder value

**Example Scenarios**:
- Field labeled "Totala intäkter: 5 432 tkr" → confidence: 0.98
- Field in table without header, inferred from position → confidence: 0.75
- Field mentioned in text but value unclear → confidence: 0.45
- Field not found anywhere → confidence: 0.0, value: null

### 3. Null Over Hallucination
**Rule**: If a field is not found, mark it as `null`. NEVER invent data.

✅ **CORRECT**:
```json
{
  "heating_system": {
    "value": null,
    "confidence": 0.0,
    "evidence_pages": [],
    "evidence_text": "Field not found in document"
  }
}
```

❌ **WRONG** (hallucinated):
```json
{
  "heating_system": {
    "value": "Fjärrvärme",
    "confidence": 0.6,
    "evidence_pages": [8],
    "evidence_text": "Assumed based on Stockholm location"
  }
}
```

### 4. Consensus Requirement for Critical Fields

**Critical Fields** (must have high confidence):
- `brf_name` (BRF name)
- `org_number` (Organization number)
- `year` (Annual report year)
- `total_revenue_tkr` (Total revenue)
- `total_costs_tkr` (Total costs)
- `assets_tkr` (Total assets)
- `liabilities_tkr` (Total liabilities)
- `equity_tkr` (Equity)

**Consensus Rules**:
- **HIGH confidence** (≥0.85): Requires agreement from at least 2/3 models (Gemini + GPT, or Gemini + Claude, or GPT + Claude)
- **MEDIUM confidence** (0.70-0.84): Single model extraction, cross-validated with document structure
- **LOW confidence** (<0.70): Single model extraction, no cross-validation

**If critical field has confidence < 0.85**: Flag entire PDF for manual review

### 5. Format Validation

**Swedish-Specific Formats**:

| Field | Format | Example | Validation Rule |
|-------|--------|---------|-----------------|
| `org_number` | NNNNNN-NNNN | 769601-1965 | 6 digits + hyphen + 4 digits |
| `postal_code` | NNN NN | 115 42 | 3 digits + space + 2 digits |
| `year` | YYYY | 2023 | 2020 ≤ year ≤ 2025 |
| `*_tkr` fields | Integer | 5432 | Must be integer, no decimals |
| `phone` | NNN-NNNNNNN | 08-12345678 | Area code + hyphen + number |

**Validation Actions**:
- Format mismatch → confidence capped at 0.70
- Invalid format → reject value, set to `null`

### 6. Cross-Field Consistency

**Mandatory Consistency Checks**:

1. **Balance Sheet Equation**:
   ```
   assets_tkr = liabilities_tkr + equity_tkr (±5% tolerance)
   ```
   If violated: Flag all three fields with warning, reduce confidence by 0.1

2. **Profit Calculation**:
   ```
   profit_loss_tkr ≈ total_revenue_tkr - total_costs_tkr (±10% tolerance)
   ```
   If violated: Flag fields, investigate in notes

3. **Date Consistency**:
   ```
   report_period_start < report_period_end
   report_period_end.year = year
   ```

4. **Board Composition**:
   ```
   chairman_name must appear in board_members array
   ```

5. **Geographic Consistency**:
   ```
   postal_code must match city (Stockholm = 1XX XX, Malmö = 2XX XX, etc.)
   ```

**Inconsistency Handling**:
- Minor (<10% deviation): Document in validation_report, proceed
- Major (≥10% deviation): Flag PDF for manual review, reduce all related field confidences

---

## Agent-Specific Quality Standards

### Financial Agent
**Expected Field Coverage**: ≥90% (11 _tkr fields)
**Critical Fields**: All revenue and cost fields
**Validation**:
- All _tkr values must be integers
- total_revenue_tkr ≥ sum of component revenues
- total_costs_tkr ≥ sum of component costs

### Balance Sheet Agent
**Expected Field Coverage**: ≥85% (assets, liabilities, equity)
**Critical Fields**: All three balance sheet components
**Validation**:
- Balance sheet equation must hold (±5%)
- All _tkr values non-negative

### Chairman Agent
**Expected Field Coverage**: ≥95%
**Critical Fields**: chairman_name, chairman_phone
**Validation**:
- Name format: "Firstname Lastname" (Swedish characters allowed)
- Phone format: Valid Swedish number

### Board Members Agent
**Expected Field Coverage**: ≥80%
**Critical Fields**: Array of board members
**Validation**:
- At least 3 board members (legal minimum)
- Chairman must be in list
- No duplicate names

### Auditor Agent
**Expected Field Coverage**: ≥90%
**Critical Fields**: auditor_name, auditor_firm
**Validation**:
- Firm must be known Swedish auditing firm (e.g., PwC, EY, Deloitte, KPMG, BDO, Grant Thornton)

### Property Agent
**Expected Field Coverage**: ≥70%
**Critical Fields**: address, postal_code, city
**Validation**:
- Postal code matches city
- Address format: "Street NN, NNN NN City"

---

## Quality Gates

### Gate 1: Agent Execution (per agent)
**Pass Criteria**:
- Agent completes without critical errors
- At least 50% of target fields extracted
- JSON parseable and validates against schema

**Fail Actions**:
- Log error in errors.json
- Continue to next agent
- Flag PDF if >5 agents fail

### Gate 2: Field Coverage (overall)
**Pass Criteria**:
- Overall field coverage ≥ 60%
- All critical fields present (≥8/10 critical fields)
- No more than 30% null fields

**Fail Actions**:
- Mark PDF quality as LOW
- Flag for manual review
- Document in learning_notes.md

### Gate 3: Confidence Threshold (overall)
**Pass Criteria**:
- Average confidence ≥ 0.75
- Critical fields average confidence ≥ 0.85
- No more than 20% of fields with confidence < 0.6

**Fail Actions**:
- Mark PDF quality as LOW or MEDIUM
- Detailed breakdown in validation_report.json

### Gate 4: Validation Checks (overall)
**Pass Criteria**:
- Balance sheet equation holds (±5%)
- No format validation errors on critical fields
- Cross-field consistency maintained

**Fail Actions**:
- Document inconsistencies in validation_report.json
- Reduce quality tier by one level (HIGH → MEDIUM, MEDIUM → LOW)

---

## Error Classification

### Critical Errors (stop processing)
1. **PDF Unreadable**: File corrupted, password protected
2. **Schema Violation**: Final JSON doesn't match BRF schema structure
3. **All Agents Failed**: 0/19 agents completed successfully
4. **Missing Critical Fields**: <5/10 critical fields extracted

**Action**: Mark PDF as `failed`, unlock, move to next PDF

### Major Errors (continue with warnings)
1. **Low Field Coverage**: <60% fields extracted
2. **Low Confidence**: Average confidence <0.70
3. **Validation Failures**: Balance sheet doesn't balance, format errors
4. **Agent Failures**: 5-9/19 agents failed

**Action**: Mark quality as LOW, flag for manual review, continue processing

### Minor Errors (log and continue)
1. **Missing Optional Fields**: Non-critical fields missing
2. **Low Individual Confidence**: Single field <0.6
3. **Formatting Warnings**: Minor deviations from expected format

**Action**: Log in validation_report.json, continue processing

---

## Model-Specific Calibration

### Gemini 2.5 Pro
**Strengths**: Swedish text understanding, numerical accuracy, table extraction
**Weaknesses**: Sometimes over-confident on unclear fields
**Calibration**: Reduce confidence by 0.05 if evidence is indirect

### GPT-4o
**Strengths**: Consistent formatting, good tiebreaker, reliable JSON output
**Weaknesses**: Occasionally misses Swedish special characters (å, ä, ö)
**Calibration**: Increase confidence by 0.05 if Swedish text is correctly formatted

### Claude 3.7 Sonnet
**Strengths**: Excellent reasoning, best tiebreaker, cautious confidence scoring
**Weaknesses**: More expensive, only used as tiebreaker
**Calibration**: Trust Claude's confidence scores as-is (most accurate)

### Consensus Weighting
When models disagree:
1. **Gemini + GPT agree**: Use their value, confidence = 0.90
2. **Gemini + Claude agree**: Use their value, confidence = 0.92 (Claude boost)
3. **GPT + Claude agree**: Use their value, confidence = 0.93 (Claude boost)
4. **All three disagree**: Use Claude's value (most reliable), confidence = 0.65

---

## Learning Feedback Loop

### After Each PDF
**Capture**:
1. Which fields had lowest confidence? Why?
2. Which agents struggled most? Root cause?
3. Any recurring patterns in errors?
4. Cost vs. quality tradeoff: Worth it?

**Output**: `sessions/{session_id}/learning_notes.md`

### After Every 10 PDFs
**Analyze**:
1. Average confidence by field (top 10 easiest, top 10 hardest)
2. Agent success rates (which agents need prompt improvements?)
3. Model comparison (is GPT outperforming Gemini on certain fields?)
4. Cost efficiency (can we reduce API calls without losing quality?)

**Output**: `meta_analysis/milestone_{count}.md`

### Protocol Improvements
**Trigger**: If average confidence < 0.80 for 3 consecutive PDFs
**Action**: Review and update agent prompts, add new validation rules, adjust confidence calibration

---

## Acceptance Criteria for Production Use

A PDF extraction is **production-ready** when:
1. ✅ Field coverage ≥ 80%
2. ✅ Average confidence ≥ 0.85
3. ✅ All critical fields present with confidence ≥ 0.85
4. ✅ Balance sheet equation holds (±5%)
5. ✅ No critical errors
6. ✅ At least 16/19 agents succeeded
7. ✅ All format validations pass
8. ✅ Quality tier = HIGH

**Use Cases**:
- **Training data for DSPy**: Only use HIGH quality extractions
- **Production deployment**: HIGH + MEDIUM quality acceptable
- **Manual review queue**: All LOW quality extractions

---

**Status**: Protocol v1.0.0 - Ready for autonomous execution
