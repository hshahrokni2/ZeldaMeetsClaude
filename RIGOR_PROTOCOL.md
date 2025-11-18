# RIGOR PROTOCOL

**Version**: 1.0.0
**Purpose**: Define quality standards and verification procedures for autonomous PDF extraction

---

## CORE PRINCIPLES

### 1. **CORRECTNESS OVER SPEED**
- Accuracy is paramount - Never sacrifice data quality for performance
- Always prefer triple-model consensus over single-model speed
- Retry failed operations before giving up

### 2. **EVIDENCE-BASED EXTRACTION**
- Every extracted field MUST have:
  - Source value (original string from PDF)
  - Evidence pages (1-based page numbers where found)
  - Confidence score (0.0-1.0)
- **NEVER hallucinate data** - If not found, return null

### 3. **TRANSPARENT CONFIDENCE**
- Confidence scores must reflect true uncertainty
- High (>0.85): Dual model agreement + clear evidence
- Medium (0.60-0.85): Tiebreaker used OR single model with clear evidence
- Low (<0.60): Models disagree OR ambiguous evidence

### 4. **SYSTEMATIC VALIDATION**
- All extractions validated against schema
- Cross-field consistency checks (e.g., balance sheet equality)
- Swedish format validation (org numbers, postal codes)
- Financial sanity checks (positive revenue, reasonable ranges)

---

## EXTRACTION RIGOR STANDARDS

### Field-Level Requirements

For EACH extracted field:
```typescript
{
  value: any,                    // Extracted value (typed appropriately)
  confidence: number,            // 0.0-1.0 (REQUIRED)
  evidence_pages: number[],      // 1-based page numbers (REQUIRED if value !== null)
  original_string?: string,      // Original text from PDF (HIGHLY RECOMMENDED)
  extraction_method: string,     // "dual_agreement" | "tiebreaker" | "single_model"
  models_used: string[],         // ["gemini-2.5-pro", "gpt-4o", "claude-3.7-sonnet"]
  consensus_level: string        // "HIGH" | "MEDIUM" | "LOW"
}
```

### Anti-Hallucination Rules

**FORBIDDEN**:
- Guessing values not visible in PDF
- Using default/placeholder values (e.g., "Unknown", "N/A", "TBD")
- Inferring data from context without direct evidence
- Copy-pasting from other PDFs or examples

**REQUIRED**:
- Explicit null return if field not found
- Clear distinction between "not found" (null) and "found but empty" ("")
- Evidence pages MUST point to actual occurrence in PDF
- Original string MUST match visible text in PDF (character-for-character)

### Confidence Scoring Rubric

**High Confidence (0.85-1.0)**:
- Gemini + GPT agree exactly
- Value appears multiple times in PDF (redundancy)
- Clear, unambiguous formatting
- Matches expected Swedish patterns (e.g., "12 500 tkr")

**Medium Confidence (0.60-0.85)**:
- 2 out of 3 models agree (Claude tiebreaker)
- Value appears once but clearly labeled
- Minor formatting variations (e.g., "12,5 MSEK" vs "12500 tkr")
- Requires normalization/parsing

**Low Confidence (0.40-0.60)**:
- Models disagree on value
- Ambiguous context (multiple candidates)
- Inconsistent formatting
- Partial match to expected pattern

**Very Low Confidence (<0.40)**:
- All models disagree
- No clear evidence in PDF
- Contradictory information
- **ACTION**: Return null instead of low-confidence guess

---

## MODEL CONSENSUS PROTOCOL

### Round 1: Gemini 2.5 Pro
**Role**: Primary extractor (strong Swedish language support)

**Prompt Requirements**:
- Include full agent prompt from `agents/{agent_name}.md`
- Provide relevant pages only (not entire PDF)
- Request structured JSON output
- Enforce anti-hallucination rules
- Request confidence scores per field

**Output Validation**:
- Valid JSON structure
- All required fields present (can be null)
- Confidence scores for non-null values
- Evidence pages for non-null values

### Round 2: GPT-4o
**Role**: Secondary extractor (strong numerical extraction)

**Prompt Requirements**:
- IDENTICAL prompt to Gemini (consistency)
- Same page context
- Same JSON schema
- Independent extraction (no Gemini results shown)

**Output Validation**:
- Same validation as Gemini

