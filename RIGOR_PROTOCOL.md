# Rigor Protocol for Ground Truth Extraction

**Version**: 1.0.0
**Purpose**: Ensure maximum accuracy and reliability in BRF annual report extraction

---

## Core Principles

### 1. Anti-Hallucination Rules

**CRITICAL**: Never invent, infer, or estimate data not explicitly visible in the document.

```
✅ CORRECT:
- "Styrelseordförande: Anders Svensson" (visible in document)
- "Årsavgift: 4,500 kr/kvm" (explicit in table)
- Confidence: 0.95 (exact match, clear evidence)

❌ WRONG:
- Inventing names not in document
- Calculating fields not explicitly stated
- Inferring data from partial information
- Using common patterns from other documents
```

**If data is ambiguous or missing**:
- Set field to `null`
- Set confidence to `0.0`
- Add note: `"Field not found or ambiguous"`
- DO NOT guess based on similar documents

---

## 2. Confidence Scoring Methodology

### Confidence Levels

| Level | Range | Criteria | Action |
|-------|-------|----------|--------|
| **HIGH** | 0.90-1.00 | Exact match, unambiguous, dual agreement | Use directly |
| **MEDIUM** | 0.60-0.89 | Partial match, formatting variations, single source | Review |
| **LOW** | 0.01-0.59 | Unclear, conflicting sources, requires interpretation | Flag for human |
| **NONE** | 0.00 | Not found or completely ambiguous | Set null |

### Confidence Calculation

```typescript
// Dual Agreement (Gemini + GPT-4o)
if (gemini.value === gpt4o.value && gemini.value !== null) {
  confidence = 0.95; // HIGH
  source = "dual_agreement";
}

// Claude Tiebreaker
else if (claude.value matches one of [gemini.value, gpt4o.value]) {
  confidence = 0.75; // MEDIUM
  source = "claude_tiebreaker";
}

// Fuzzy Match (similar but not identical)
else if (levenshtein_similarity(gemini.value, gpt4o.value) > 0.85) {
  confidence = 0.65; // MEDIUM-LOW
  source = "fuzzy_match";
}

// No Agreement
else {
  confidence = 0.30; // LOW
  source = "no_consensus";
  // Flag for human review
}
```

---

## 3. Evidence Page Requirements

Every extracted field MUST include evidence pages (1-based indexing).

```json
{
  "field_name": "total_revenue_tkr",
  "value": 12500,
  "confidence": 0.95,
  "evidence_pages": [5, 6],  // ✅ REQUIRED
  "original_string": "12,5 MSEK"  // ✅ REQUIRED for numeric fields
}
```

**Rules**:
- Minimum 1 evidence page per field
- Use 1-based page numbers (page 1 = first page of PDF)
- Include ALL pages where field appears
- For multi-year tables, cite the page with target year (2023-2024)

**Verification**:
- Extraction system MUST verify evidence pages exist
- Spot check: Random sampling of evidence citations
- Fail validation if evidence_pages = []

---

## 4. Swedish Format Validation

### Organization Numbers
```
Format: NNNNNN-NNNN (6 digits, hyphen, 4 digits)

✅ Valid: "123456-7890"
❌ Invalid: "12345-7890", "123456 7890", "1234567890"

Validation:
- Regex: ^\d{6}-\d{4}$
- Checksum validation (Luhn algorithm)
```

### Postal Codes
```
Format: NNN NN (3 digits, space, 2 digits)

✅ Valid: "123 45"
❌ Invalid: "12345", "123-45"

Validation:
- Regex: ^\d{3} \d{2}$
- Range: 100 00 to 999 99
```

### Currency (tkr fields)
```
Input formats (normalize ALL to tkr):
- "12,5 MSEK" → 12500 tkr
- "450 tkr" → 450 tkr
- "2 150 000 SEK" → 2150 tkr
- "3.2M" → 3200 tkr

Rules:
- ALWAYS store numeric value in tkr (thousands)
- ALWAYS preserve original_string for audit trail
- Handle Swedish thousand separator (space): "2 150 000"
- Handle Swedish decimal separator (comma): "12,5"
```

**Validation Code**:
```typescript
function validateOrgNumber(orgNum: string): boolean {
  if (!/^\d{6}-\d{4}$/.test(orgNum)) return false;
  // Luhn checksum validation
  return luhnCheck(orgNum.replace('-', ''));
}

function normalizeToTkr(value: string): number | null {
  // Remove spaces
  let cleaned = value.replace(/\s/g, '');
  // Replace comma with dot
  cleaned = cleaned.replace(',', '.');

  if (cleaned.includes('MSEK') || cleaned.includes('M')) {
    const num = parseFloat(cleaned);
    return num * 1000; // MSEK to tkr
  } else if (cleaned.includes('tkr')) {
    return parseFloat(cleaned);
  } else if (cleaned.includes('SEK')) {
    const num = parseFloat(cleaned);
    return num / 1000; // SEK to tkr
  }
  return null;
}
```

---

## 5. Cross-Field Validation Rules

### Balance Sheet Integrity
```
Rule: Total Assets MUST equal Total Liabilities + Equity

assets_total_tkr = liabilities_total_tkr + equity_total_tkr

Tolerance: ±1 tkr (rounding differences allowed)

If fails:
- Confidence = 0.0 for all balance sheet fields
- Flag: "balance_sheet_mismatch"
- Require human review
```

