# Rigor Protocol - Quality & Validation Standards

**Version**: 1.0.0
**Purpose**: Define quality standards and validation criteria for autonomous PDF extraction
**Applies To**: All autonomous sessions

## Core Principles

### 1. **Evidence-Based Extraction**
- Every extracted value MUST have evidence pages (1-based page numbers)
- Every field MUST have confidence score (0.0-1.0)
- No hallucinations - if not found, return `null` with confidence 0.0

### 2. **Confidence Calibration**
- **High (0.8-1.0)**: Value explicitly stated, clearly visible, no ambiguity
- **Medium (0.5-0.8)**: Value derived/calculated, or minor ambiguity in label
- **Low (0.0-0.5)**: Value uncertain, partial match, or unclear source

### 3. **Multi-Pass Verification**
- Each field extracted independently by specialist agent
- Cross-validation for critical fields (totals, dates, identifiers)
- Consensus required for conflicting values (take highest confidence)

### 4. **Graceful Degradation**
- Partial data is acceptable if documented
- Failed agents do not block pipeline
- Missing fields documented in validation report

## Field-Level Validation Rules

### String Fields
```typescript
{
  "value": string | null,
  "confidence": 0.0-1.0,
  "evidence_pages": number[] (1-based),
  "normalized": boolean // Applied Swedish normalization rules
}
```

**Rules**:
- Trim whitespace
- Normalize Swedish characters (å, ä, ö preserved)
- Remove extra spaces/newlines
- Empty string → `null`
- Max length: 500 chars (truncate with warning)

### Number Fields (Monetary)
```typescript
{
  "value": number | null, // In SEK (kronor)
  "confidence": 0.0-1.0,
  "evidence_pages": number[],
  "unit": "SEK" | "TSEK" | "MSEK" // Thousands SEK convention
}
```

**Rules**:
- Convert TSEK to SEK (×1000) for storage consistency
- Remove thousand separators (spaces, commas)
- Validate numeric format (Swedish: 1 234,56)
- Negative values indicated by minus sign or parentheses
- Range check: -1B to 1B SEK (abort if exceeded)

### Date Fields
```typescript
{
  "value": "YYYY-MM-DD" | null,
  "confidence": 0.0-1.0,
  "evidence_pages": number[]
}
```

**Rules**:
- Normalize to ISO 8601 (YYYY-MM-DD)
- Handle Swedish date formats (2024-12-31, 31/12/2024, 31 dec 2024)
- Validate fiscal year consistency (all dates within ±1 year)
- Range check: 2000-2030 (abort if outside)

### Array Fields (e.g., Board Members)
```typescript
{
  "value": Array<{name: string, role?: string}> | null,
  "confidence": 0.0-1.0,
  "evidence_pages": number[]
}
```

**Rules**:
- Deduplicate entries (case-insensitive)
- Preserve order if semantically meaningful
- Max array length: 50 items
- Empty array → `null`

## Agent-Specific Rigor Standards

### Financial Agent (11 fields)
**Critical Fields** (MUST extract):
- `total_revenue_tkr`
- `total_expenses_tkr`
- `net_income_tkr`

**Validation**:
- `net_income_tkr ≈ total_revenue_tkr - total_expenses_tkr` (±5% tolerance)
- All values must be from same fiscal year
- Require evidence pages from Resultaträkning section

**Confidence Target**: ≥0.85 (high-quality financial statements)

### Balance Sheet Agent
**Critical Fields** (MUST extract):
- `total_assets_tkr`
- `total_liabilities_tkr`
- `total_equity_tkr`

**Validation**:
- `total_assets_tkr ≈ total_liabilities_tkr + total_equity_tkr` (±1% tolerance)
- No negative equity (warning if found)
- Require evidence pages from Balansräkning section

**Confidence Target**: ≥0.85

### Property Agent
**Critical Fields** (MUST extract):
- `property_designation` OR `address`
- `city`

**Validation**:
- Property designation format: "{Name} {Number}" (e.g., "Skytten 2")
- City must be valid Swedish municipality (lenient - warn only)
- Address must include postal code (5 digits) if present

**Confidence Target**: ≥0.75 (property data often scattered)

### Governance Agents (Chairman, Board, Auditor)
**Critical Fields** (MUST extract):
- `chairman_name` (chairman_agent)
- `board_members` (board_members_agent) - at least 3
- `auditor_name` OR `auditor_firm` (auditor_agent)

**Validation**:
- Names must be title-cased (e.g., "Anna Svensson")
- No role overlap (chairman not in board_members list)
- Audit firm validation (known Swedish firms: KPMG, PwC, EY, Deloitte, etc.)

**Confidence Target**: ≥0.70 (names often in footers/headers)

### Notes Agents (Depreciation, Maintenance, Tax)
**Optional Fields** - Graceful degradation:
- Extract if Noter section exists
- `null` acceptable if section missing
- Document missing sections in learnings

**Confidence Target**: ≥0.60 (notes vary significantly)

## Cross-Agent Validation

### 1. Date Consistency
- All agents must extract dates from same fiscal year
- Fiscal year derived from `financial_agent.fiscal_year_end`
- Abort if agents report different fiscal years (>1 year difference)

### 2. Identity Fields (BRF Linkage)
**Tier 1 (Filename)**:
- `brf_id` extracted from filename (e.g., "brf_43334.pdf" → "43334")
- Confidence: HIGH (1.0) if pattern matched

**Tier 2 (PDF Content)**:
- `property_designation` from property_agent
- `brf_name` from property_agent or chairman_agent
- `city` from property_agent
- Cross-validate: All agents must agree on BRF name (case-insensitive)