### Consensus Check
```python
def check_consensus(gemini_output, gpt_output, threshold=0.80):
    """
    Check if Gemini and GPT agree on enough fields to skip Claude.
    """
    total_fields = len(schema_fields)
    agreed_fields = 0

    for field_name in schema_fields:
        gemini_val = gemini_output.get(field_name, {}).get('value')
        gpt_val = gpt_output.get(field_name, {}).get('value')

        # Both null = agreement
        if gemini_val is None and gpt_val is None:
            agreed_fields += 1
            continue

        # One null, one not = disagreement
        if (gemini_val is None) != (gpt_val is None):
            continue

        # Both have values - check equality (with normalization)
        if normalize_value(gemini_val) == normalize_value(gpt_val):
            agreed_fields += 1

    agreement_rate = agreed_fields / total_fields

    if agreement_rate >= threshold:
        return "HIGH", merge_outputs(gemini_output, gpt_output)
    else:
        return "NEEDS_TIEBREAKER", None
```

### Round 3: Claude 3.7 Sonnet (Conditional)
**Role**: Tiebreaker (only if Gemini/GPT disagree)

**Trigger**: Agreement rate < 80%

**Prompt Requirements**:
- Same base prompt as Gemini/GPT
- **ADDITION**: Show Gemini and GPT disagreements
- Ask Claude to adjudicate with reasoning
- Request final confidence adjustments

**Example Tiebreaker Prompt Addition**:
```
The following fields have conflicting values from two models:

Field: total_revenue_tkr
- Gemini: 12500, confidence 0.90, pages [5, 6]
- GPT: 12350, confidence 0.85, pages [5]

Please review the PDF pages and determine:
1. Which value is correct (or if both are wrong)
2. Reasoning for your choice
3. Adjusted confidence score

Return: {"value": 12500, "confidence": 0.88, "reasoning": "Gemini correct, GPT missed 'varav' clause"}
```

### Final Consensus Resolution
```python
def resolve_consensus(gemini, gpt, claude):
    """
    3-way consensus resolution.
    """
    final_output = {}

    for field_name in schema_fields:
        g_val = gemini.get(field_name, {}).get('value')
        gpt_val = gpt.get(field_name, {}).get('value')
        c_val = claude.get(field_name, {}).get('value')

        # Count votes (normalize before comparing)
        votes = {}
        for val, model in [(g_val, 'gemini'), (gpt_val, 'gpt'), (c_val, 'claude')]:
            norm_val = normalize_value(val)
            if norm_val not in votes:
                votes[norm_val] = []
            votes[norm_val].append(model)

        # Majority wins (2 out of 3)
        for val, models in sorted(votes.items(), key=lambda x: len(x[1]), reverse=True):
            if len(models) >= 2:
                final_output[field_name] = {
                    'value': val,
                    'confidence': calculate_confidence(models, gemini, gpt, claude, field_name),
                    'consensus_level': 'MEDIUM',
                    'models_agreed': models
                }
                break

        # No majority (all disagree) → Use Claude's judgment
        if field_name not in final_output:
            final_output[field_name] = {
                'value': c_val,
                'confidence': max(claude.get(field_name, {}).get('confidence', 0.5) - 0.2, 0.3),
                'consensus_level': 'LOW',
                'models_agreed': ['claude_only'],
                'warning': 'All models disagreed - using Claude judgment with reduced confidence'
            }

    return final_output
```

---

## VALIDATION RIGOR

### Schema Validation
**Tool**: `lib/schema-validator.ts`

**Requirements**:
- All outputs must conform to TypeScript schemas in `schemas/`
- Optional fields can be null (but must be present in object)
- Required fields must have values (cannot be null)
- Data types must match (number, string, boolean, etc.)

**Validation Levels**:
- **STRICT**: No deviations allowed (fails extraction)
- **LENIENT** (default): Warnings logged, extraction continues
- **LEARNING**: No validation (for initial development)

### Cross-Field Validation

**Balance Sheet Integrity**:
```python
def validate_balance_sheet(data):
    assets = data.get('total_assets_tkr', {}).get('value')
    liabilities_equity = data.get('total_liabilities_equity_tkr', {}).get('value')

    if assets is None or liabilities_equity is None:
        return {"status": "SKIP", "reason": "Missing required fields"}

    # 5% tolerance for rounding
    tolerance = 0.05
    diff_ratio = abs(assets - liabilities_equity) / max(assets, liabilities_equity)

    if diff_ratio > tolerance:
        return {
            "status": "FAIL",
            "reason": f"Assets ({assets}) != Liabilities+Equity ({liabilities_equity}), diff: {diff_ratio:.2%}",
            "severity": "WARNING"  # Not blocking
        }

    return {"status": "PASS"}
```

