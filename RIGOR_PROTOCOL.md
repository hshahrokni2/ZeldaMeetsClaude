# Rigor Protocol v1.0

## Purpose
Define extraction quality standards to ensure 95%+ field-level accuracy for ground truth generation.

## Core Principles

### 1. Evidence-Based Extraction
**Rule**: Only extract data that is explicitly visible in the PDF.
- ❌ NO assumptions or inferences
- ❌ NO calculations unless shown in document
- ❌ NO hallucinations or guesses
- ✅ YES to verbatim text with page references

**Example**:
- PDF shows: "Årsavgift: 45,000 kr" on page 3
- ✅ Extract: `{value: 45000, confidence: 0.95, evidence_pages: [3], original_string: "45,000 kr"}`
- ❌ Don't: Calculate yearly fees from monthly amounts not shown

### 2. Confidence Scoring Standards

#### HIGH Confidence (0.90-1.0)
Required conditions:
- Value explicitly stated in expected section
- Clear labeling (e.g., "Årsavgift:", "Intäkter:")
- No ambiguity in interpretation
- Confirmed by at least 2 LLM agents in agreement

Example: Revenue stated as "12,500,000 kr" in "Intäkter" section

#### MEDIUM Confidence (0.70-0.89)
Conditions:
- Value found but requires interpretation
- Label is ambiguous or non-standard
- Only 1 agent confirmation, or tiebreaker needed
- Data in unexpected section but clearly relevant

Example: Revenue split across multiple line items that need summing

#### LOW Confidence (0.50-0.69)
Conditions:
- Unclear or contradictory data
- Extraction required inference
- Found in wrong section
- No agreement between agents

Example: Revenue mentioned in footnote without clear label

#### NULL (No extraction)
When to return NULL:
- Data not found in PDF
- All agents returned NULL
- Confidence would be <0.50

### 3. Swedish Format Validation

#### Organization Numbers
Format: `NNNNNN-NNNN` (6 digits, hyphen, 4 digits)
- Example: `123456-7890`
- Validate checksum if possible
- Allow with/without hyphen in extraction

#### Postal Codes
Format: `NNN NN` (3 digits, space, 2 digits)
- Example: `123 45`
- Always include space in output
- Handle missing space in source

#### Currency
- Primary unit: **tkr** (thousands of SEK)
- Normalize all values to tkr:
  - "12,5 Mkr" → 12500 tkr
  - "45 000 kr" → 45 tkr
  - "0,5 Mkr" → 500 tkr
- Store original string in `_original` field
- Confidence: 0.95 if explicit, 0.80 if normalized

#### Dates
- Format: ISO 8601 (YYYY-MM-DD)
- Fiscal year: Store as year integer (2023, 2024)
- Period: Store start and end dates
- Example: `{"fiscal_year": 2023, "period_start": "2023-01-01", "period_end": "2023-12-31"}`

### 4. Consensus Mechanism

#### Three-Agent System
For each field:
1. **Gemini 2.5 Pro** extracts → JSON₁
2. **GPT-4o** extracts → JSON₂
3. **Claude 3.7 Sonnet** acts as tiebreaker (if needed) → JSON₃

#### Decision Rules

**Scenario A: Dual Agreement (85-90% of cases)**
- Gemini and GPT extract same value
- Result: Use agreed value, set `consensus: "HIGH"`, `confidence: 0.95`
- Source: `"dual_agreement"`

**Scenario B: Disagreement + Tiebreaker (10-15% of cases)**
- Gemini ≠ GPT
- Invoke Claude as tiebreaker
- Result: Use Claude's value, set `consensus: "MEDIUM"`, `confidence: 0.80`
- Source: `"tiebreaker_claude"`

**Scenario C: No Agreement (<5% of cases)**
- All three agents return different values
- Result: Return NULL, set `consensus: "LOW"`, `confidence: 0.50`
- Source: `"no_consensus"`
- Flag for manual review

**Scenario D: All NULL (valid for missing data)**
- All agents return NULL
- Result: NULL (correct), `consensus: "HIGH"`, `confidence: 1.0`
- Source: `"confirmed_missing"`

### 5. Page Evidence Tracking

**Rule**: Every extracted field MUST include page numbers (1-based).

Format:
```json
{
  "evidence_pages": [5, 6],  // Pages where data was found
  "primary_page": 5          // Main page with clearest evidence
}
```

**Why**:
- Enables human verification
- Supports active learning feedback
- Identifies extraction patterns

### 6. Field-Level Validation

