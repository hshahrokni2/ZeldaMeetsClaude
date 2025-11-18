# Rigor Protocol: Ground Truth Quality Assurance

**Version**: 1.0.0
**Purpose**: Define quality standards for ground truth extraction to ensure 95%+ field-level accuracy

## Overview

Ground truth data must meet strict quality criteria to be useful for DSPy training. This protocol defines validation rules, consensus requirements, and quality gates that must pass before extraction results are committed.

---

## Consensus Requirements

### 3-Model Consensus System

Every field extraction uses 3 models for redundancy and accuracy:

1. **Model 1: Gemini 2.5 Pro** (Primary)
   - Vision + JSON extraction
   - Swedish language handling
   - High accuracy on numerical data

2. **Model 2: GPT-4o** (Secondary)
   - Independent extraction
   - Cross-validation
   - Different reasoning approach

3. **Model 3: Claude 3.7 Sonnet** (Tiebreaker)
   - Only invoked if Model 1 ≠ Model 2
   - Final arbiter
   - Highest reasoning capability

### Confidence Levels

```
┌─────────────────────────────────────────────────────────┐
│  Confidence = f(model_agreement, evidence_strength)     │
└─────────────────────────────────────────────────────────┘

HIGH (0.85-1.0):
  - Gemini + GPT agree exactly
  - Evidence pages clear and unambiguous
  - Data format matches Swedish standards

MEDIUM (0.60-0.84):
  - Claude tiebreaker resolved disagreement
  - Evidence present but requires interpretation
  - Minor format variations

LOW (0.0-0.59):
  - All 3 models disagree significantly
  - Evidence pages unclear or missing
  - Data quality questionable
```

### Consensus Quality Gates

**Required for SUCCESS**:
- ✅ Dual agreement rate ≥ 75% (target: 85-90%)
- ✅ High confidence fields ≥ 70% (target: 80-85%)
- ✅ Unresolved disagreements < 10%

**Triggers WARNING** (proceed but flag):
- ⚠️  Dual agreement rate 60-75%
- ⚠️  High confidence fields 50-70%
- ⚠️  Unresolved disagreements 10-15%

**Triggers FAILURE** (reject extraction):
- ❌ Dual agreement rate < 60%
- ❌ High confidence fields < 50%
- ❌ Unresolved disagreements > 15%

---

## Field-Level Validation

### ExtractionField Structure

Every extracted field must follow this structure:

```typescript
{
  "value": any,                    // Actual data (null allowed)
  "confidence": number,            // 0.0-1.0 (required)
  "evidence_pages": number[],      // 1-based page numbers (required)
  "source": string,                // "dual_agreement" | "claude_tiebreaker" | "low_confidence"
  "original_string": string | null // Original text from PDF (for audit trail)
}
```

### Validation Rules

**1. Value Type Validation**:
- Numerical fields must be numbers (not strings)
- Currency values normalized to thousands (tkr): 12500 not "12,5 MSEK"
- Dates in ISO 8601 format: "2024-06-30"
- Booleans must be true/false (not "ja"/"nej")

**2. Swedish Format Validation**:
- Organization numbers: `NNNNNN-NNNN` (e.g., "769613-6650")
- Postal codes: `NNN NN` (e.g., "115 42")
- Property designations: "Fastighetsbeteckning" format (e.g., "Skytten 2")

**3. Evidence Page Validation**:
- Pages must be 1-based (not 0-indexed)
- Pages must be within PDF bounds (1 to totalPages)
- At least 1 evidence page required (empty array = validation warning)

**4. Confidence Score Validation**:
- Must be number between 0.0 and 1.0
- Must match consensus level:
  - Dual agreement → confidence ≥ 0.85
  - Claude tiebreaker → confidence 0.60-0.84
  - No agreement → confidence < 0.60

**5. Null Handling**:
- Nulls are ALLOWED (not all fields present in every PDF)
- Null value must have confidence = 0.0
- Null value must have source = "not_found" or "not_applicable"

---

## Cross-Field Validation

### Financial Statement Consistency

**Balance Sheet Equation**:
```
REQUIRED: Total Assets = Total Liabilities + Total Equity

Validation:
  difference = abs(assets - (liabilities + equity))
  tolerance = 0.01 * assets  // 1% tolerance for rounding

  if difference > tolerance:
    ❌ CRITICAL ERROR: Balance sheet does not balance
```

