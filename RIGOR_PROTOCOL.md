# RIGOR PROTOCOL - QUALITY ASSURANCE FOR BRF EXTRACTION

**Version**: 1.0.0
**Purpose**: Ensure maximum accuracy, consistency, and reliability
**Scope**: All autonomous extraction sessions

---

## CORE PRINCIPLES

### 1. EVIDENCE-BASED EXTRACTION
- **Never Hallucinate**: If information not in PDF → null
- **Page Citations Required**: Every non-null field must reference source pages
- **Confidence Calibration**: Honest assessment of extraction certainty

### 2. GRACEFUL DEGRADATION
- **Null is Valid**: Missing data is better than wrong data
- **Partial Success**: Extract what you can, document what you can't
- **No Fatal Failures**: System continues even if agents fail

### 3. REPRODUCIBILITY
- **Deterministic Processing**: Same PDF → Same results
- **Full Audit Trail**: Every decision logged
- **Version Tracking**: Schema + agent versions recorded

---

## VALIDATION LAYERS

### Layer 1: Structural Validation (MUST PASS)

```typescript
interface StructuralChecks {
  // JSON Validity
  valid_json: boolean;                    // Can be parsed
  complete_structure: boolean;            // No truncation

  // Field Presence (ExtractionField wrapper)
  has_value_field: boolean;               // .value exists
  has_confidence_field: boolean;          // .confidence exists
  has_evidence_pages_field: boolean;      // .evidence_pages exists

  // Type Correctness
  correct_value_type: boolean;            // string/number/date/list/dict
  confidence_in_range: boolean;           // 0.0 <= confidence <= 1.0
  pages_are_positive_integers: boolean;   // evidence_pages > 0
}
```

**Failure Action**: Retry agent up to 3 times, then mark as failed

---

### Layer 2: Semantic Validation (SHOULD PASS)

```typescript
interface SemanticChecks {
  // Swedish-Specific Validators
  valid_org_number?: boolean;             // NNNNNN-NNNN format
  valid_postal_code?: boolean;            // NNN NN format
  valid_date_format?: boolean;            // YYYY-MM-DD
  valid_tkr_amount?: boolean;             // Reasonable range

  // Cross-Field Consistency
  fiscal_year_matches?: boolean;          // Consistent across agents
  brf_name_matches?: boolean;             // Consistent across agents
  financial_totals_balance?: boolean;     // Assets = Liabilities + Equity

  // Business Logic
  reasonable_fee_range?: boolean;         // Monthly fees: 500-15000 SEK
  reasonable_building_year?: boolean;     // 1850-2025
  reasonable_num_apartments?: boolean;    // 1-500 units
}
```

**Failure Action**: Log warning, continue processing, flag for review

---

### Layer 3: Confidence Validation (QUALITY METRIC)

```typescript
interface ConfidenceChecks {
  // Individual Field Quality
  high_confidence_fields: number;         // confidence >= 0.90
  medium_confidence_fields: number;       // 0.70 <= confidence < 0.90
  low_confidence_fields: number;          // 0.50 <= confidence < 0.70
  very_low_confidence_fields: number;     // confidence < 0.50

  // Evidence Quality
  fields_with_evidence: number;           // evidence_pages.length > 0
  fields_with_multiple_pages: number;     // evidence_pages.length > 1

  // Overall Quality Score
  average_confidence: number;             // Mean of all non-null fields
  quality_grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
```

**Quality Grades**:
- **A**: Avg confidence ≥ 0.90, 90%+ fields have evidence
- **B**: Avg confidence ≥ 0.80, 80%+ fields have evidence
- **C**: Avg confidence ≥ 0.70, 70%+ fields have evidence
- **D**: Avg confidence ≥ 0.60, 60%+ fields have evidence
- **F**: Avg confidence < 0.60 or < 60% fields have evidence

---

## CONFIDENCE CALIBRATION GUIDE

### 1.0 - ABSOLUTE CERTAINTY
```
✓ Exact text found in PDF
✓ No ambiguity possible
✓ Multiple corroborating sources

Example: "Organisationsnummer: 769615-4458" → confidence: 1.0
```

### 0.95 - VERY HIGH CONFIDENCE
```
✓ Clear statement in document
✓ Standard format/terminology
✓ No conflicting information

Example: "Årsmöte 2024-03-15" → confidence: 0.95
```

### 0.90 - HIGH CONFIDENCE
```
✓ Stated directly in PDF
✓ Minor formatting variations possible
✓ Single authoritative source

Example: "Styrelseordförande: Anders Andersson" → confidence: 0.90
```

### 0.80 - GOOD CONFIDENCE
```
✓ Clearly inferable from context
✓ Standard Swedish BRF terminology
✓ Consistent with other extracted data

Example: Inferred fiscal year from "Årsredovisning 2023" → confidence: 0.80
```

