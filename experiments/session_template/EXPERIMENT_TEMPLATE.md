# Experiment: [Session-ID]

**Date**: YYYY-MM-DD
**Experimenter**: [Name/ID]
**Session Number**: X/10

---

## Hypothesis

**What are we testing?** (Be specific, testable, falsifiable)

Example: "Adding explicit unit extraction instructions to financial_agent will reduce currency normalization errors by >50%"

---

## Variables

### Independent Variable (What we're changing)
- **Variable**: [e.g., prompt structure, validation rule, schema field]
- **Variations**:
  - Control: [Current baseline]
  - Treatment A: [First variation]
  - Treatment B: [Second variation]

### Dependent Variables (What we're measuring)
- Field coverage (% of schema fields extracted)
- Confidence scores (mean, median, std dev)
- Currency normalization errors (count)
- Validation errors (count by type)
- Validation warnings (count by type)
- Cost per document (tokens + dollars)
- Extraction time (seconds)
- Hallucination rate (false positives)
- Miss rate (false negatives)

### Control Variables (What stays constant)
- Same set of test documents
- Same model (e.g., gemini-2.5-pro)
- Same sectionization settings
- Same temperature (0.1)

---

## Test Documents

List documents with relevant characteristics:

1. **doc_001.pdf**
   - Fiscal year: 2023
   - Pages: 12
   - Structure: Standard BRF format
   - Complexity: Low (clear sections, standard terminology)
   - Special notes: Multi-year comparison table on page 10

2. **doc_002.pdf**
   - Fiscal year: 2022
   - Pages: 18
   - Structure: Consolidated statements
   - Complexity: High (nested subsidiaries, complex notes)
   - Special notes: Missing cash flow statement

3. [Add 3-8 more documents]

**Total documents**: 5-10 per session

---

## Prompts/Validators/Schemas Tested

### Control (Baseline)
- File: `agents/financial_agent.md` (v1.0.0)
- Key characteristics:
  - Currency instruction: "Extract NUMERIC value in tkr"
  - Example format: "12,5 MSEK" → 12.5

### Treatment A
- File: `experiments/session_XXX/prompts/financial_agent_v1.1.0.md`
- Changes from baseline:
  - Added: Explicit unit extraction instruction
  - Added: Negative examples for common errors
  - Changed: Example format to show unit preservation
- Expected improvement: 50-70% reduction in currency errors

### Treatment B
- File: `experiments/session_XXX/prompts/financial_agent_v1.2.0.md`
- Changes from baseline:
  - [Different variation]
- Expected improvement: [Quantified prediction]

---

## Execution Plan

1. **Setup**
   - [ ] Backup current agents/ directory
   - [ ] Create experiment prompts in experiments/session_XXX/prompts/
   - [ ] Prepare test document list
   - [ ] Initialize results directory

2. **Run Extractions**
   For each document × each prompt variation:
   - [ ] Run extraction with instrumentation
   - [ ] Save raw results to `results/doc_XXX_promptY_results.json`
   - [ ] Save validation output to `results/doc_XXX_promptY_validation.json`
   - [ ] Log cost/tokens to `results/doc_XXX_promptY_metrics.json`

3. **Data Collection**
   - [ ] Aggregate metrics across all runs
   - [ ] Calculate summary statistics
   - [ ] Identify outliers and edge cases

4. **Analysis**
   - [ ] Compare treatments vs control
   - [ ] Statistical significance testing (if sample size permits)
   - [ ] Pattern identification

---

## Results

### Raw Data

| Document | Prompt | Fields Extracted | Avg Confidence | Errors | Warnings | Cost ($) | Time (s) |
|----------|--------|------------------|----------------|--------|----------|----------|----------|
| doc_001  | Control | 8/11 (73%)      | 0.82           | 1      | 3        | 0.035    | 12.3     |
| doc_001  | Treatment A | 10/11 (91%)  | 0.88           | 0      | 1        | 0.038    | 13.1     |
| doc_002  | Control | 7/11 (64%)      | 0.79           | 2      | 4        | 0.042    | 15.2     |
| doc_002  | Treatment A | 9/11 (82%)   | 0.85           | 0      | 2        | 0.045    | 16.8     |
| ...      | ...    | ...              | ...            | ...    | ...      | ...      | ...      |

### Summary Statistics

**Control Group** (n=5 documents):
- Field coverage: 68% ± 8%
- Average confidence: 0.80 ± 0.05
- Errors per doc: 1.6 ± 0.8
- Warnings per doc: 3.4 ± 1.2
- Cost per doc: $0.038 ± 0.005
- Extraction time: 14.2s ± 2.1s

**Treatment A** (n=5 documents):
- Field coverage: 87% ± 6% ✅ (+19 pp)
- Average confidence: 0.86 ± 0.04 ✅ (+0.06)
- Errors per doc: 0.2 ± 0.4 ✅ (-87%)
- Warnings per doc: 1.8 ± 0.9 ✅ (-47%)
- Cost per doc: $0.041 ± 0.004 ⚠️ (+8%)
- Extraction time: 15.8s ± 1.9s ⚠️ (+11%)

**Treatment B** (n=5 documents):
- [Fill in results]

---

## Analysis

### What Worked?

1. **Treatment A significantly reduced currency errors**
   - Control: 1.6 errors/doc → Treatment A: 0.2 errors/doc (-87%)
   - Root cause: Explicit unit extraction eliminated ambiguity
   - Confidence in finding: 95% (consistent across all docs)

