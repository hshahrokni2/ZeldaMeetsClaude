# RIGOR PROTOCOL

**Version**: 1.0.0
**Purpose**: Enforce extraction accuracy and reliability standards
**Scope**: Quality control for ground truth generation

---

## CORE PRINCIPLES

### 1. ZERO HALLUCINATION TOLERANCE

**Rule**: ONLY extract data that is explicitly visible in the PDF

**Enforcement**:
- Every extracted value MUST have evidence page(s)
- If a field is not found, return `null` (do NOT guess)
- Confidence must reflect actual text presence, not inference

**Anti-Hallucination Checks**:
```typescript
// ✅ CORRECT
{
  "chairman_name": {
    "value": "Anna Svensson",
    "confidence": 0.95,
    "evidence_pages": [3],
    "original_string": "Styrelseordförande: Anna Svensson"
  }
}

// ❌ WRONG (guessed value)
{
  "chairman_name": {
    "value": "Unknown",
    "confidence": 0.5,
    "evidence_pages": [],
    "original_string": null
  }
}

// ✅ CORRECT (field not found)
{
  "chairman_name": null
}
```

---

### 2. CONSENSUS-DRIVEN EXTRACTION

**Rule**: Never rely on a single model's output

**Three-Model System**:
1. **Gemini 2.5 Pro** - Primary extractor (strong vision + Swedish)
2. **GPT-4o** - Secondary extractor (validation + cross-check)
3. **Claude 3.7 Sonnet** - Tiebreaker (only when Gemini ≠ GPT-4o)

**Confidence Levels**:
- **HIGH** (0.9-1.0): Gemini + GPT-4o agree exactly
- **MEDIUM** (0.6-0.89): Claude tiebreaker used, 2/3 models agree
- **LOW** (0.0-0.59): No consensus, all 3 models disagree

**Consensus Algorithm**:
```python
def compute_consensus(gemini_value, gpt_value, field_name):
    if gemini_value == gpt_value:
        return {
            "value": gemini_value,
            "confidence": 0.95,
            "source": "dual_agreement"
        }
    else:
        claude_value = run_claude_tiebreaker(field_name)

        # Count votes
        votes = [gemini_value, gpt_value, claude_value]
        most_common = max(set(votes), key=votes.count)

        if votes.count(most_common) >= 2:
            return {
                "value": most_common,
                "confidence": 0.75,
                "source": "tiebreaker_consensus"
            }
        else:
            return {
                "value": gemini_value,  # Fallback to Gemini
                "confidence": 0.40,
                "source": "no_consensus"
            }
```

---

### 3. EVIDENCE-BASED EXTRACTION

**Rule**: Every field must cite source pages

**Requirements**:
- Page numbers are 1-based (NOT 0-based)
- Multiple pages allowed (e.g., `[5, 6, 12]`)
- Empty array is FORBIDDEN (must have ≥1 page OR field is null)

**Validation**:
```typescript
function validateEvidence(field: ExtractionField) {
    if (field.value !== null) {
        assert(field.evidence_pages.length > 0, "Non-null value requires evidence pages");
        assert(field.evidence_pages.every(p => p >= 1), "Page numbers must be 1-based");
    }
}
```

---

### 4. ORIGINAL STRING PRESERVATION

**Rule**: Always preserve the exact text as it appears in the PDF

**Purpose**:
- Enable human verification
- Debug extraction errors
- Train future models with ground truth

**Format**:
```typescript
{
  "total_revenue_tkr": {
    "value": 12500,              // Normalized to integer
    "confidence": 0.95,
    "evidence_pages": [5],
    "original_string": "12,5 MSEK"  // Exact Swedish format
  }
}
```

**Normalization Rules**:
- Currency: `"12,5 MSEK"` → `12500` (convert to tkr)
- Dates: `"2023-12-31"` → `2023` (extract year only)
- Boolean: `"Ja"` → `true`, `"Nej"` → `false`
- Names: Preserve case and diacritics (`"Ö"`, `"Å"`, `"Ä"`)

---

### 5. LENIENT SCHEMA VALIDATION

**Rule**: Validation must be forgiving of real-world data

**Principles**:
- Optional fields: 90% of fields are optional (nulls allowed)
- No strict enums: Avoid hardcoded value lists (e.g., city names)
- Flexible formats: Accept variations (`"123 45"` or `"12345"`)