### 0.70 - MEDIUM CONFIDENCE
```
✓ Multiple pieces of evidence combine
✓ Some interpretation required
✓ Reasonable certainty

Example: Calculating net income from subtotals → confidence: 0.70
```

### 0.60 - MODERATE CONFIDENCE
```
✓ Inferred from indirect evidence
✓ Some ambiguity present
✓ Best available interpretation

Example: Estimating maintenance reserves from partial data → confidence: 0.60
```

### 0.50 - LOW CONFIDENCE
```
✓ Weak evidence
✓ High uncertainty
✓ Multiple interpretations possible

Example: Guessing supplier from partial invoice → confidence: 0.50
```

### < 0.50 - VERY LOW (SHOULD BE NULL)
```
✗ Insufficient evidence
✗ Pure speculation
✗ Cannot verify

Action: Set to null instead of guessing
```

---

## CRITICAL FIELD REQUIREMENTS

### Tier 1: MUST EXTRACT (Fail session if all missing)
```typescript
const TIER_1_FIELDS = [
  'brf_name',                    // Required for identification
  'organization_number',         // Required for uniqueness
  'fiscal_year',                 // Required for temporal context
];
```

**Failure Action**: If all 3 missing → flag session as failed, manual review required

---

### Tier 2: SHOULD EXTRACT (Warn if missing)
```typescript
const TIER_2_FIELDS = [
  'total_intakter_tkr',          // Core financial metric
  'total_kostnader_tkr',         // Core financial metric
  'balansomslutning_tkr',        // Balance sheet total
  'chairman_name',               // Governance
  'num_apartments',              // Property metric
];
```

**Failure Action**: Log warning, continue processing

---

### Tier 3: NICE TO HAVE (No warning if missing)
All other fields - extract if present, null if not

---

## ANTI-HALLUCINATION RULES

### Rule 1: NULL OVER GUESS
```typescript
// ❌ WRONG
if (field_not_found) {
  return { value: "Unknown", confidence: 0.3 };
}

// ✅ CORRECT
if (field_not_found) {
  return null;
}
```

### Rule 2: EVIDENCE REQUIRED
```typescript
// ❌ WRONG
{
  "value": "Anders Andersson",
  "confidence": 0.95,
  "evidence_pages": []  // No evidence!
}

// ✅ CORRECT
{
  "value": "Anders Andersson",
  "confidence": 0.95,
  "evidence_pages": [1, 2]  // Found on pages 1-2
}
```

### Rule 3: CONFIDENCE REFLECTS UNCERTAINTY
```typescript
// ❌ WRONG - Overconfident
{
  "value": "approximately 50",  // "approximately" indicates uncertainty
  "confidence": 0.95            // But confidence is high!
}

// ✅ CORRECT
{
  "value": 50,
  "confidence": 0.70  // Lower confidence for estimated values
}
```

### Rule 4: SWEDISH-ONLY DATA
```typescript
// ❌ WRONG - Hallucinated translation
{
  "chairman_name": "Anders Andersson (Chairman)"  // Added English!
}

// ✅ CORRECT
{
  "chairman_name": "Anders Andersson"  // Exactly as in PDF
}
```

### Rule 5: NO ASSUMPTIONS ABOUT MISSING DATA
```typescript
// ❌ WRONG
{
  "num_apartments": 40,  // Assumed from "typical BRF size"
  "confidence": 0.60
}

// ✅ CORRECT
{
  "num_apartments": null  // Not stated in document
}
```

---

## FINANCIAL DATA VALIDATION

### Balance Sheet Rules
```typescript
// MUST BE TRUE (within rounding tolerance of ±1 tkr)
assets_total ≈ liabilities_total + equity_total

// If not balanced, flag as warning (don't fail)
if (Math.abs(assets - (liabilities + equity)) > 1) {
  logWarning('Balance sheet does not balance');
}
```

### Income Statement Rules
```typescript
// SHOULD BE TRUE (within rounding tolerance)
net_result_before_tax ≈ total_intakter - total_kostnader

// If not consistent, prefer extracted totals over calculated
```

### Reasonability Checks
```typescript
const FINANCIAL_RANGES = {
  monthly_fee_per_sqm: [20, 200],      // SEK/sqm/month
  total_assets_tkr: [100, 1000000],    // 100k - 1B SEK
  annual_maintenance_tkr: [10, 50000], // 10k - 50M SEK
};

// Warn if outside range, but don't override extracted value
```

---

## AGENT PERFORMANCE TRACKING

### Success Metrics (Per Agent)
```typescript
interface AgentMetrics {
  // Execution
  success_rate: number;              // Successful runs / total runs
  average_latency_seconds: number;   // Mean execution time
  retry_rate: number;                // Retries / total attempts

  // Quality
  average_confidence: number;        // Mean confidence across fields
  null_rate: number;                 // Null fields / total fields
  evidence_rate: number;             // Fields with pages / total fields

  // Validation
  validation_error_rate: number;     // Critical errors / total runs
  validation_warning_rate: number;   // Warnings / total runs
}
```