**Income Statement Logic**:
```
REQUIRED: Net Income = Total Revenue - Total Expenses

Validation:
  calculated_net_income = revenue - expenses
  reported_net_income = extracted_net_income

  if abs(calculated - reported) > 1.0:  // 1 tkr tolerance
    ⚠️  WARNING: Income statement calculation mismatch
```

### Temporal Consistency

**Fiscal Year**:
```
REQUIRED: 2023 ≤ fiscal_year ≤ 2025

Validation:
  if fiscal_year < 2023 or fiscal_year > 2025:
    ❌ CRITICAL ERROR: Invalid fiscal year
```

**Date Ranges**:
```
REQUIRED: fiscal_year_start < fiscal_year_end

Validation:
  if start >= end:
    ❌ CRITICAL ERROR: Invalid date range
```

### Governance Validation

**Board Members**:
```
REQUIRED: 3 ≤ board_member_count ≤ 15

Validation:
  if count < 3:
    ⚠️  WARNING: Unusually small board
  if count > 15:
    ⚠️  WARNING: Unusually large board
```

**Chairman Present**:
```
REQUIRED: chairman_name must be non-null if board exists

Validation:
  if board_members.length > 0 and chairman_name == null:
    ⚠️  WARNING: Board exists but no chairman found
```

---

## Agent-Level Validation

### Required Agents

Minimum agents that must succeed:

1. ✅ `financial_agent` (11 _tkr fields)
2. ✅ `balance_sheet_agent` (assets, liabilities, equity)
3. ✅ `property_agent` (address, property designation)
4. ✅ `chairman_agent` (chairman name, org number)

**Quality Gate**:
- ✅ Required agents: 4/4 successful
- ✅ Total agents: ≥ 15/19 successful (79% success rate)

**Triggers FAILURE**:
- ❌ Any required agent fails
- ❌ Total agents: < 12/19 successful (< 63%)

### Agent Output Validation

Each agent must return:

```json
{
  "field_1": { /* ExtractionField */ },
  "field_2": { /* ExtractionField */ },
  // ... all expected fields for this agent
}
```

**Validation**:
- ✅ All expected fields present (nulls allowed)
- ✅ All fields wrapped in ExtractionField structure
- ✅ No extra fields (prevents hallucination)

---

## Cost & Performance Validation

### Cost Limits

**Per PDF**:
- ✅ Total cost ≤ $1.50 (target: $0.75-1.00)
- ✅ Sectionizer cost ≤ $0.10
- ✅ Agent execution cost ≤ $1.30

**Per Agent**:
- ✅ Average cost ≤ $0.10 (with 3-model consensus)

**Triggers WARNING**:
- ⚠️  Total cost $1.00-$1.50
- ⚠️  Any single agent > $0.25

**Triggers FAILURE**:
- ❌ Total cost > $1.50

### Duration Limits

**Per PDF**:
- ✅ Total duration ≤ 20 minutes (target: 8-12 min)
- ✅ Sectionizer ≤ 2 minutes
- ✅ Agent execution ≤ 15 minutes
- ✅ Validation ≤ 1 minute

**Triggers WARNING**:
- ⚠️  Total duration 15-20 minutes

**Triggers TIMEOUT FAILURE**:
- ❌ Total duration > 20 minutes

---

## Token Efficiency Validation

### Token Usage Targets

**Sectionizer** (Gemini 2.0 Flash):
- Target: 2,000-5,000 tokens per round (2 rounds)
- Max: 15,000 tokens total

**Agents** (Gemini 2.5 Pro + GPT-4o + Claude 3.7):
- Target: 3,000-8,000 tokens per agent (per model)
- Max: 15,000 tokens per agent per model

**Validation**:
```
if agent_tokens > 15000:
  ⚠️  WARNING: Agent {agentId} used excessive tokens

if total_tokens > 500000:
  ❌ CRITICAL: Total token usage exceeded budget
```

---

## Quality Scoring

### Overall Quality Score

```
quality_score = weighted_average([
  field_coverage_pct * 0.30,      // 30% weight
  high_confidence_pct * 0.30,     // 30% weight
  consensus_rate * 0.25,          // 25% weight
  agent_success_rate * 0.15       // 15% weight
])

Quality Tiers:
  0.85-1.00: ⭐⭐⭐ EXCELLENT (publish immediately)
  0.70-0.84: ⭐⭐  GOOD (review edge cases, publish)
  0.50-0.69: ⭐   FAIR (requires human review)
  0.00-0.49: ❌  POOR (reject, requires debugging)
```