#### Financial Fields (11 _tkr fields)
- Must be numeric (integer or float)
- Range: 0 to 1,000,000 tkr (0 to 1 billion SEK)
- Allow negative for losses/deficits
- Check: `assets_total_tkr == liabilities_total_tkr + equity_total_tkr`

#### Text Fields
- Max length: 500 characters (except notes: 2000 chars)
- Trim whitespace
- Normalize Swedish characters (å, ä, ö)
- Remove excessive newlines

#### Dates
- Fiscal year: 2020-2025 (current valid range)
- Ensure period_start < period_end
- Default to calendar year if not specified

#### Enums
- Energy class: A-G only
- Heating type: Known Swedish types (e.g., "Fjärrvärme", "Bergvärme")
- Auditor title: Valid Swedish auditor credentials

### 7. Cross-Field Validation

After extraction, validate:

1. **Balance Sheet Identity**:
   ```
   Assets = Liabilities + Equity
   Tolerance: ±1 tkr (rounding)
   ```

2. **Revenue Reasonableness**:
   ```
   Total Revenue > 0
   Total Revenue < 1,000,000 tkr (1B SEK is upper bound)
   ```

3. **Date Consistency**:
   ```
   Fiscal year matches report year
   Board member terms within fiscal year
   ```

4. **Address Validation**:
   ```
   If city provided, should match known Swedish cities
   Postal code region should match city
   ```

### 8. Error Handling

#### Extraction Failures
If agent fails (timeout, API error, rate limit):
- Retry with exponential backoff: 2s, 5s, 10s
- Max 3 retries per agent
- If all retries fail: Return NULL for that agent's fields
- Continue with remaining agents

#### Malformed PDFs
If PDF is corrupted or unreadable:
- Mark session as `"failed"`
- Document error in session report
- Skip to next PDF
- Add to manual review queue

#### Rate Limits
- Respect API rate limits (10 req/min for OpenRouter)
- Use batching (18 agents per batch)
- Implement queue with delays between batches

### 9. Cost Control

**Per-PDF Budget**: $0.50 - $1.50

Breakdown:
- Vision sectionization: $0.05 (Gemini Flash)
- Consensus extraction: $0.40-$1.00 (Gemini Pro + GPT-4o)
- Tiebreaker (if needed): $0.05-$0.30 (Claude Sonnet)
- Validation: $0.05 (rule-based, minimal LLM)

**Abort Conditions**:
- If cost exceeds $2.00 → Stop and flag
- If >50% agents fail → Stop and review
- If >15 minutes elapsed → Timeout and retry

### 10. Quality Metrics (Per Session)

Track and report:
- **Field Coverage**: % of schema fields extracted (target: 80%+)
- **High Confidence %**: % of fields with confidence >0.90 (target: 85%+)
- **Consensus Rate**: % of dual agreements (target: 85%+)
- **Validation Pass Rate**: % of cross-field checks passing (target: 95%+)
- **Cost Efficiency**: $/field extracted (target: <$0.02/field)
- **Duration**: Total extraction time (target: <15 min)

### 11. Output Quality Checklist

Before marking extraction as complete, verify:

- [ ] All 19 agents executed successfully
- [ ] Consensus determined for every field
- [ ] Confidence scores assigned (0.0-1.0)
- [ ] Evidence pages recorded (1-based)
- [ ] Original strings preserved (_original fields)
- [ ] Schema validation passes
- [ ] Cross-field validation passes
- [ ] Cost within budget (<$1.50)
- [ ] Duration within limit (<20 min)
- [ ] Output JSON is valid and complete

### 12. Continuous Improvement

After each session:
1. Analyze low confidence fields → Identify patterns
2. Review agent disagreements → Update prompts if needed
3. Track extraction time by agent → Optimize slow agents
4. Monitor cost trends → Adjust model usage
5. Update LEARNINGS.md with insights

## Rigor Levels

### Level 1: Standard (Current)
- 3-agent consensus
- Cross-field validation
- Evidence tracking
- Target: 90% accuracy

### Level 2: Enhanced (Future)
- 5-agent consensus (add additional models)
- Human-in-the-loop for low confidence
- Active learning feedback
- Target: 95% accuracy

### Level 3: Research (Experimental)
- Ensemble with fine-tuned models
- Multi-pass extraction with refinement
- External data validation (e.g., corporate registry)
- Target: 98% accuracy

## Protocol Version
- **Current**: 1.0
- **Level**: Standard
- **Last Updated**: 2025-11-18
- **Target Accuracy**: 90-95%
