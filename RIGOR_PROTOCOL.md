# Rigor Protocol - Ground Truth Quality Assurance

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Purpose**: Ensure maximum accuracy and reliability of extracted ground truth data

## Core Principles

### 1. Evidence-Based Extraction
**Rule**: Never hallucinate. Extract only what is explicitly visible.

**Implementation**:
- Every field must have `evidence_pages` array
- Every value must have `original_string` from PDF
- If not found: Set to null, don't guess

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [5, 6],
    "original_string": "12,5 MSEK",
    "source": "dual_agreement"
  }
}
```

### 2. Consensus Over Speed
**Rule**: Three models are better than one.

**Implementation**:
- Primary: Gemini 2.5 Pro (vision + reasoning)
- Secondary: GPT-4o (cross-validation)
- Tiebreaker: Claude 3.7 Sonnet (final arbiter)

**Confidence Assignment**:
- `confidence: 0.90-1.00` → Dual agreement (Gemini + GPT)
- `confidence: 0.70-0.89` → Tiebreaker resolved (Claude)
- `confidence: 0.50-0.69` → Weak agreement
- `confidence: 0.00-0.49` → No consensus (flag for review)

### 3. Currency Normalization Rigor
**Rule**: Always preserve original units AND normalize to tkr.

**Why**: Swedish documents use mixed units (SEK, tkr, MSEK, millions)

**Required Fields** (for all _tkr fields):
- `[field]_tkr`: Normalized numeric value in thousands
- `[field]_tkr_original`: Exact string from PDF

**Conversion Table**:
```
Input                Output (_tkr)     Original String
---------------------------------------------------------
"12,5 MSEK"          12500            "12,5 MSEK"
"450 tkr"            450              "450 tkr"
"2 150 000 SEK"      2150             "2 150 000 SEK"
"3.2 miljoner"       3200             "3.2 miljoner"
"1 234,56 tkr"       1234.56          "1 234,56 tkr"
```

**Validation**:
- Never mix units in same field
- Always check for Swedish number format (comma = decimal)
- Flag if original string missing

### 4. Swedish Format Awareness
**Rule**: Respect Swedish conventions.

**Number Formats**:
- Thousand separator: Space (1 234 567)
- Decimal separator: Comma (123,45)
- Dates: YYYY-MM-DD

**Organization Numbers**:
- Format: NNNNNN-NNNN (769601-0097)
- Always include hyphen
- Validate check digit

**Postal Codes**:
- Format: NNN NN (112 51)
- Always include space
- Stockholm: 100-199
- Gothenburg: 400-499
- Malmö: 200-299

### 5. Cross-Field Validation
**Rule**: Numbers must balance.

**Balance Sheet Identity**:
```
Assets = Liabilities + Equity
```

**Income Statement Check**:
```
Total Revenue = Sum of revenue components
Total Costs = Sum of cost components
Net Result = Total Revenue - Total Costs
```

**Validation Actions**:
1. Calculate expected vs actual
2. If difference > 1%: Flag as `validation_warning`
3. If difference > 5%: Mark as `validation_error`
4. Log discrepancy with evidence pages

### 6. Temporal Consistency
**Rule**: Dates and years must be coherent.

**Checks**:
- Fiscal year matches report year (±1)
- Report date > previous year's report date
- AGM date typically 3-6 months after fiscal year end
- Audit date within 6 months of fiscal year end

**Example**:
```
Fiscal year: 2023
Report date: 2024-03-15 ✅
AGM date: 2024-04-22 ✅
Audit date: 2024-03-01 ✅
```

### 7. Completeness Scoring
**Rule**: Measure and report what's missing.

**Scoring Formula**:
```
Completeness = (Extracted Fields / Total Possible Fields) × 100%
```

**Tiers**:
- **Essential**: 25 core fields (must have >90%)
- **Standard**: 70 common fields (target >80%)
- **Comprehensive**: 95 all fields (bonus if >70%)

**Essential Fields**:
1. fiscal_year
2. brf_name
3. organization_number
4. total_revenue_tkr
5. total_costs_tkr
6. net_result_tkr
7. total_assets_tkr
8. total_liabilities_tkr
9. total_equity_tkr
10. chairman_name
11. board_members (list)
12. auditor_name
13. auditor_organization
14. number_of_apartments
15. annual_fee_average_tkr
... (25 total)

### 8. Confidence Calibration
**Rule**: Confidence must reflect true accuracy.

**Calibration Guidelines**:

**0.95-1.00 (Very High)**:
- Exact match in both models
- Clear, unambiguous text
- Standard format
- No calculation required

**0.85-0.94 (High)**:
- Dual agreement with minor formatting differences
- Clear context
- Simple calculation verified

**0.70-0.84 (Medium)**:
- Tiebreaker needed
- Ambiguous phrasing
- Requires inference from context

**0.50-0.69 (Low)**:
- Weak agreement
- Complex calculation
- Conflicting sources in document

**0.00-0.49 (Very Low)**:
- No consensus
- Missing data
- Contradictory evidence

### 9. Error Propagation Tracking
**Rule**: Track how errors compound.

**Implementation**:
- If field A is used to calculate field B, track dependency
- If field A has LOW confidence, field B inherits at most MEDIUM
- Log dependency chain in metadata

**Example**:
```json
{
  "field": "debt_ratio",
  "value": 0.65,
  "confidence": 0.75,
  "dependencies": [
    {"field": "total_liabilities_tkr", "confidence": 0.92},
    {"field": "total_assets_tkr", "confidence": 0.88}
  ],
  "confidence_note": "Limited by lower asset confidence"
}
```

### 10. Human Review Flags
**Rule**: Clearly mark what needs human verification.

**Auto-Flag Conditions**:
1. Confidence < 0.70
2. Validation error (>5% discrepancy)
3. Missing essential field
4. Date inconsistency
5. Format violation
6. Consensus failure (no agreement)

**Flag Format**:
```json
{
  "field": "total_revenue_tkr",
  "value": 12500,
  "confidence": 0.62,
  "flags": [
    {
      "type": "low_confidence",
      "severity": "warning",
      "message": "No dual agreement, tiebreaker inconclusive",
      "review_priority": "medium"
    }
  ]
}
```

## Quality Metrics

### Per-PDF Metrics
1. **Extraction Coverage**: % of fields successfully extracted
2. **High Confidence Rate**: % of fields with confidence > 0.85
3. **Validation Pass Rate**: % passing cross-field validation
4. **Essential Field Coverage**: % of 25 essential fields extracted
5. **Agent Success Rate**: N/19 agents completed

### Target Thresholds
- Extraction Coverage: >85%
- High Confidence Rate: >75%
- Validation Pass Rate: >90%
- Essential Field Coverage: >95%
- Agent Success Rate: >15/19 (79%)

### Overall Quality Score
```
Quality Score = (
  0.30 × Essential Field Coverage +
  0.25 × High Confidence Rate +
  0.25 × Validation Pass Rate +
  0.20 × Extraction Coverage
)
```

**Interpretation**:
- 0.90-1.00: Excellent (production ready)
- 0.80-0.89: Good (minor review needed)
- 0.70-0.79: Fair (human review recommended)
- <0.70: Poor (significant issues)

## Failure Mode Handling

### Expected Failures (Acceptable)
1. **Optional field missing**: Confidence = 0, flag = "not_found"
2. **Low-priority field ambiguous**: Confidence = 0.5-0.7, flag = "review"
3. **Minor validation warning**: <5% discrepancy

### Unexpected Failures (Investigate)
1. **Essential field missing**: Flag = "critical_error"
2. **Major validation error**: >5% balance sheet discrepancy
3. **Systematic extraction failure**: Multiple agents fail on same document

### Recovery Actions
1. **Retry with higher context**: Provide more pages to agent
2. **Manual section identification**: Override automatic routing
3. **Alternative model**: Try different LLM combination
4. **Partial acceptance**: Accept result with quality score caveat

## Documentation Requirements

### Per-Session Documentation
Each extraction session must produce:

1. **Summary Report** (`summary.json`):
   - Overall quality score
   - Per-agent performance
   - Flags and warnings
   - Cost and time metrics

2. **Learning Documentation** (`learnings.md`):
   - Document characteristics
   - Extraction challenges
   - Successful strategies
   - Recommendations

3. **Validation Report** (`validation.json`):
   - Cross-field checks
   - Sanity test results
   - Flagged fields
   - Review priorities

### Meta-Analysis Documentation
Every 10 PDFs, produce:

1. **Trend Analysis**:
   - Quality score trajectory
   - Common failure patterns
   - Model performance comparison

2. **Field Statistics**:
   - Success rate by field
   - Average confidence by field
   - Most challenging fields

3. **Improvement Recommendations**:
   - Agent prompt refinements
   - Routing rule updates
   - Schema adjustments

## Continuous Improvement

### Feedback Loop
1. **Track**: Log all extractions with ground truth
2. **Measure**: Calculate accuracy against human verification
3. **Analyze**: Identify systematic errors
4. **Refine**: Update agent prompts and routing rules
5. **Deploy**: Implement improvements
6. **Repeat**: Continuous iteration

### Version Control
- **Schema versions**: Semantic versioning (v1.0.0, v1.1.0)
- **Agent prompt versions**: Date-based (2025-11-18)
- **Protocol versions**: Track in this document header

### Quality Audit Trail
Every extraction includes:
- Session ID
- Schema version
- Agent prompt versions used
- Model versions used
- Extraction timestamp
- Git commit hash (when committed)

## Rigor Checklist

Before marking a PDF as "completed":
- [ ] All 19 agents executed (or documented failure)
- [ ] Quality score calculated and >0.85
- [ ] Essential fields checked (>95% coverage)
- [ ] Cross-field validation passed
- [ ] Evidence pages recorded for all values
- [ ] Original strings captured for all _tkr fields
- [ ] Confidence scores assigned to all fields
- [ ] Flags generated for low-confidence fields
- [ ] Learnings documented
- [ ] Results validated against schema
- [ ] Git commit with descriptive message

---

**Remember**: Ground truth is only valuable if it's accurate. Rigor over speed. Evidence over inference. Quality over quantity.