### Quality Gate Decision

```
if quality_score >= 0.70:
  ✅ PASS - Commit to results/
else if quality_score >= 0.50:
  ⚠️  MANUAL REVIEW - Save to sessions/ for review
else:
  ❌ FAIL - Reject extraction, retry or escalate
```

---

## Audit Trail Requirements

### Traceability

Every extraction must preserve:

1. **Model Outputs** (raw JSON from each model):
   - `sessions/{session_id}/model_outputs/gemini.json`
   - `sessions/{session_id}/model_outputs/gpt.json`
   - `sessions/{session_id}/model_outputs/claude.json`

2. **Consensus Decisions**:
   - `sessions/{session_id}/consensus_report.json`
   ```json
   {
     "field_name": "total_revenue_tkr",
     "gemini_value": 12500,
     "gpt_value": 12500,
     "claude_value": null,  // Not invoked (agreement)
     "final_value": 12500,
     "confidence": 0.95,
     "source": "dual_agreement"
   }
   ```

3. **Validation Results**:
   - `sessions/{session_id}/validation_report.json`
   ```json
   {
     "critical_errors": [],
     "warnings": [
       "Balance sheet tolerance: 0.5% difference (within threshold)"
     ],
     "field_level_checks": {
       "total_revenue_tkr": "PASS",
       "fiscal_year": "PASS"
     }
   }
   ```

---

## Error Taxonomy

### Error Categories

**CRITICAL** (block commit):
1. Balance sheet does not balance (> 1% tolerance)
2. Required agent failed
3. Cost exceeded $1.50
4. Duration exceeded 20 minutes
5. Fiscal year invalid (< 2023 or > 2025)

**WARNING** (allow commit, flag for review):
1. High confidence % below 80%
2. Consensus rate below 85%
3. Missing optional fields (> 30% nulls)
4. Board size unusual (< 3 or > 15 members)
5. Cost high but within limit ($1.00-$1.50)

**INFO** (log only):
1. Agent execution order
2. Section routing decisions
3. Token usage per agent
4. Model response times

---

## Quality Improvement Loop

### Learning from Failures

When extraction fails quality gates:

1. **Capture failure context**:
   - Which quality gate failed
   - Agent outputs at failure time
   - PDF characteristics (page count, structure, etc.)

2. **Classify failure type**:
   - Model disagreement (consensus issue)
   - Missing section (routing issue)
   - Invalid data format (prompt issue)
   - Timeout (performance issue)

3. **Document in LEARNINGS.md**:
   ```markdown
   ### FAILURE: session_20251118_150000 | brf_12345.pdf

   **Gate Failed**: Consensus rate too low (55% vs 75% threshold)

   **Root Cause**: Unusual table format in "Noter" section

   **Models Disagreed On**:
   - maintenance_reserve_tkr: Gemini=500, GPT=450, Claude=475
   - depreciation_method: Gemini="linjär", GPT=null, Claude="linjär"

   **Action Items**:
   - Update notes_maintenance_agent prompt with table parsing examples
   - Add retry logic with explicit table extraction instruction
   ```

4. **Update prompts/routing** as needed

---

## Summary: Quality Gates Checklist

Before committing extraction results, verify:

**Consensus**:
- [ ] Dual agreement rate ≥ 75%
- [ ] High confidence fields ≥ 70%
- [ ] Unresolved disagreements < 10%

**Field Coverage**:
- [ ] Fields extracted ≥ 70 (target: 95+)
- [ ] Required agents successful: 4/4
- [ ] Total agents successful: ≥ 15/19

**Cross-Field Validation**:
- [ ] Balance sheet balanced (within 1% tolerance)
- [ ] Income statement consistent
- [ ] Fiscal year valid (2023-2025)

**Cost & Performance**:
- [ ] Total cost ≤ $1.50
- [ ] Total duration ≤ 20 minutes
- [ ] No individual agent timeout

**Audit Trail**:
- [ ] Model outputs preserved
- [ ] Consensus report generated
- [ ] Validation report generated

**Quality Score**:
- [ ] Overall quality score ≥ 0.70

---

**Built for**: Claude Code autonomous execution
**Maintainer**: See repository owner
**Last Updated**: 2025-11-18
