# Rigor Protocol for Ground Truth Extraction

**Version**: 1.0.0
**Purpose**: Ensure 95%+ accuracy in ground truth extraction through systematic validation and quality control

---

## Core Principles

1. **Evidence-Based Extraction**: Only extract data explicitly visible in the PDF
2. **Confidence Tracking**: Every field must have confidence score + evidence pages
3. **Multi-Model Consensus**: Use 2-3 models and require agreement
4. **Fail Gracefully**: Better to skip a field than hallucinate incorrect data
5. **Validate Continuously**: Check results at every step

---

## Extraction Quality Standards

### Level 1: HIGH Confidence (≥0.85)

**Requirements**:
- Dual model agreement (Gemini 2.5 Pro + GPT-4o agree)
- Clear, unambiguous text in PDF
- Evidence pages identified (1-based page numbers)
- Original string preserved for traceability

**Example**:
```json
{
  "total_revenue_tkr": {
    "value": 12500,
    "confidence": 0.95,
    "evidence_pages": [5, 6],
    "original_string": "12,5 MSEK",
    "consensus": "dual_agreement"
  }
}
```

**When to Assign HIGH**:
- ✅ Both models return same numeric value
- ✅ Text is clearly printed (not handwritten)
- ✅ Field name matches expected Swedish term exactly
- ✅ Value is in expected range (e.g., revenue > 0)

---

### Level 2: MEDIUM Confidence (0.60-0.84)

**Requirements**:
- Models disagree initially, Claude tiebreaker used
- Text is partially visible or ambiguous
- Evidence pages identified but value requires interpretation
- Original string may be incomplete

**Example**:
```json
{
  "number_of_apartments": {
    "value": 48,
    "confidence": 0.70,
    "evidence_pages": [3],
    "original_string": "48 lägenheter (ca)",
    "consensus": "claude_tiebreaker",
    "notes": "Text says '48 (ca)' - approximate value"
  }
}
```

**When to Assign MEDIUM**:
- ⚠️ Models disagree but Claude makes reasonable judgment
- ⚠️ Text has qualifiers ("cirka", "ungefär", "ca")
- ⚠️ Value requires calculation from multiple sources
- ⚠️ Formatting is non-standard

---

### Level 3: LOW Confidence (<0.60)

**Requirements**:
- Models disagree and no clear tiebreaker
- Text is barely readable or conflicting
- Evidence pages identified but value is uncertain
- Flag for human review

**Example**:
```json
{
  "energy_class": {
    "value": null,
    "confidence": 0.30,
    "evidence_pages": [],
    "original_string": null,
    "consensus": "no_agreement",
    "notes": "Energy certificate not found in PDF"
  }
}
```

**When to Assign LOW**:
- ❌ All three models disagree
- ❌ Text is illegible or scanned poorly
- ❌ Field not found in PDF
- ❌ Value conflicts with other fields

---

## Anti-Hallucination Rules

### Rule 1: No Inference Without Evidence
```
❌ WRONG: "Since this is a Stockholm BRF from 2023, energy class is probably D"
✅ RIGHT: "Energy class not found. Setting to null with confidence 0.0"
```

### Rule 2: Preserve Original Strings
```
❌ WRONG: {"value": 12500, "original_string": "12500"}
✅ RIGHT: {"value": 12500, "original_string": "12,5 MSEK"}
```

### Rule 3: Use Swedish Keywords Exactly
```
❌ WRONG: Looking for "Chairman" in PDF
✅ RIGHT: Looking for "Styrelseordförande" or "Ordförande"
```

### Rule 4: Verify Calculations
```
Example: Total revenue = Fees + Other income
❌ WRONG: Just extract "Total revenue" without checking
✅ RIGHT: Extract fees (8000) + other (500) = 8500, verify against "Total revenue" field
```

### Rule 5: Flag Impossible Values
```
❌ WRONG: {"year": 2035, "confidence": 0.9}
✅ RIGHT: {"year": null, "confidence": 0.0, "notes": "Year 2035 is impossible (future date)"}
```

---

## Multi-Model Consensus Protocol

### Step 1: Parallel Extraction
Run Gemini 2.5 Pro and GPT-4o in parallel on the same prompt:

**Prompt Template**:
```
You are {agent_name} specializing in extracting {fields} from Swedish BRF annual reports.

DOCUMENT SECTIONS:
{relevant_sections}

EXTRACT THESE FIELDS:
{field_list}

RULES:
1. Only extract data explicitly visible in the PDF
2. Return null if field not found
3. Preserve original Swedish text in "original_string"
4. Provide evidence page numbers (1-based)
5. Never infer or guess

OUTPUT FORMAT:
{json_schema}
```

### Step 2: Compare Results
```javascript
function compareExtractions(geminiResult, gptResult) {
  const agreement = {};
  const disagreement = {};

  for (const field in geminiResult) {
    if (geminiResult[field].value === gptResult[field].value) {
      agreement[field] = {
        value: geminiResult[field].value,
        confidence: 0.9, // HIGH
        consensus: "dual_agreement"
      };
    } else {
      disagreement[field] = {
        gemini: geminiResult[field],
        gpt: gptResult[field],
        needsTiebreaker: true
      };
    }
  }

  return { agreement, disagreement };
}
```

### Step 3: Tiebreaker (If Needed)
For disagreements, invoke Claude 3.7 Sonnet:

**Tiebreaker Prompt**:
```
Two models extracted this field but disagree:

Model A (Gemini): {geminiResult}
Model B (GPT): {gptResult}

PDF excerpt: {pdf_excerpt}

Which extraction is correct? Or should this be null?

Return:
{
  "chosen_value": <value or null>,
  "confidence": <0.0-1.0>,
  "reasoning": "<1 sentence explanation>"
}
```

**Tiebreaker Logic**:
```javascript
if (claudeAgrees(geminiResult)) {
  return { value: geminiResult.value, confidence: 0.75, consensus: "claude_tiebreaker" };
} else if (claudeAgrees(gptResult)) {
  return { value: gptResult.value, confidence: 0.75, consensus: "claude_tiebreaker" };
} else {
  return { value: null, confidence: 0.3, consensus: "no_agreement" };
}
```

---

## Validation Checkpoints

### Checkpoint 1: Schema Validation (Structural)
```typescript
import { FullExtractionResult } from './schemas/full-extraction-result';

function validateSchema(extraction: any): ValidationResult {
  try {
    FullExtractionResult.parse(extraction);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: error.errors };
  }
}
```

### Checkpoint 2: Business Logic (Semantic)
```typescript
function validateBusinessLogic(extraction: FullExtractionResult): ValidationResult {
  const errors = [];

  // Balance sheet must balance
  const assets = extraction.balance_sheet.total_assets_tkr.value;
  const liabilities = extraction.balance_sheet.total_liabilities_tkr.value;
  const equity = extraction.balance_sheet.total_equity_tkr.value;

  if (Math.abs(assets - (liabilities + equity)) > 10) {
    errors.push({
      field: "balance_sheet",
      message: `Assets (${assets}) != Liabilities (${liabilities}) + Equity (${equity})`,
      severity: "ERROR"
    });
  }

  // Revenue must be positive
  if (extraction.financial.total_revenue_tkr.value <= 0) {
    errors.push({
      field: "total_revenue_tkr",
      message: "Revenue must be > 0",
      severity: "ERROR"
    });
  }

  // Year must be 2020-2024
  const year = extraction.metadata.reporting_year.value;
  if (year < 2020 || year > 2024) {
    errors.push({
      field: "reporting_year",
      message: `Year ${year} out of expected range (2020-2024)`,
      severity: "WARNING"
    });
  }

  return { valid: errors.length === 0, errors };
}
```

### Checkpoint 3: Swedish Format Validation
```typescript
function validateSwedishFormats(extraction: FullExtractionResult): ValidationResult {
  const errors = [];

  // Organization number: NNNNNN-NNNN
  const orgNumber = extraction.metadata.org_number.value;
  if (!/^\d{6}-\d{4}$/.test(orgNumber)) {
    errors.push({
      field: "org_number",
      message: `Invalid format: ${orgNumber} (expected NNNNNN-NNNN)`,
      severity: "ERROR"
    });
  }

  // Postal code: NNN NN
  const postalCode = extraction.property.postal_code.value;
  if (!/^\d{3}\s?\d{2}$/.test(postalCode)) {
    errors.push({
      field: "postal_code",
      message: `Invalid format: ${postalCode} (expected NNN NN)`,
      severity: "WARNING"
    });
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Cost Control

### Budget Limits
- **Per PDF**: Max $1.50 (hard limit)
- **Target**: $0.75-1.00 per PDF
- **Per Agent**: Max $0.08

### Cost Tracking
```typescript
interface CostBreakdown {
  sectionization: number;  // ~$0.05
  agents: {
    [agentId: string]: number;  // ~$0.03-0.05 each
  };
  tiebreakers: number;  // ~$0.10 total
  validation: number;  // ~$0.02
  total: number;
}