**Schema Design**:
```typescript
// ✅ LENIENT
interface PropertyData {
  building_year?: number | null;  // Optional, nulls allowed
  energy_class?: string | null;   // Any string, not enum
  postal_code?: string | null;    // Flexible format
}

// ❌ TOO STRICT
interface PropertyData {
  building_year: number;           // Required, no nulls
  energy_class: "A" | "B" | "C";  // Enum, fails on "A+"
  postal_code: string;             // Regex validation, brittle
}
```

**Validation Layers**:
1. **Type validation**: Correct TypeScript types
2. **Format validation**: Swedish-specific patterns (org numbers, postal codes)
3. **Cross-field validation**: Balance sheet equality, date ranges
4. **Sanity checks**: Revenue > 0, year ≤ 2024

---

### 6. CROSS-FIELD CONSISTENCY

**Rule**: Related fields must be mathematically consistent

**Key Validations**:

#### Balance Sheet Equality
```typescript
assert(
  assets_tkr === liabilities_tkr + equity_tkr,
  "Balance sheet must balance"
);
```

#### Financial Sanity Checks
```typescript
assert(total_revenue_tkr > 0, "Revenue must be positive");
assert(total_costs_tkr > 0, "Costs must be positive");
assert(net_income_tkr === total_revenue_tkr - total_costs_tkr, "Net income mismatch");
```

#### Date Consistency
```typescript
assert(year >= 2020 && year <= 2024, "Year out of range");
assert(building_year <= year, "Building year cannot be in the future");
```

---

### 7. COST EFFICIENCY

**Rule**: Minimize API costs while maintaining accuracy

**Cost Targets**:
- **Per PDF**: $0.60-1.00
- **Batch (20 PDFs)**: $12-20

**Optimization Strategies**:
1. **Model Selection**:
   - Sectionizer: Gemini 2.0 Flash (cheap, fast)
   - Agents: Gemini 2.5 Pro + GPT-4o (balance cost/accuracy)
   - Tiebreaker: Claude 3.7 Sonnet (only when needed)

2. **Page Range Optimization**:
   - Only send relevant pages to each agent
   - Avoid full-PDF processing per agent
   - Example: `financial_agent` only sees pages 5-12

3. **Batch Execution**:
   - Run 18 agents in parallel (not 19 sequential)
   - Reuse sectionization results across agents

4. **Early Termination**:
   - Skip tiebreaker if dual agreement
   - Abort agent if 3 retries fail

**Cost Tracking**:
```json
{
  "total_cost": 0.84,
  "breakdown": {
    "gemini_flash": 0.05,
    "gemini_pro": 0.42,
    "gpt_4o": 0.35,
    "claude_sonnet": 0.02
  },
  "token_usage": {
    "gemini": 125000,
    "gpt": 98000,
    "claude": 12000
  }
}
```

---

### 8. ERROR RECOVERY

**Rule**: Gracefully handle failures without aborting entire pipeline

**Recovery Strategies**:

#### Agent Timeout
- Retry up to 3 times with exponential backoff
- If still fails, mark agent as failed
- Continue with remaining agents
- Flag session as "partial" if <18/19 succeed

#### API Rate Limits
- Exponential backoff: 2s → 4s → 8s → 16s
- Switch to backup API key (OpenRouter)
- Log rate limit events for future optimization

#### Invalid Response
- Log malformed JSON to session log
- Retry with stricter prompt
- If still invalid, return null for that agent

#### Network Failures
- Retry up to 4 times (network operations)
- Log all retry attempts
- Abort only on critical errors (auth, disk space)

**Failure Thresholds**:
- **Acceptable**: 1-2 agents fail (18/19 succeed)
- **Warning**: 3-4 agents fail (15-17/19 succeed)
- **Critical**: 5+ agents fail (mark session as failed)

---

### 9. DETERMINISTIC OUTPUT

**Rule**: Same PDF should produce same results (within reason)

**Sources of Non-Determinism**:
- LLM temperature (set to 0.0)
- Random agent order (use alphabetical)
- Async race conditions (use sequential batches)