**Financial Sanity Checks**:
```python
def validate_financial_sanity(data):
    checks = []

    # Revenue should be positive
    revenue = data.get('total_revenue_tkr', {}).get('value')
    if revenue is not None and revenue <= 0:
        checks.append({"field": "total_revenue_tkr", "status": "FAIL", "reason": "Revenue must be positive"})

    # Operating costs should be positive
    costs = data.get('operating_costs_tkr', {}).get('value')
    if costs is not None and costs <= 0:
        checks.append({"field": "operating_costs_tkr", "status": "FAIL", "reason": "Costs must be positive"})

    # Net result should roughly equal revenue - costs
    net_result = data.get('net_result_tkr', {}).get('value')
    if all(x is not None for x in [revenue, costs, net_result]):
        expected = revenue - costs
        tolerance = 0.10  # 10% tolerance for other items
        diff_ratio = abs(net_result - expected) / max(abs(expected), 1)
        if diff_ratio > tolerance:
            checks.append({
                "field": "net_result_tkr",
                "status": "WARNING",
                "reason": f"Net result ({net_result}) doesn't match revenue - costs ({expected}), diff: {diff_ratio:.2%}"
            })

    return checks
```

**Swedish Format Validation**:
```python
import re

def validate_swedish_formats(data):
    checks = []

    # Org number: NNNNNN-NNNN
    org_number = data.get('org_number', {}).get('value')
    if org_number and not re.match(r'^\d{6}-\d{4}$', org_number):
        checks.append({"field": "org_number", "status": "FAIL", "reason": f"Invalid format: {org_number}"})

    # Postal code: NNN NN
    postal_code = data.get('postal_code', {}).get('value')
    if postal_code and not re.match(r'^\d{3}\s?\d{2}$', postal_code):
        checks.append({"field": "postal_code", "status": "WARNING", "reason": f"Unusual format: {postal_code}"})

    # Phone: +46 or 0 prefix
    phone = data.get('phone', {}).get('value')
    if phone and not re.match(r'^(\+46|0)\d', phone):
        checks.append({"field": "phone", "status": "WARNING", "reason": f"Non-standard format: {phone}"})

    return checks
```

---

## ERROR HANDLING RIGOR

### Retry Strategy

**API Failures**:
```python
def retry_with_exponential_backoff(func, max_attempts=3, base_delay=2):
    """
    Retry failed API calls with exponential backoff.
    """
    for attempt in range(max_attempts):
        try:
            return func()
        except APIError as e:
            if attempt == max_attempts - 1:
                raise  # Final attempt failed
            delay = base_delay * (2 ** attempt)
            log(f"Attempt {attempt+1} failed: {e}. Retrying in {delay}s...")
            time.sleep(delay)
```

**Failure Classification**:
- **TRANSIENT**: Retry immediately (rate limits, timeouts)
- **RETRYABLE**: Retry with backoff (network errors, 500s)
- **FATAL**: Do not retry (auth errors, invalid PDFs)

### Partial Success Handling

**Scenario**: 15 out of 19 agents succeed, 4 fail

**Action**:
1. Save results from successful agents
2. Mark failed agents clearly in output
3. Log failure reasons
4. Set overall status to "PARTIAL"
5. **DO NOT** retry entire PDF - accept partial results
6. Flag for human review if critical agents failed (financial, balance_sheet)

---

## COST MANAGEMENT RIGOR

### Budget Enforcement

**Per PDF Budget**: $1.00 (soft limit), $2.00 (hard limit)

**Tracking**:
```python
class CostTracker:
    def __init__(self, soft_limit=1.00, hard_limit=2.00):
        self.soft_limit = soft_limit
        self.hard_limit = hard_limit
        self.current_cost = 0.0
        self.breakdown = {
            'sectionizer': 0.0,
            'agents': {},
            'validation': 0.0
        }

    def add_cost(self, amount, category, subcategory=None):
        self.current_cost += amount
        if subcategory:
            self.breakdown[category][subcategory] = amount
        else:
            self.breakdown[category] += amount

        # Check limits
        if self.current_cost > self.hard_limit:
            raise CostLimitExceeded(f"Hard limit ${self.hard_limit} exceeded: ${self.current_cost:.2f}")
        elif self.current_cost > self.soft_limit:
            log(f"WARNING: Soft limit ${self.soft_limit} exceeded: ${self.current_cost:.2f}")

    def get_summary(self):
        return {
            'total': self.current_cost,
            'breakdown': self.breakdown,
            'within_budget': self.current_cost <= self.soft_limit
        }
```