function trackCost(response: any, model: string): number {
  const costs = {
    "gemini-2.5-pro": { input: 1.25 / 1_000_000, output: 5.0 / 1_000_000 },
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    "claude-3.7-sonnet": { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 }
  };

  const inputCost = response.usage.input_tokens * costs[model].input;
  const outputCost = response.usage.output_tokens * costs[model].output;

  return inputCost + outputCost;
}
```

### Cost Optimization
1. **Use Gemini 2.0 Flash for sectionization** (10x cheaper than Pro)
2. **Batch agent calls** (run 18 agents in parallel, not sequentially)
3. **Skip tiebreaker if 85%+ agreement** (save Claude calls)
4. **Cache section maps** (don't re-sectionize same PDF)

---

## Performance Targets

### Speed
- **Per PDF**: <15 minutes (target: 8-10 minutes)
- **Sectionization**: <30 seconds
- **Per Agent**: <30 seconds average
- **Validation**: <5 seconds

### Accuracy
- **Field Extraction Rate**: >80% (78+ fields out of 95)
- **High Confidence Rate**: >70% (of extracted fields)
- **Balance Sheet Accuracy**: 100% (must always balance)
- **Swedish Format Accuracy**: 95%+

### Success Criteria
A PDF extraction is considered **successful** if:
- ✅ ≥15 agents complete (out of 19)
- ✅ ≥60 fields extracted (out of 95)
- ✅ ≥70% high confidence fields
- ✅ Balance sheet balances (within ±10 tkr)
- ✅ No ERROR-level validation failures
- ✅ Cost ≤ $1.50

---

## Error Recovery

### Retry Strategy
```typescript
async function extractWithRetry(agent: AgentId, pdf: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await extractAgent(agent, pdf);
      return result;
    } catch (error) {
      if (error.code === 'rate_limit') {
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        continue;
      } else if (error.code === 'invalid_json') {
        // Try JSON repair
        const repaired = repairTruncatedJSON(error.response);
        return JSON.parse(repaired);
      } else {
        throw error; // Don't retry non-recoverable errors
      }
    }
  }
  throw new Error(`Agent ${agent} failed after ${maxRetries} attempts`);
}
```

### Degraded Mode
If extraction quality is poor (<50% success rate):
1. **Stop after 5 consecutive failures**
2. **Log detailed diagnostics**: Which agents failed? What errors?
3. **Mark PDF as "requires_human_review"**
4. **Don't commit bad data**

---

## Quality Assurance Checklist

Before committing extraction results, verify:

- [ ] **Schema Valid**: All fields match TypeScript types
- [ ] **Business Logic Valid**: Cross-field validations pass
- [ ] **Swedish Formats Valid**: Org numbers, postal codes correct
- [ ] **Evidence Tracked**: All fields have page numbers or null
- [ ] **Confidence Reasonable**: No impossible confidence (e.g., 1.0 for null value)
- [ ] **Cost Within Budget**: Total cost ≤ $1.50
- [ ] **Duration Reasonable**: Total time ≤ 15 minutes
- [ ] **No Hallucinations**: All values traceable to PDF text
- [ ] **Consensus Documented**: Agreement/disagreement tracked

---

## Continuous Improvement

After each extraction, capture learnings:

**What to Track**:
1. Which agents have highest failure rates?
2. Which fields are most difficult to extract?
3. What PDF structures cause problems?
4. Are there patterns in low-confidence extractions?

**Example Analysis**:
```
After 20 PDFs:
- Energy agent fails 60% (PDFs lack energy certificates)
- Leverantörer agent struggles with scanned tables (OCR needed)
- Financial agent achieves 95% success (well-structured tables)
- Recommendation: Add OCR preprocessing step
```

---

**Protocol Version**: 1.0.0
**Target Accuracy**: 95%+
**Last Updated**: 2025-11-18
**Maintained By**: Claude Code Autonomous System
