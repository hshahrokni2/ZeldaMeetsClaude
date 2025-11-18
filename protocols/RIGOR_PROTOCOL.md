# Rigor Protocol - Quality Standards for BRF Extraction

**Version**: 1.0.0
**Date**: 2025-11-18
**Purpose**: Ensure maximum accuracy and completeness in BRF data extraction

## Core Principles

### 1. **ACCURACY OVER SPEED**
- Never sacrifice correctness for performance
- Verify every extraction against source document
- Flag uncertain extractions with low confidence scores

### 2. **COMPLETENESS OVER PERFECTION**
- Extract partial data rather than failing completely
- Document what's missing and why
- Graceful degradation for difficult PDFs

### 3. **EVIDENCE-BASED EXTRACTION**
- Every field must reference source page(s)
- Confidence scores based on extraction certainty
- Original text preserved for verification

### 4. **SYSTEMATIC LEARNING**
- Document every failure and edge case
- Track patterns in difficult extractions
- Continuously improve prompts and routing

## Quality Standards

### Field-Level Standards

#### Confidence Scoring (0.0 - 1.0)
- **0.95-1.0** (Excellent): Direct match, clear formatting, unambiguous
- **0.85-0.94** (Good): Clear value, minor formatting inconsistencies
- **0.70-0.84** (Acceptable): Value found but requires interpretation
- **0.50-0.69** (Low): Uncertain extraction, multiple possibilities
- **0.00-0.49** (Very Low): Guessed or highly uncertain

#### Currency Normalization (_tkr fields)
**CRITICAL RULE**: All monetary values must be normalized to thousands (tkr)

**Conversion Table**:
- `"12 500 SEK"` → `12.5` tkr
- `"125 tkr"` → `125.0` tkr
- `"1,25 MSEK"` → `1250.0` tkr
- `"0,125 MSEK"` → `125.0` tkr

**Preserved Original**:
```json
{
  "total_revenue_tkr": 12500.0,
  "total_revenue_tkr_original": "12,5 MSEK",
  "confidence": 0.98,
  "evidence_pages": [5]
}
```

#### Evidence Pages
- **1-indexed** (page 1 is first page)
- **Multiple pages**: List all pages where field appears
- **Empty list**: Field not found in document (null value)

### Agent-Level Standards

#### Success Criteria (Per Agent)
- ✅ **Execution completes** without timeout (60s limit)
- ✅ **Valid JSON** returned (parseable, schema-compliant)
- ✅ **At least 1 field** extracted successfully
- ✅ **Evidence pages** provided for extracted fields

#### Failure Modes
- ❌ **Timeout**: Agent exceeds 60s execution limit
- ❌ **Invalid JSON**: Response cannot be parsed
- ❌ **Empty Response**: Zero fields extracted
- ❌ **Schema Violation**: Response doesn't match expected structure

### Document-Level Standards

#### Minimum Success Threshold
- ✅ **15+/19 agents** complete successfully (79%+)
- ✅ **200+ fields** extracted (out of 500+ possible)
- ✅ **Average confidence** ≥ 0.85
- ✅ **Key fields present**: organization_number, brf_name, fiscal_year, total_revenue_tkr, net_result_tkr

#### Quality Tiers
- **Tier 1 (Excellent)**: 18-19 agents, 300+ fields, 0.90+ avg confidence
- **Tier 2 (Good)**: 16-17 agents, 250+ fields, 0.85+ avg confidence
- **Tier 3 (Acceptable)**: 15 agents, 200+ fields, 0.80+ avg confidence
- **Tier 4 (Partial)**: 12-14 agents, 150+ fields, 0.75+ avg confidence
- **Tier 5 (Failed)**: <12 agents or <150 fields

## Validation Rules

### Schema Validation (Lenient Mode)
- **Allow nulls**: Most fields are optional (Swedish BRFs vary widely)
- **Type checking**: Enforce data types (string, number, date, etc.)
- **Format validation**: Swedish-specific formats (org numbers, postal codes)
- **Warning-based**: Log violations but don't block extraction

