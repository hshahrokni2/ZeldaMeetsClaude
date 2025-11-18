# Rigor Protocol - Evidence-Based Extraction

## Version: 1.0.0
## Last Updated: 2025-11-18

---

## Purpose

Ensure all extracted data meets research-grade quality standards through systematic validation, evidence tracking, and confidence scoring.

---

## Core Principles

### 1. Evidence-Based Extraction

**Rule**: Every extracted field MUST be traceable to specific page(s) in the source PDF.

```typescript
interface ExtractionField<T> {
  value: T | null;
  confidence: number;           // 0.0-1.0
  evidence_pages: number[];     // 1-indexed page numbers
  original_string?: string;     // EXACT text from PDF
  source: 'gemini' | 'gpt' | 'claude' | 'dual_agreement' | 'consensus';
}
```

**Requirements**:
- ✅ `evidence_pages` must contain at least one page number (if value is non-null)
- ✅ `original_string` must be provided for all currency/numeric fields
- ✅ `source` must indicate which model(s) provided the value

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

### 2. Confidence Scoring

**Confidence Levels**:

| Level | Score | Criteria | Usage |
|-------|-------|----------|-------|
| **HIGH** | 0.90-1.00 | Dual agreement (Gemini + GPT match exactly) | Direct use in training |
| **MEDIUM** | 0.75-0.89 | Claude tiebreaker selected one model's answer | Use with validation |
| **LOW** | 0.50-0.74 | Models disagree, best-guess selected | Flagged for review |
| **NULL** | 0.00 | Field not found in PDF | Explicitly null |

**Consensus Rules**:

```typescript
function calculateConsensus(
  geminiValue: any,
  gptValue: any,
  claudeValue?: any
): ExtractionField {
  // Case 1: Dual agreement (highest confidence)
  if (deepEqual(geminiValue, gptValue)) {
    return {
      value: geminiValue,
      confidence: 0.95,
      source: 'dual_agreement'
    };
  }

  // Case 2: Claude tiebreaker (medium confidence)
  if (claudeValue) {
    return {
      value: claudeValue,
      confidence: 0.80,
      source: 'consensus'
    };
  }

  // Case 3: No agreement (low confidence, pick Gemini as fallback)
  return {
    value: geminiValue,
    confidence: 0.60,
    source: 'gemini'
  };
}
```

### 3. Null Handling

**Philosophy**: Null is a valid value meaning "not found in PDF", distinct from missing/error.

**Rules**:
- ✅ Use `null` when field is explicitly not present in PDF
- ✅ Use `null` when section is missing (e.g., no energy certificate)
- ❌ Never use empty strings `""` - use `null` instead
- ❌ Never use placeholder values like `0`, `"N/A"`, `"unknown"`

**Example**:
```json
{
  "energy_class": {
    "value": null,
    "confidence": 0.90,
    "evidence_pages": [],
    "original_string": null,
    "source": "dual_agreement"
  }
}
```

Interpretation: Both Gemini and GPT agreed this field is not in the PDF (high confidence null).

### 4. Currency Normalization

**Requirement**: All `_tkr` fields MUST include original string for auditability.

**Normalization Rules**:
- "12,5 MSEK" → 12500 tkr
- "450 tkr" → 450 tkr
- "2 150 000 SEK" → 2150 tkr
- "3.2 miljoner" → 3200 tkr

**Example**:
```json
{
  "total_costs_tkr": {
    "value": 8750,
    "confidence": 0.92,
    "evidence_pages": [6],
    "original_string": "8,75 MSEK",
    "source": "dual_agreement"
  }
}
```

---

## Validation Layers

### Layer 1: Schema Validation

**Tool**: Zod / Pydantic schemas

**Checks**:
- ✅ All required fields present
- ✅ Field types correct (number, string, boolean, null)
- ✅ Nested structures valid
- ✅ No extra/unknown fields

**Mode**: LENIENT
- Warnings for missing optional fields
- Errors only for type mismatches
- Allow nulls everywhere

### Layer 2: Sanity Checks

**Cross-Field Validation**:

```typescript
const sanityChecks = [
  // Balance sheet equation
  {
    name: 'Balance Sheet Equation',
    rule: 'total_assets ≈ total_liabilities + total_equity',
    tolerance: 0.01, // 1% difference allowed
  },

  // Revenue > 0 for active BRFs
  {
    name: 'Positive Revenue',
    rule: 'total_revenue_tkr > 0',
    severity: 'warning', // Not all PDFs have complete financials
  },

  // Year is recent
  {
    name: 'Recent Year',
    rule: 'year >= 2020 && year <= 2025',
    severity: 'error',
  },

  // Swedish org number format
  {
    name: 'Org Number Format',
    rule: '/^\\d{6}-\\d{4}$/.test(org_number)',
    severity: 'warning',
  },
];
```

**Execution**:
- Run after all agents complete
- Log warnings (don't block)
- Flag critical errors for review
- Include in quality score calculation

### Layer 3: Evidence Verification

**Checks**:
- ✅ Evidence pages are within PDF page count
- ✅ Evidence pages are not empty arrays for non-null values
- ✅ Evidence pages are sorted ascending
- ✅ Page numbers are 1-indexed (not 0-indexed)

**Example Validation**:
```typescript
function validateEvidence(
  field: ExtractionField,
  totalPages: number
): ValidationResult {
  if (field.value !== null && field.evidence_pages.length === 0) {
    return { valid: false, error: 'Non-null value missing evidence pages' };
  }

  for (const page of field.evidence_pages) {
    if (page < 1 || page > totalPages) {
      return { valid: false, error: `Invalid page ${page} (total: ${totalPages})` };
    }
  }

  return { valid: true };
}
```

---

## Quality Scoring

### Per-Field Quality

```typescript
function calculateFieldQuality(field: ExtractionField): number {
  let score = 0;

  // Component 1: Confidence (50%)
  score += field.confidence * 0.5;

  // Component 2: Evidence presence (25%)
  if (field.value !== null && field.evidence_pages.length > 0) {
    score += 0.25;
  }

  // Component 3: Original string (25%) - for currency fields
  if (field.original_string) {
    score += 0.25;
  } else if (!field.value || field.value === null) {
    score += 0.25; // Nulls don't need original strings
  }

  return score;
}
```

### Per-Agent Quality

```typescript
function calculateAgentQuality(agentResult: AgentResult): number {
  const fields = Object.values(agentResult.data);
  const fieldScores = fields.map(calculateFieldQuality);

  return fieldScores.reduce((a, b) => a + b, 0) / fields.length;
}
```

### Overall PDF Quality

```typescript
function calculatePDFQuality(allAgentResults: AgentResult[]): number {
  const agentScores = allAgentResults.map(calculateAgentQuality);
  const avgScore = agentScores.reduce((a, b) => a + b, 0) / agentScores.length;

  // Penalty for failed agents
  const successRate = allAgentResults.filter(a => a.success).length / 19;

  return avgScore * successRate;
}
```

**Thresholds**:
- ✅ **Excellent**: ≥0.90 (use directly for training)
- ✅ **Good**: 0.75-0.89 (use with validation)
- ⚠️ **Acceptable**: 0.60-0.74 (flag for review)
- ❌ **Poor**: <0.60 (reject, schedule manual extraction)

---

## Anti-Hallucination Rules

### Rule 1: Only Extract What You See

**Prohibition**: Never infer, calculate, or guess values not explicitly visible in the PDF.

**Examples**:

❌ **Wrong**: Inferring "net_result_tkr" by subtracting costs from revenue
```json
{
  "net_result_tkr": {
    "value": 3750, // Calculated: 12500 - 8750
    "confidence": 0.80,
    "evidence_pages": [5, 6],
    "original_string": null
  }
}
```

✅ **Correct**: Only extract if explicitly stated
```json
{
  "net_result_tkr": {
    "value": null,
    "confidence": 0.95,
    "evidence_pages": [],
    "original_string": null,
    "source": "dual_agreement"
  }
}
```

### Rule 2: Prefer Null Over Guessing

**Philosophy**: High-confidence nulls are more valuable than low-confidence guesses.

**Scenarios**:
- Section missing → `null` with `confidence: 0.90`
- Text unclear → `null` with `confidence: 0.70`
- Multiple conflicting values → `null` with `confidence: 0.50`

### Rule 3: Original Strings Are Sacred

**Requirement**: Copy EXACTLY as shown, including:
- Swedish characters (å, ä, ö)
- Whitespace and formatting
- Currency symbols and abbreviations

**Example**:
```json
{
  "original_string": "2 150 000 SEK" // NOT "2150000 SEK" or "2,150,000 SEK"
}
```

---

## Consensus Mechanism

### 3-Model Pipeline (Ground Truth Mode)

```
┌─────────────────────────────────────────────┐
│ Step 1: Gemini 2.5 Pro extracts → JSON A   │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Step 2: GPT-4o extracts → JSON B            │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Step 3: Compare field-by-field              │
│   - If A == B: HIGH confidence              │
│   - If A ≠ B: Call Claude 3.7 Sonnet       │
│     - Claude picks A, B, or null            │
│     - Result: MEDIUM confidence             │
└─────────────────────────────────────────────┘
```

### 2-Model Pipeline (Fast Mode)

```
┌─────────────────────────────────────────────┐
│ Step 1: Gemini 2.5 Pro extracts → JSON A   │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Step 2: GPT-4o extracts → JSON B            │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Step 3: Compare field-by-field              │
│   - If A == B: HIGH confidence              │
│   - If A ≠ B: Pick Gemini (LOW confidence)  │
└─────────────────────────────────────────────┘
```

**Cost**: Ground Truth mode adds ~$0.15/PDF for Claude tiebreaker (only when needed).

---

## Traceability

### Required Metadata

Every extraction result MUST include:

```typescript
interface ExtractionMetadata {
  // Extraction details
  pdfId: string;                   // From filename
  pdfPath: string;                 // Full path
  sessionId: string;               // session_YYYYMMDD_HHMMSS
  timestamp: string;               // ISO 8601

  // Model details
  models: {
    sectionizer: string;           // "google/gemini-2.0-flash"
    agents: string;                // "google/gemini-2.5-pro"
    consensus?: string;            // "anthropic/claude-3.7-sonnet" (if used)
  };

  // Execution metrics
  totalAgents: number;             // 19
  successfulAgents: number;        // 15-19
  failedAgents: number;            // 0-4
  totalTokens: number;
  totalCost: number;
  duration: number;                // milliseconds

  // Quality metrics
  qualityScore: number;            // 0.0-1.0
  highConfidenceFields: number;    // confidence >= 0.90
  mediumConfidenceFields: number;  // 0.75-0.89
  lowConfidenceFields: number;     // < 0.75

  // Linkage (for database integration)
  brfId?: string | null;           // From filename
  propertyDesignation?: string | null; // From PDF
  brfName?: string | null;         // From PDF
  city?: string | null;            // From PDF
}
```

---

## Learning & Iteration

### After Each PDF

**Required Analysis**:
1. Which agents performed best? (quality score, success rate)
2. Which fields had highest/lowest confidence?
3. Were there parsing errors? (JSON repair needed?)
4. Did sanity checks fail? (why?)
5. Cost vs budget (on track for $0.75-1.00/PDF?)

**Documentation**: `learning/session_{ID}_{PDFID}.md`

### After Every 10 PDFs

**Meta-Analysis**:
1. Agent performance trends
2. Cost optimization opportunities
3. Quality degradation/improvement
4. Common failure patterns
5. Recommendations for next 10

**Documentation**: `meta_analysis/meta_analysis_{N}pdfs_{DATE}.md`

---

## Version Control

### Commit After Each PDF

```bash
git add results/{PDFID}_ground_truth.json
git add learning/session_{ID}_{PDFID}.md
git add processing_state.json
git commit -m "feat(extraction): Complete PDF {N}/62 - {BRF_NAME}

Session: {SESSION_ID}
Quality: {SCORE}
Cost: ${COST}
"
```

### Push After Each Session

```bash
git push -u origin claude/autonomous-pdf-processing-{SESSION_ID}
```

---

## Compliance Checklist

Before marking a PDF as "completed", verify:

- [ ] All 19 agents executed (or failures documented)
- [ ] Result JSON validates against schema
- [ ] All non-null fields have evidence pages
- [ ] All currency fields have original strings
- [ ] Confidence scores calculated correctly
- [ ] Quality score ≥ 0.75 (or marked as "low quality")
- [ ] Sanity checks logged (passed or warnings noted)
- [ ] Learning documentation generated
- [ ] Processing state updated
- [ ] Git commit created
- [ ] Lock released

---

**Protocol Version**: 1.0.0
**Effective Date**: 2025-11-18
**Maintained By**: Claude (autonomous)