**Reproducibility Requirements**:
```typescript
const llmConfig = {
  temperature: 0.0,           // Deterministic sampling
  top_p: 1.0,                 // No nucleus sampling
  seed: 42,                   // Fixed seed (where supported)
  max_tokens: 4000,           // Consistent truncation
};
```

**Acceptable Variance**:
- Minor confidence score differences (±0.05)
- Tiebreaker outcomes (if models genuinely disagree)
- Timestamp/session ID metadata

---

### 10. COMPREHENSIVE LOGGING

**Rule**: Log every action, decision, and error

**Log Levels**:
- **INFO**: Stage transitions, agent completions
- **WARN**: Retries, low confidence fields, tiebreakers
- **ERROR**: Agent failures, validation errors, API errors
- **DEBUG**: Token counts, timings, intermediate results

**Session Log Format**:
```
[2025-11-18 14:30:22] INFO  Session session_20251118_143022 started
[2025-11-18 14:30:23] INFO  PDF locked: 267197_årsredovisning_norrköping_brf_axet_4.pdf
[2025-11-18 14:30:45] INFO  Sectionization complete: 9 L1 sections, 52 L2/L3 subsections
[2025-11-18 14:31:12] INFO  Agent financial_agent: dual_agreement (confidence: 0.95)
[2025-11-18 14:31:34] WARN  Agent energy_agent: tiebreaker needed (Gemini=null, GPT="B")
[2025-11-18 14:32:01] ERROR Agent loans_agent: timeout after 60s, retrying (attempt 1/3)
[2025-11-18 14:32:45] INFO  Agent loans_agent: success on retry 2
[2025-11-18 14:39:10] INFO  Validation complete: 95 fields, 78 high confidence
[2025-11-18 14:39:12] INFO  Session complete: 19/19 agents succeeded, quality=0.89
```

---

## QUALITY GATES

### Gate 1: Schema Validation
- All agent outputs conform to TypeScript schemas
- No type mismatches (string vs number)
- **Abort if**: Schema validation fails

### Gate 2: Confidence Threshold
- Average confidence ≥ 0.75
- High confidence fields ≥ 70% of total
- **Flag if**: Avg confidence < 0.60

### Gate 3: Agent Success Rate
- 18+ agents succeed
- Critical agents must succeed: `financial_agent`, `balance_sheet_agent`
- **Abort if**: <15 agents succeed OR critical agents fail

### Gate 4: Cross-Validation
- Balance sheet balances (within 1 tkr tolerance)
- Net income = revenue - costs (within 5 tkr tolerance)
- **Flag if**: Cross-validation fails

---

## MANUAL REVIEW TRIGGERS

Flag for human review if:
1. **Low confidence**: ≥10 fields with confidence <0.60
2. **No consensus**: ≥5 fields with 3-way disagreement
3. **Cross-validation failure**: Balance sheet doesn't balance
4. **Missing critical data**: Org number, BRF name, or year is null
5. **Agent failure cascade**: ≥3 agents failed

**Review Process**:
1. Generate review report: `review-needed/[session_id].md`
2. List all flagged fields with evidence pages
3. Provide links to PDF sections for verification
4. Do NOT auto-correct (human must decide)

---

## CONFIDENCE CALIBRATION

**Goal**: Confidence scores should match actual accuracy

**Calibration Rules**:
- **0.95+**: Exact match across all models, clear text evidence
- **0.85-0.94**: Dual agreement, minor formatting variations
- **0.70-0.84**: Tiebreaker used, 2/3 models agree
- **0.50-0.69**: Weak consensus, ambiguous text
- **<0.50**: No consensus, conflicting evidence

**Post-Processing**:
- Adjust confidence based on field type:
  - Financial fields: +5% if cross-validation passes
  - Names: -10% if non-ASCII characters present
  - Dates: +10% if ISO format detected

---

## SUCCESS METRICS

**Per-Session Targets**:
- ✅ 18+ agents succeed
- ✅ Avg confidence ≥ 0.75
- ✅ High confidence ≥ 70% of fields
- ✅ Cost ≤ $1.00
- ✅ Duration ≤ 15 minutes

**Batch Targets** (20 PDFs):
- ✅ Success rate ≥ 90% (≥18/20 PDFs)
- ✅ Avg quality score ≥ 0.80
- ✅ Total cost ≤ $20
- ✅ Total duration ≤ 5 hours

---

**End of Protocol**