### Swedish-Specific Validators

#### Organization Number
**Format**: `NNNNNN-NNNN` (6 digits - 4 digits)
**Validation**: Luhn checksum algorithm
**Examples**:
- ✅ `702001-1234` (valid BRF)
- ✅ `769605-3456` (valid BRF)
- ❌ `123456-7890` (invalid checksum)

#### Postal Code
**Format**: `NNN NN` (3 digits space 2 digits)
**Examples**:
- ✅ `114 28` (Stockholm)
- ✅ `211 12` (Malmö)
- ❌ `11428` (missing space)

#### Swedish Date Formats
**Accepted formats**:
- `2024-12-31` (ISO 8601)
- `2024-12` (year-month)
- `31 december 2024` (Swedish long form)
- `2024` (year only)

### Confidence Validation

#### Automatic Confidence Adjustment
Confidence scores are automatically adjusted based on:
1. **Multi-model consensus** (ground truth mode):
   - All 3 models agree → confidence +0.10
   - 2/3 models agree → confidence unchanged
   - No consensus → confidence -0.15

2. **Evidence quality**:
   - Multiple pages → confidence +0.05
   - Clear section match → confidence +0.05
   - OCR/scan quality poor → confidence -0.10

3. **Field complexity**:
   - Simple direct extraction → confidence +0.05
   - Requires calculation → confidence -0.05
   - Requires interpretation → confidence -0.10

## Error Handling

### Graceful Degradation Strategy

#### Level 1: Retry with Same Model
- **Trigger**: Timeout or transient error
- **Action**: Retry once with 90s timeout
- **Fallback**: Proceed to Level 2

#### Level 2: Fallback Model
- **Trigger**: Primary model fails twice
- **Action**: Switch to fallback model
  - Primary: `google/gemini-2.5-pro`
  - Fallback: `anthropic/claude-3.5-sonnet`
- **Fallback**: Proceed to Level 3

#### Level 3: Partial Extraction
- **Trigger**: Both models fail
- **Action**: Mark agent as failed, continue with other agents
- **Documentation**: Log failure reason in learning notes

#### Level 4: Document Failure
- **Trigger**: <12 agents succeed
- **Action**: Save partial results with `status: "failed"`
- **Documentation**: Generate failure report with diagnostics

### Error Categorization

#### Transient Errors (Retry)
- API timeout (429, 503, 504)
- Network errors
- Rate limiting

#### Permanent Errors (Skip)
- Invalid API key (401)
- Model not found (404)
- Malformed request (400)

#### Document Errors (Partial)
- Unsupported PDF format
- Encrypted/password-protected
- Corrupted file

## Learning & Improvement

### Per-Session Learning Documentation

#### Template: `learning/session_{id}_learning.md`

```markdown
# Learning Report - Session {session_id}

**PDF**: {pdf_filename}
**Date**: {timestamp}
**Status**: {success/partial/failed}
**Agents**: {completed}/{total} successful

## What Worked ✅
- {Agent X} extracted {N} fields with {avg_confidence} confidence
- Clear section structure enabled accurate routing
- {Specific insight about successful extraction}

## What Failed ❌
- {Agent Y} failed due to {reason}
- {Field Z} consistently missing across multiple agents
- {Document-specific challenge}

## Edge Cases 🔍
- {Unusual format or structure}
- {Non-standard terminology}
- {Missing expected sections}

## Improvements 💡
- Suggested prompt adjustment for {Agent X}
- Consider adding fallback routing for {Section Y}
- New validation rule for {Field Z}

## Performance 📊
- **Duration**: {N} minutes
- **Cost**: ${X.XX}
- **Tokens**: {N} total
- **Avg Confidence**: {0.XX}

## Raw Metrics
{JSON object with detailed metrics}
```