2. **Field coverage improved**
   - Control: 68% → Treatment A: 87% (+19 percentage points)
   - Likely due to clearer instructions reducing agent confusion
   - Confidence: 85% (could be sample-specific)

### What Failed?

1. **Cost increased by 8%**
   - Longer prompt = more input tokens
   - Trade-off acceptable given quality improvement
   - Confidence: 100% (direct measurement)

2. **Treatment B had no effect on [metric]**
   - [Explain null result]
   - Confidence: [X%]

### What Was Surprising?

1. **Document 003 had higher confidence with shorter prompt**
   - Unexpected: thought longer = better
   - Hypothesis: overly verbose prompts confuse model?
   - Needs follow-up investigation

2. [Other unexpected findings]

### Edge Cases Discovered

1. **Multi-currency documents**
   - Document 004 had both SEK and EUR
   - Current prompts don't handle EUR
   - Need to add multi-currency support

2. [Other edge cases]

---

## Confidence in Findings

Rate confidence in each major finding (0-100%):

1. **Treatment A reduces currency errors**: 95%
   - Rationale: Consistent across all 5 documents, large effect size
   - Caveat: Small sample size (n=5)

2. **Field coverage improvement**: 85%
   - Rationale: Improvement seen in 4/5 documents
   - Caveat: Document 002 was outlier (consolidated statements)

3. **Cost trade-off acceptable**: 90%
   - Rationale: 8% cost increase for 87% error reduction is ROI positive
   - Caveat: Assumes error correction has high value

---

## Learnings for Next Iteration

### Actionable Insights

1. **Promote Treatment A to production**
   - Evidence: 87% error reduction, 19pp coverage improvement
   - Risk: 8% cost increase (acceptable)
   - Action: Update `agents/financial_agent.md` with Treatment A changes

2. **Add multi-currency support to schema**
   - Evidence: Document 004 had EUR values
   - Risk: Current validators assume SEK only
   - Action: Add currency_code field to schema

3. **Investigate verbose prompt hypothesis**
   - Evidence: Document 003 performed worse with longer prompt
   - Risk: Overfitting to prompt length
   - Action: Design experiment testing prompt length vs clarity

### Patterns Identified

1. **Explicit examples reduce ambiguity**
   - Add to PATTERNS_THAT_WORK.md
   - Generalize to all agents

2. **Negative examples prevent specific errors**
   - Add to PATTERNS_THAT_WORK.md
   - Create library of common errors to include

### Hypotheses for Future Testing

1. **Does numbering steps improve extraction?**
   - Test in session 002

2. **Does providing section hints reduce routing errors?**
   - Test in session 003

3. **Do shorter, clearer prompts outperform longer, comprehensive ones?**
   - Test in session 004

---

## Recommended Changes

### Immediate (Promote to Production)

1. **File**: `agents/financial_agent.md`
   **Change**: Replace currency extraction instruction (line 19-23)
   **From**:
   ```markdown
   Extract NUMERIC value in tkr (thousands)
   Example: "12,5 MSEK" → total_revenue_tkr: 12.5
   ```
   **To**:
   ```markdown
   Extract the numeric value AS WRITTEN, including the unit:
   - "12,5 MSEK" → value: 12.5, unit: "MSEK"
   - "1 250 tkr" → value: 1250, unit: "tkr"

   DO NOT pre-convert. The wrapper will normalize to tkr.
   ```
   **Rationale**: Addresses Blind Spot #2 (currency ambiguity)
   **Expected Impact**: 87% reduction in currency errors
   **Confidence**: 95%

### Deferred (Need More Testing)

1. **File**: `schemas/brf-schema-v1.0.0.ts`
   **Change**: Add `currency_code` field
   **Rationale**: Support multi-currency documents (EUR found in doc_004)
   **Expected Impact**: Expand coverage to 5-10% of BRF documents
   **Confidence**: 60% (need to validate how common EUR is)
   **Next Steps**: Survey 100 documents to measure EUR prevalence

---

## Appendix: Detailed Results

### Document 001: Detailed Field Analysis

| Field | Control | Treatment A | Improvement |
|-------|---------|-------------|-------------|
| total_revenue_tkr | ✅ 0.90 | ✅ 0.95 | +0.05 |
| property_revenue_tkr | ❌ null | ✅ 0.88 | Found! |
| interest_costs_tkr | ⚠️ 0.75 | ✅ 0.92 | +0.17 |
| ... | ... | ... | ... |

### Document 002: Detailed Field Analysis
[Same structure]

---

## Session Metadata

- **Session ID**: session_XXX
- **Start time**: YYYY-MM-DD HH:MM:SS
- **End time**: YYYY-MM-DD HH:MM:SS
- **Total duration**: X hours
- **Total documents processed**: X
- **Total prompts tested**: X
- **Total extractions run**: X × X = XX
- **Total cost**: $X.XX
- **Total tokens**: XXX,XXX

---

## Files Generated

```
experiments/session_XXX/
  hypothesis.md ← This file
  prompts/
    financial_agent_v1.1.0.md
    financial_agent_v1.2.0.md
  results/
    doc_001_control_results.json
    doc_001_treatmentA_results.json
    doc_002_control_results.json
    doc_002_treatmentA_results.json
    metrics_summary.json
    error_analysis.json
  analysis.md ← Deep dive analysis
  learnings.md ← Key takeaways
```

---

## Sign-Off

**Experiment completed**: ☐ Yes ☐ No
**Results validated**: ☐ Yes ☐ No
**Learnings documented**: ☐ Yes ☐ No
**Production changes recommended**: ☐ Yes ☐ No

**Reviewed by**: [Name]
**Date**: YYYY-MM-DD