### Performance Thresholds
```typescript
const AGENT_HEALTH_THRESHOLDS = {
  success_rate: 0.90,           // ≥90% runs succeed
  average_confidence: 0.75,     // ≥0.75 average confidence
  null_rate: 0.30,              // ≤30% fields are null
  evidence_rate: 0.80,          // ≥80% fields have evidence
  validation_error_rate: 0.05,  // ≤5% critical errors
};
```

**Action**: If agent falls below thresholds for 5+ consecutive runs → flag for prompt improvement

---

## SESSION QUALITY ASSESSMENT

### Per-Session Checklist
```markdown
- [ ] All 19 agents executed
- [ ] 15+ agents succeeded
- [ ] All Tier 1 fields extracted
- [ ] 80%+ Tier 2 fields extracted
- [ ] Average confidence ≥ 0.75
- [ ] No critical validation errors
- [ ] Processing time < 15 minutes
- [ ] Cost < $1.50 USD
- [ ] Balance sheet balanced (±1 tkr tolerance)
- [ ] All non-null fields have evidence pages
```

### Quality Score Calculation
```typescript
function calculateQualityScore(session: SessionResult): number {
  const weights = {
    agent_success_rate: 0.20,      // 20% weight
    tier1_extraction: 0.25,        // 25% weight
    tier2_extraction: 0.15,        // 15% weight
    average_confidence: 0.20,      // 20% weight
    evidence_rate: 0.10,           // 10% weight
    validation_pass: 0.10,         // 10% weight
  };

  return Object.entries(weights)
    .reduce((score, [metric, weight]) => {
      return score + (session[metric] * weight);
    }, 0);
}

// Score >= 0.85 → Excellent
// Score >= 0.75 → Good
// Score >= 0.65 → Acceptable
// Score <  0.65 → Needs Review
```

---

## ERROR SEVERITY CLASSIFICATION

### CRITICAL (Block processing)
- Cannot parse JSON response
- API authentication failure
- File system errors
- Corrupted PDF file

### ERROR (Log and continue)
- Agent timeout after 3 retries
- Validation failure on non-critical fields
- Balance sheet doesn't balance
- Missing Tier 2 fields

### WARNING (Log only)
- Low confidence on optional fields
- Missing evidence pages
- Unusual field values (outside typical ranges)
- Minor validation issues

### INFO (Metrics only)
- Agent execution time
- Token usage
- Cost tracking
- Cache hit rates

---

## LEARNING & IMPROVEMENT PROTOCOL

### After Each Session
```markdown
1. Document novel edge cases
2. Note agent performance outliers
3. Identify pattern improvements
4. Flag ambiguous extractions for review
```

### After 10 Sessions
```markdown
1. Calculate aggregate agent metrics
2. Identify underperforming agents
3. Analyze common failure patterns
4. Update confidence calibration if needed
```

### After 20 Sessions
```markdown
1. Comprehensive meta-analysis
2. Agent prompt refinement proposals
3. Routing rule optimization
4. Schema enhancement suggestions
```

---

## AUDIT TRAIL REQUIREMENTS

### Every Extraction Must Record
```typescript
{
  // Provenance
  "session_id": string,
  "extraction_timestamp": string,  // ISO-8601
  "pipeline_version": string,      // e.g., "v1.0.0"

  // Input
  "pdf_path": string,
  "pdf_hash_sha256": string,
  "pdf_size_bytes": number,

  // Processing
  "agents_executed": AgentId[],
  "agent_results": Record<AgentId, AgentResult>,
  "section_map": SectionMap,
  "routing_decisions": RoutingLog,

  // Output
  "extracted_fields": Record<string, ExtractionField>,
  "validation_results": ValidationResult[],
  "quality_metrics": QualityMetrics,

  // Resources
  "total_tokens": number,
  "total_cost_usd": number,
  "processing_time_ms": number,
  "model_versions": Record<AgentId, string>,
}
```

---

## QUALITY GATES (GO/NO-GO DECISIONS)

### Gate 1: Pre-Processing
```
✓ PDF file exists and readable
✓ File size < 50 MB
✓ API keys present and valid
✓ Output directory writable
```
**FAIL → Abort session**

### Gate 2: Post-Sectionization
```
✓ At least 1 Level-1 section detected
✓ Total pages < 100
```
**FAIL → Flag for manual review, continue with fallback routing**

### Gate 3: Post-Agent-Execution
```
✓ At least 15/19 agents succeeded
✓ At least 1 Tier-1 field extracted
```
**FAIL → Mark session as partial success, continue to save results**

### Gate 4: Post-Validation
```
✓ No CRITICAL validation errors
✓ Quality score ≥ 0.50
```
**FAIL → Mark for review, but commit results**

---

## REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-18 | Initial rigor protocol |

---

**Protocol Compliance**: MANDATORY for all autonomous sessions
**Review Cycle**: Monthly
**Owner**: Autonomous Extraction System