### Meta-Analysis (Every 10 PDFs)

#### Template: `meta-analysis/meta_analysis_{count}.md`

```markdown
# Meta-Analysis Report - {count} PDFs Processed

**Date**: {timestamp}
**PDFs Analyzed**: {N}
**Period**: {start_date} to {end_date}

## Aggregate Success Rates
- **Overall Success**: {N}/{total} ({percentage}%)
- **Average Agents/PDF**: {avg} ({min}-{max})
- **Average Fields/PDF**: {avg} ({min}-{max})
- **Average Confidence**: {avg} ({min}-{max})

## Agent Performance Ranking
1. {agent_1}: {success_rate}% success, {avg_fields} fields avg
2. {agent_2}: {success_rate}% success, {avg_fields} fields avg
...
19. {agent_19}: {success_rate}% success, {avg_fields} fields avg

## Systematic Failures
### Fields Consistently Missing
- {field_1}: Missing in {N}/{total} PDFs ({percentage}%)
- {field_2}: Missing in {N}/{total} PDFs ({percentage}%)

### Agent-Specific Issues
- {Agent X}: Fails on {document_type} documents ({N} cases)
- {Agent Y}: Low confidence on {field_type} fields ({avg_confidence})

## Cost & Performance Trends
- **Total Cost**: ${XX.XX}
- **Cost/PDF**: ${X.XX} ({min}-{max})
- **Total Tokens**: {N}M
- **Avg Duration/PDF**: {N} minutes

## Document Complexity Correlation
- **visual_summary** ({N} docs): {success_rate}%, {avg_cost}
- **financial_heavy** ({N} docs): {success_rate}%, {avg_cost}
- **comprehensive_report** ({N} docs): {success_rate}%, {avg_cost}

## Recommendations
1. {Specific improvement for pipeline}
2. {Specific improvement for agents}
3. {Specific improvement for validation}

## Action Items
- [ ] {Concrete action based on analysis}
- [ ] {Concrete action based on analysis}
```

## Anti-Hallucination Measures

### Rule 1: Only Extract What You See
- ✅ **Extract**: Values directly visible in document
- ❌ **Never**: Infer, calculate, or guess missing values
- ❌ **Never**: Use knowledge from other documents

### Rule 2: Null is Valid
- ✅ **Use null**: When field is not present
- ❌ **Don't guess**: Don't use default values or placeholders
- ❌ **Don't skip**: Return null explicitly, not empty string

### Rule 3: Preserve Original Text
- ✅ **Include**: `_original` field for all _tkr values
- ✅ **Exact text**: Copy verbatim, including formatting
- ✅ **Multi-line**: Preserve line breaks if present

### Rule 4: Evidence Required
- ✅ **Page numbers**: Required for non-null fields
- ✅ **Multiple pages**: List all pages where value appears
- ❌ **Zero pages**: Don't return evidence_pages: []

### Rule 5: Confidence Honesty
- ✅ **Low confidence**: Better than false high confidence
- ✅ **Document uncertainty**: Explain in learning notes
- ❌ **Overconfidence**: Never default to 1.0 confidence

## Testing & Verification

### Spot Checks (Manual)
- **Frequency**: First 3 PDFs, then every 10th
- **Sample Size**: 10 random fields per PDF
- **Verification**: Compare extracted value against source page
- **Threshold**: 95%+ accuracy required

### Automated Validation
- **Schema compliance**: 100% (blocking)
- **Swedish format validation**: 95%+ (warning)
- **Confidence distribution**: Bell curve centered at 0.85
- **Evidence coverage**: 90%+ fields have evidence_pages

### Regression Testing
- **Test Set**: 3 reference PDFs (simple, medium, complex)
- **Frequency**: After any prompt or routing changes
- **Threshold**: No degradation in success rate or field count

---

**Protocol Status**: ✅ ACTIVE
**Last Updated**: 2025-11-18
**Compliance**: Mandatory for all autonomous sessions