### Model Selection Optimization

**Cost-Performance Tradeoffs**:
- **Sectionizer**: Use Gemini 2.0 Flash ($0.01-0.05) instead of Gemini 2.5 Pro
- **Agents Round 1/2**: Use Gemini 2.5 Pro + GPT-4o (balanced cost-accuracy)
- **Tiebreaker**: Only invoke Claude 3.7 Sonnet when needed (saves ~30-40% of cost)

---

## LOGGING RIGOR

### Session Logs

**Location**: `logs/session_{session_id}.log`

**Contents**:
```
[2025-11-18 04:21:46] SESSION_START: session_20251118_042146
[2025-11-18 04:21:47] STEP_1_START: PDF Selection & Lock
[2025-11-18 04:21:48] PDF_SELECTED: pdfs/hjorthagen/brf_79568.pdf
[2025-11-18 04:21:48] LOCK_CREATED: locks/brf_79568.lock
[2025-11-18 04:21:49] STEP_1_COMPLETE: Duration 3s
[2025-11-18 04:21:49] STEP_2_START: PDF Reading & Analysis
[2025-11-18 04:22:15] SECTIONIZER_ROUND_1: 9 L1 sections detected
[2025-11-18 04:22:45] SECTIONIZER_ROUND_2: 57 L2/L3 subsections detected
[2025-11-18 04:22:45] STEP_2_COMPLETE: Duration 56s, Cost $0.04
...
[2025-11-18 04:30:12] AGENT_START: financial_agent
[2025-11-18 04:30:45] AGENT_GEMINI_COMPLETE: 11 fields extracted, avg confidence 0.92
[2025-11-18 04:31:18] AGENT_GPT_COMPLETE: 11 fields extracted, avg confidence 0.89
[2025-11-18 04:31:19] CONSENSUS_CHECK: 10/11 fields agree (90.9%) - HIGH consensus
[2025-11-18 04:31:19] AGENT_COMPLETE: financial_agent, Duration 67s, Cost $0.12
...
[2025-11-18 04:38:56] STEP_3_COMPLETE: 19 agents, Duration 8m 44s, Cost $0.78
[2025-11-18 04:38:57] STEP_4_START: Validation & Quality Checks
[2025-11-18 04:38:58] VALIDATION_PASS: Balance sheet integrity (0.2% diff)
[2025-11-18 04:38:58] VALIDATION_PASS: Financial sanity checks
[2025-11-18 04:38:59] VALIDATION_WARNING: Phone format non-standard
[2025-11-18 04:38:59] STEP_4_COMPLETE: Duration 2s
...
[2025-11-18 04:39:15] SESSION_COMPLETE: Total duration 17m 29s, Total cost $0.85
```

**Log Levels**:
- **INFO**: Normal operations
- **WARNING**: Soft failures, quality issues
- **ERROR**: Hard failures, retries
- **CRITICAL**: Fatal errors, session aborts

---

## QUALITY ASSURANCE CHECKLIST

Before marking extraction as COMPLETE:

- [ ] All 19 agents executed (or documented failures)
- [ ] Consensus level determined for each agent (HIGH/MEDIUM/LOW)
- [ ] Confidence scores assigned to all non-null fields
- [ ] Evidence pages recorded for all non-null fields
- [ ] Original strings captured (where applicable)
- [ ] Schema validation passed (or warnings logged)
- [ ] Cross-field validations executed
- [ ] Cost within budget (<$2.00)
- [ ] Duration reasonable (<20 minutes)
- [ ] Results saved to `results/` directory
- [ ] Learning entry created in `learning/` directory
- [ ] Lock file updated with final status
- [ ] Git commit created
- [ ] Lock file removed (if successful)

---

## CONTINUOUS IMPROVEMENT

### Learning Feedback Loop

After each PDF:
1. Analyze which agents had low confidence
2. Identify common failure patterns
3. Document in learning entry
4. Update meta-analysis at milestones

After meta-analysis (every 10 PDFs):
1. Identify systematic issues (e.g., agent X always struggles with field Y)
2. Consider prompt refinements
3. Consider model changes
4. Update validation rules if needed

---

**Protocol Status**: ✅ ACTIVE
**Last Updated**: 2025-11-18
**Compliance**: MANDATORY for all autonomous sessions