### 3. Financial Totals
- Balance sheet must balance: Assets = Liabilities + Equity
- Tolerance: ±1% (accounting rounding)
- If mismatch: Flag as warning, use highest-confidence values

### 4. Duplicate Detection
- If multiple agents extract same field, take highest confidence
- Log conflicts in validation report
- Example: Both `property_agent` and `chairman_agent` extract BRF name

## Validation Report Requirements

Every extraction must generate a validation report:

```json
{
  "session_id": "session_20251118_042205",
  "pdf_id": "79446",
  "timestamp": "2025-11-18T04:22:05Z",
  "status": "PASS" | "PARTIAL" | "FAIL",

  "agent_results": {
    "total_agents": 19,
    "successful": 17,
    "failed": 2,
    "agent_breakdown": {
      "financial_agent": {"status": "SUCCESS", "confidence": 0.92, "fields": 11},
      "balance_sheet_agent": {"status": "SUCCESS", "confidence": 0.88, "fields": 8},
      ...
    }
  },

  "field_statistics": {
    "total_fields": 127,
    "high_confidence": 89,   // ≥0.8
    "medium_confidence": 32, // 0.5-0.8
    "low_confidence": 6,     // <0.5
    "null_fields": 15,
    "overall_confidence": 0.83
  },

  "critical_validations": {
    "balance_sheet_balanced": true,
    "fiscal_year_consistent": true,
    "identity_fields_present": true,
    "minimum_agent_success": true  // ≥15/19
  },

  "errors": [
    // Critical errors (validation failures)
  ],

  "warnings": [
    "board_members_agent: Only 2 board members found (expected ≥3)",
    "notes_depreciation_agent: Noter section not found"
  ],

  "quality_score": 0.87  // Composite score (0-1)
}
```

**Status Definitions**:
- **PASS**: All critical validations passed, quality_score ≥0.80
- **PARTIAL**: Some validations passed, quality_score 0.60-0.79
- **FAIL**: Critical validations failed, quality_score <0.60

## Quality Score Calculation

```
quality_score = (
  0.40 * overall_confidence +
  0.30 * (successful_agents / total_agents) +
  0.15 * (critical_validations_passed / total_critical_validations) +
  0.15 * (1 - (errors / total_fields))
)
```

**Weights**:
- 40% Overall field confidence
- 30% Agent success rate
- 15% Critical validations (balance sheet, fiscal year, etc.)
- 15% Error rate (inverse)

**Targets**:
- **Excellent**: ≥0.85
- **Good**: 0.75-0.84
- **Acceptable**: 0.60-0.74
- **Poor**: <0.60 (investigate)

## Error Escalation

### Level 1: Warnings (Log Only)
- Low confidence fields (<0.5)
- Missing optional fields
- Minor formatting issues
- Agent took >3 minutes

**Action**: Document in validation report, continue

### Level 2: Validation Errors (Continue with Partial)
- Missing critical field (e.g., `total_revenue_tkr`)
- Agent failure (<15/19 success rate)
- Cross-validation mismatch (balance sheet off by >5%)

**Action**: Mark as PARTIAL, document in learnings, continue

### Level 3: Fatal Errors (Abort Session)
- All agents fail
- PDF unreadable/corrupted
- API key invalid
- Cost exceeded $2.00
- Duration exceeded 30 minutes

**Action**: Mark as FAILED, move to `/processing/failed/`, document extensively

## Anti-Hallucination Rules

### Rule 1: Evidence Required
- Every non-null value MUST cite evidence pages
- If field not found after scanning all pages → `null`
- NEVER infer values from context alone

### Rule 2: Conservative Confidence
- When uncertain, lower confidence score
- Confidence 1.0 reserved for perfect matches only
- If multiple interpretations exist → confidence ≤0.6

### Rule 3: Explicit Nulls
- Missing field → `{"value": null, "confidence": 0.0, "evidence_pages": []}`
- NOT: `{"value": "", "confidence": 0.5, ...}` (ambiguous)
- NOT: Field omitted entirely (schema violation)

### Rule 4: No Calculations (Unless Specified)
- Extract values as-is from PDF
- Only exception: Unit conversion (TSEK → SEK)
- Do not "fix" balance sheet by calculating missing equity

### Rule 5: Normalization Transparency
- Always set `normalized: true` if value modified
- Document normalization in evidence notes
- Example: "Styrelseordförande" → "Chairman" (normalized to English)

## Learning & Improvement

### Continuous Calibration
Every session generates learnings that inform:
1. **Prompt refinement** - Adjust agent prompts based on failures
2. **Routing optimization** - Improve section-to-agent mapping
3. **Confidence calibration** - Adjust thresholds based on ground truth
4. **Error patterns** - Document common failure modes

### Meta-Analysis Integration
Every 10 completions, meta-analysis aggregates:
- Per-agent confidence distributions
- Common validation failures
- Cost/duration trends
- PDF structure patterns

**Goal**: Continuous improvement toward 95%+ success rate at 0.85+ confidence

## Checklist for Every Session

Before marking extraction complete, verify:

- [ ] All 19 agents attempted
- [ ] ≥15/19 agents succeeded
- [ ] Validation report generated
- [ ] Quality score calculated
- [ ] Critical fields extracted (financial, balance sheet, property)
- [ ] Cross-validations passed or documented
- [ ] Evidence pages present for all non-null fields
- [ ] Confidence scores calibrated (no systematic 1.0 or 0.0)
- [ ] Errors and warnings logged
- [ ] Learning entry created
- [ ] Results committed to git

---

**Protocol Status**: ✅ Active
**Compliance**: Mandatory for all autonomous sessions
**Last Updated**: 2025-11-18