### Income Statement Sanity
```
1. Revenue > 0 (BRFs always have income)
2. Net result = Revenue - Costs (within ±5% tolerance)
3. Interest costs > 0 (most BRFs have loans)
4. Property revenue ≈ total revenue (typically 80-95%)
```

### Year Validation
```
Target years: 2023 or 2024

Report year (fiscal_year_end) must be:
- "2023-12-31" or "2024-12-31" (most common)
- Any date in 2023 or 2024

If report is older than 2023:
- Flag: "outdated_report"
- Still extract but note in metadata
```

---

## 6. Consensus Tiebreaking Logic

### Step 1: Primary Extraction (Parallel)
```
- Gemini 2.5 Pro → Result A
- GPT-4o → Result B
```

### Step 2: Agreement Check
```python
if A == B:
    return A, confidence=0.95, source="dual_agreement"
```

### Step 3: Claude Tiebreaker (Only if A ≠ B)
```python
- Claude 3.7 Sonnet → Result C

if C == A:
    return A, confidence=0.80, source="claude_tiebreaker_gemini"
elif C == B:
    return B, confidence=0.80, source="claude_tiebreaker_gpt"
elif C is_similar_to A (Levenshtein > 0.85):
    return A, confidence=0.70, source="claude_fuzzy_gemini"
elif C is_similar_to B (Levenshtein > 0.85):
    return B, confidence=0.70, source="claude_fuzzy_gpt"
else:
    # No consensus achieved
    return null, confidence=0.30, source="no_consensus"
    # Flag for human review
```

### Step 4: Human Review Triggers
```
Flag for review if:
- Confidence < 0.60
- source = "no_consensus"
- Critical field (e.g., org_number, fiscal_year_end)
- Cross-field validation failed
```

---

## 7. Agent-Specific Rigor Standards

### Financial Agent (11 _tkr fields)
- ALL currency values MUST have _original field
- Evidence pages MUST cite "Resultaträkning" section
- Multi-year tables: Extract ONLY most recent year
- Negative values: Preserve sign (e.g., -450 for losses)

### Balance Sheet Agent
- MUST validate: Assets = Liabilities + Equity
- Separate current vs non-current assets
- Evidence pages: Cite "Balansräkning" section

### Chairman Agent
- MUST extract full name (Förnamn + Efternamn)
- Confidence = 1.0 ONLY if unambiguous (no "or" or "?")
- Evidence page: "Styrelse" or "Förvaltning" section

### Property Agent
- Energy class: Validate against Swedish scale (A-G)
- Building year: Sanity check (1800-2024)
- Area: Must include unit (kvm, m²)

---

## 8. Validation Checklist (Run Before Commit)

```
✅ Schema Validation
  - All required fields present
  - Field types correct (string, number, date)
  - No extra fields (typos in field names)

✅ Evidence Pages
  - All fields have evidence_pages array
  - All page numbers are valid (1 to PDF page count)
  - At least 80% of fields have evidence

✅ Confidence Scores
  - All scores in range [0.0, 1.0]
  - At least 70% of fields have confidence ≥0.75
  - No fields with confidence=null

✅ Swedish Formats
  - Organization numbers match ^\d{6}-\d{4}$
  - Postal codes match ^\d{3} \d{2}$
  - Dates in ISO format (YYYY-MM-DD)

✅ Cross-Field Rules
  - Balance sheet balanced (±1 tkr tolerance)
  - Income statement sanity (revenue > 0)
  - Year validation (2023-2024)

✅ Original Strings
  - All _tkr fields have _original counterpart
  - Original strings not modified (preserve spaces, commas)

✅ Consensus Metadata
  - source field present (dual_agreement, claude_tiebreaker, etc.)
  - Tiebreaker usage logged (<20% of fields)
```

---

## 9. Error Recovery Protocol

### During Extraction
```
1. API timeout (>60s) → Retry with 90s timeout
2. Rate limit (429) → Exponential backoff: 2s, 4s, 8s, 16s
3. Malformed JSON → Apply JSON repair logic
4. Partial response → Accept if >70% fields extracted
```

### After Extraction
```
1. Validation fails → Re-run failing agent
2. Confidence too low (<0.60 avg) → Review agent prompts
3. Balance sheet mismatch → Manual verification required
4. No consensus on critical field → Human review
```

**Max Retries**: 3 per agent
**Retry Delay**: 5 seconds between attempts

---

## 10. Quality Assurance Metrics

### Per PDF
- **Extraction completeness**: Fields extracted / Total fields
- **Confidence distribution**: % HIGH, MEDIUM, LOW
- **Consensus rate**: Dual agreement / Total fields
- **Validation pass rate**: Passed checks / Total checks

### Cumulative (Across All PDFs)
- **Average confidence**: Target >0.80
- **High confidence rate**: Target >75%
- **Validation failure rate**: Target <5%
- **Tiebreaker usage**: Target <15%

### Reporting
```json
{
  "pdf_id": "brf_12345",
  "quality_metrics": {
    "completeness": 0.92,
    "avg_confidence": 0.87,
    "high_confidence_pct": 0.78,
    "dual_agreement_pct": 0.85,
    "validation_pass_pct": 0.96
  },
  "flags": [
    "balance_sheet_mismatch_resolved",
    "no_consensus_on_chairman_phone"
  ]
}
```

---

## Enforcement

- **Automated**: Schema validation, format checks, cross-field rules
- **Manual Spot Checks**: Random 10% sample of extractions
- **Continuous Improvement**: Update agent prompts based on errors
- **Version Control**: Track rigor protocol changes in git

**Rigor violations** → Mark extraction as MEDIUM confidence overall, require review
