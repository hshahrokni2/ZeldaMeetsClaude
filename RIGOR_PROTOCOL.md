# Rigor Protocol: Systematic Prompt Engineering & Validation Framework

**Version**: 1.0.0
**Purpose**: Enforce maximum rigor, systematic learning, and blind spot detection across all prompt engineering, schema design, and validation work
**Inspiration**: GraphLang + DSPy rigor, applied manually with healthy self-distrust

---

## 🎯 Core Principles

### 1. **Assume Hallucination Until Proven Otherwise**
- Every assertion must be verifiable against code/docs
- Every example must be tested
- Every claim must cite line numbers
- Default stance: "I might be wrong, let me verify"

### 2. **Compound Learning Across Iterations**
- Track what worked vs what failed
- Document patterns that emerge
- Feed learnings back into prompts/validators
- Build institutional knowledge

### 3. **Systematic Double-Checking**
- Every change reviewed through 3 lenses: correctness, completeness, consistency
- Every blind spot analysis must find NEW blind spots (not just repeat previous ones)
- Every validation must validate the validators

### 4. **Explicit Uncertainty Quantification**
- Rate confidence on every claim (0-100%)
- Mark assumptions clearly
- Flag areas needing empirical validation

---

## 📋 PROTOCOL: When Revising Prompts

### Phase 1: Pre-Work (Evidence Gathering)
**MANDATORY - Do not skip**

1. **Read Current Implementation** (100% required)
   ```
   ☐ Read full agent prompt (agents/[agent].md)
   ☐ Read schema fields this agent targets (schemas/brf-schema-v1.0.0.ts)
   ☐ Read validation rules for these fields (lib/schema-validator.ts)
   ☐ Read field wrapper normalization logic (lib/field-wrapper.ts)
   ☐ Read example outputs (if any in tests/ or docs/)
   ```

2. **Cross-Reference Dependencies**
   ```
   ☐ List all other agents that might extract same/related fields
   ☐ Check for field naming conflicts
   ☐ Verify currency normalization assumptions match wrapper logic
   ☐ Check if validation rules align with prompt instructions
   ```

3. **Identify Assumptions** (Write them down explicitly)
   ```
   ☐ What does this prompt assume about document structure?
   ☐ What Swedish terms does it assume will be present?
   ☐ What does it assume about units (MSEK vs tkr vs SEK)?
   ☐ What does it assume about field relationships?
   ```

4. **Gather Ground Truth Examples**
   ```
   ☐ Find 3+ real BRF document examples (if available)
   ☐ Identify variation patterns (different formats, years, structures)
   ☐ Note edge cases (missing sections, unusual layouts, multi-year tables)
   ```

### Phase 2: Revision Design
**MANDATORY - Document your reasoning**

5. **Define Success Criteria** (Measurable)
   ```
   ☐ What is the extraction accuracy target? (e.g., 95% field coverage)
   ☐ What is acceptable false positive rate? (e.g., <5% hallucination)
   ☐ What is acceptable confidence distribution? (e.g., 80%+ fields >0.85 confidence)
   ☐ How will we measure improvement vs current version?
   ```

6. **Design Changes with Rationale**
   ```
   For each change:
   ☐ State the problem it solves (with evidence from blind spot analysis)
   ☐ State the expected improvement (quantified if possible)
   ☐ State potential side effects (what could this break?)
   ☐ State how to validate the change worked
   ```

7. **Anti-Hallucination Safeguards**
   ```
   ☐ Add explicit "DO NOT HALLUCINATE" instructions for common errors
   ☐ Provide negative examples ("NOT this: ...")
   ☐ Add sanity check questions ("Does this make sense given...")
   ☐ Include fail-safe instructions ("If uncertain, return null")
   ```

8. **Clarity & Precision Audit**
   ```
   ☐ Remove ALL ambiguous language ("extract value" → "extract raw number")
   ☐ Define ALL technical terms (what is "tkr"? what is "MSEK"?)
   ☐ Number ALL steps (1. Do X, 2. Then Y, 3. Finally Z)
   ☐ Use examples for EVERY complex instruction
   ```

### Phase 3: Implementation
**MANDATORY - Track every change**

9. **Version Control & Documentation**
   ```
   ☐ Create backup of current version (agents/[agent].md.v1.0.0)
   ☐ Document changes in CHANGELOG.md (what changed + why + expected impact)
   ☐ Add version header to prompt file
   ☐ Tag with blind spots addressed (e.g., "Fixes: Blind Spot #2 - Currency Ambiguity")
   ```

10. **Implement Changes Incrementally**
    ```
    ☐ Change 1 thing at a time (not 5 things simultaneously)
    ☐ Test after each change (even if just mental simulation)
    ☐ Document what worked vs what didn't
    ☐ Roll back if change makes things worse
    ```

### Phase 4: Validation
**MANDATORY - Prove it works**

11. **Self-Review Checklist**
    ```
    ☐ Read revised prompt as if I'm the LLM - is every instruction clear?
    ☐ Check for internal contradictions (Step 2 contradicts Step 5?)
    ☐ Verify examples match instructions (example shows what text describes?)
    ☐ Confirm terminology matches schema field names exactly
    ☐ Verify units match field wrapper expectations
    ```

12. **Cross-System Consistency Check**
    ```
    ☐ Does prompt instruction match validator expectation?
    ☐ Does example output pass validator without warnings?
    ☐ Does field naming match schema definition?
    ☐ Does currency normalization match wrapper logic?
    ☐ Does evidence_pages instruction match validator rules?
    ```

13. **Blind Spot Re-Analysis**
    ```
    ☐ Re-read original blind spot list - did we address ALL relevant ones?
    ☐ Look for NEW blind spots introduced by changes
    ☐ Test edge cases (what if field is missing? multi-page? ambiguous?)
    ☐ Adversarial thinking: "How could this still fail?"
    ```

14. **Confidence Rating** (Honest self-assessment)
    ```
    ☐ Rate confidence this will improve extraction: ___ %
    ☐ Rate confidence this won't break existing functionality: ___ %
    ☐ Rate confidence this addresses blind spot: ___ %
    ☐ List assumptions that could invalidate this revision: ___
    ```

### Phase 5: Learning Loop
**MANDATORY - Feed forward into next iteration**

15. **Document Learnings**
    ```
    ☐ What worked? (Add to PATTERNS_THAT_WORK.md)
    ☐ What failed? (Add to PATTERNS_TO_AVOID.md)
    ☐ What was surprising? (Add to UNEXPECTED_BEHAVIORS.md)
    ☐ What needs empirical validation? (Add to EXPERIMENTS_NEEDED.md)
    ```

16. **Update Meta-Knowledge**
    ```
    ☐ Add to prompt engineering best practices doc
    ☐ Update validator design principles
    ☐ Refine schema design guidelines
    ☐ Feed insights back into rigor protocol (this document)
    ```

---

## 📋 PROTOCOL: When Revising Validators

### Phase 1: Understand Current State

1. **Map Validation Landscape**
   ```
   ☐ List ALL validators (schema-validator.ts, field-validator.ts, etc.)
   ☐ Map which fields are validated by which rules
   ☐ Identify validation gaps (fields with no validation)
   ☐ Identify redundant validations (same thing checked twice)
   ```

2. **Trace Validation Flow**
   ```
   ☐ When is each validator called? (extraction-workflow.ts:406)
   ☐ What happens on validation failure? (warn vs block vs silent)
   ☐ Are validation results logged? Used? Ignored?
   ☐ Is there a validation results aggregation step?
   ```

3. **Identify Validation Philosophy**
   ```
   ☐ What is current stance: strict vs lenient?
   ☐ What triggers errors vs warnings?
   ☐ What is considered "valid" (null allowed? placeholders allowed?)
   ☐ Is philosophy consistent across all validators?
   ```

### Phase 2: Design New Validation Rules

4. **Define Validation Objective**
   ```
   ☐ What failure mode are we preventing? (Be specific)
   ☐ What is the false positive cost? (blocking good data)
   ☐ What is the false negative cost? (allowing bad data)
   ☐ What is the optimal threshold? (when to warn vs block)
   ```

5. **Design Rule Logic**
   ```
   ☐ Write validation rule in plain English first
   ☐ Identify edge cases (when does this rule fail?)
   ☐ Define tolerance thresholds (±1%? ±5%? ±10%?)
   ☐ Specify error messages (actionable, not generic)
   ```

6. **Cross-Validation Checks**
   ```
   ☐ Does this rule conflict with other rules?
   ☐ Does this rule align with prompt instructions?
   ☐ Does this rule match schema field definitions?
   ☐ Does this rule work across all agent types?
   ```

### Phase 3: Implementation

7. **Code with Defense in Depth**
   ```
   ☐ Handle null/undefined gracefully
   ☐ Handle type mismatches gracefully
   ☐ Add try-catch for complex validation logic
   ☐ Return structured results (not just true/false)
   ```

8. **Add Comprehensive Logging**
   ```
   ☐ Log validation rule name + field name + value
   ☐ Log threshold used (so we can tune later)
   ☐ Log why validation failed (not just "failed")
   ☐ Log validation success with metrics (coverage %, confidence %)
   ```

### Phase 4: Validation

9. **Test Validation Rule**
   ```
   ☐ Test with valid data (should pass)
   ☐ Test with invalid data (should fail with clear message)
   ☐ Test with edge cases (null, empty string, extreme values)
   ☐ Test with malformed data (wrong type, missing fields)
   ```

10. **Validate the Validator**
    ```
    ☐ Can this rule produce false positives? (Test with known-good data)
    ☐ Can this rule produce false negatives? (Test with known-bad data)
    ☐ Is error message actionable? (Does it tell user HOW to fix?)
    ☐ Is threshold appropriate? (Too strict? Too lenient?)
    ```

---

## 📋 PROTOCOL: When Revising Schema

### Phase 1: Schema Impact Analysis

1. **Map Schema Dependencies**
   ```
   ☐ Which agents target these fields?
   ☐ Which validators check these fields?
   ☐ Which downstream systems consume these fields?
   ☐ Which field wrappers transform these fields?
   ```

2. **Identify Ripple Effects**
   ```
   ☐ If I add a field, what else must change? (agents, validators, docs)
   ☐ If I rename a field, what breaks? (routing, aggregation, exports)
   ☐ If I change a type, what breaks? (validation, normalization, wrappers)
   ☐ If I remove a field, who notices? (silent failures?)
   ```

### Phase 2: Schema Design Rigor

3. **Field Naming Precision**
   ```
   ☐ Is name unambiguous? (total_assets vs assets_total vs sum_assets)
   ☐ Is suffix consistent? (_tkr for currency, _date for dates)
   ☐ Is name grep-able? (avoid generic names like "value" or "data")
   ☐ Does name match Swedish term? (map to actual BRF terminology)
   ```

4. **Type Safety**
   ```
   ☐ Is type specific enough? (string vs enum? number vs integer?)
   ☐ Is null allowed? (explicitly define nullability)
   ☐ Are units specified? (tkr? MSEK? SEK? percentage?)
   ☐ Are constraints defined? (min/max? regex pattern?)
   ```

5. **Metadata Richness**
   ```
   ☐ Add description field (what is this? why extract it?)
   ☐ Add source_section hint (where to look in BRF docs)
   ☐ Add example values (show format expected)
   ☐ Add validation rules reference (link to validator logic)
   ```

---

## 🔄 LEARNING PROTOCOL: 10 Parallel Sessions

### Session Structure

**Each session should**:
1. Test a specific hypothesis (e.g., "Does explicit unit definition reduce currency errors?")
2. Use different document variations (different years, structures, sizes)
3. Track metrics (accuracy, confidence, cost, errors)
4. Document failures with root cause analysis

### Feedback Loop Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Session 1-10: Parallel Extraction Experiments              │
│  Each tests 1 hypothesis on 5-10 documents                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Aggregation Layer: Collect Results                         │
│  - Success rates per hypothesis                             │
│  - Error patterns across sessions                           │
│  - Confidence distributions                                 │
│  - Cost per document per approach                           │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Analysis Layer: Pattern Detection                          │
│  - Which prompts performed best?                            │
│  - Which validators caught most errors?                     │
│  - Which schemas were most complete?                        │
│  - What new blind spots emerged?                            │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Synthesis Layer: Update Master Configs                     │
│  - Promote winning prompts to main                          │
│  - Add new validation rules from learnings                  │
│  - Refine schema based on coverage gaps                     │
│  - Update rigor protocol with new patterns                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Next Iteration: Compound Improvements                      │
│  - Higher baseline accuracy                                 │
│  - Fewer blind spots                                        │
│  - Better error detection                                   │
│  - More robust prompts                                      │
└─────────────────────────────────────────────────────────────┘
```

### Experiment Design Template

For each session, create:

```markdown
# Experiment: [Session-ID]

## Hypothesis
What are we testing? (Be specific)

## Variables
- **Independent**: What we're changing (e.g., prompt structure)
- **Dependent**: What we're measuring (e.g., field coverage %)
- **Controls**: What stays constant (e.g., same documents, same model)

## Documents
List of test documents with characteristics:
1. doc_001.pdf - 12 pages, fiscal year 2023, standard structure
2. doc_002.pdf - 18 pages, fiscal year 2022, consolidated statements
3. ...

## Prompts Tested
- Version A: [description]
- Version B: [description]
- Version C: [description]

## Metrics to Track
- Field coverage (% of schema fields extracted)
- Confidence distribution (mean, median, std)
- Validation errors (count by type)
- Validation warnings (count by type)
- Cost per document (tokens + dollars)
- Extraction time (seconds)
- Hallucination rate (false positives)
- Miss rate (false negatives)

## Results
[Raw data table]

## Analysis
- What worked?
- What failed?
- What was surprising?
- Confidence in findings: ____%

## Learnings for Next Iteration
1. [Specific, actionable insight]
2. [Specific, actionable insight]
3. ...

## Recommended Changes
- Prompt updates: [file:line changes]
- Validator updates: [file:line changes]
- Schema updates: [file:line changes]
```

---

## 🎯 Session Tracking System

### Create Learning Database

```markdown
# experiments/
  session_001/
    hypothesis.md
    prompts/
      financial_agent_v1.md
      financial_agent_v2.md
    results/
      doc_001_results.json
      doc_002_results.json
      metrics_summary.json
    analysis.md
    learnings.md

  session_002/
    [same structure]

  meta_analysis/
    cross_session_patterns.md
    winning_configurations.md
    failure_modes_catalog.md
    next_hypotheses.md
```

### Compound Learning Process

After each batch of 10 sessions:

1. **Aggregate Metrics**
   - Which prompt version had highest average confidence?
   - Which validator caught most errors?
   - Which schema had best field coverage?

2. **Extract Patterns**
   - What do all high-performing prompts have in common?
   - What do all low-performing prompts have in common?
   - What unexpected behaviors emerged?

3. **Update Master Configurations**
   - Promote best prompts to `agents/*.md`
   - Add new validation rules to `lib/schema-validator.ts`
   - Refine schema in `schemas/brf-schema-v1.0.0.ts`

4. **Document Institutional Knowledge**
   - Add to `PATTERNS_THAT_WORK.md`
   - Add to `PATTERNS_TO_AVOID.md`
   - Update `RIGOR_PROTOCOL.md` (this file)

5. **Design Next Experiments**
   - Based on remaining blind spots
   - Based on new questions that emerged
   - Based on areas of high variance (inconsistent results)

---

## 🛡️ Anti-Hallucination Safeguards

### Mandatory Self-Checks

Before claiming any fact, ask:
1. **Can I cite the line number?** If no → verify or retract
2. **Did I test this claim?** If no → mark as hypothesis
3. **Could I be misremembering?** If yes → re-read the code
4. **Am I pattern-matching from other projects?** If yes → verify this project works the same way

### Red Flags to Watch For

When I say:
- "This should work..." → TEST IT
- "Typically this means..." → VERIFY IT
- "I think this is..." → READ THE CODE
- "Usually you would..." → CHECK IF THAT'S TRUE HERE

### Confidence Calibration

Rate every claim:
- **100%**: Verified by reading code, can cite line numbers
- **90%**: High confidence based on code structure, but not line-by-line verified
- **70%**: Reasonable inference from architecture, but could be wrong
- **50%**: Guess based on common patterns, needs verification
- **<50%**: Speculation, flag as hypothesis

---

## 📊 Success Metrics

### Per-Session Metrics
- Field coverage: % of schema fields successfully extracted
- Confidence: Mean/median/std of confidence scores
- Validation pass rate: % of extractions passing validators
- Cost efficiency: Tokens per field extracted
- Blind spot detection: # of new issues found

### Cross-Session Metrics
- Improvement rate: % increase in accuracy per iteration
- Learning velocity: How fast are we finding+fixing issues
- Stability: Variance in results across sessions
- Coverage growth: # of edge cases now handled

### Meta-Metrics (System Health)
- Prompt clarity: Can a human understand instructions?
- Validator robustness: Do validators catch real errors?
- Schema completeness: Are all needed fields defined?
- Documentation quality: Can someone else run this?

---

## 🔧 Tool Usage During Rigor Protocol

### When to Use TodoWrite
✅ **Use for**:
- Tracking protocol phases (Phase 1: Evidence Gathering → Phase 2: Revision Design)
- Tracking experiments (Session 1-10 status)
- Tracking blind spot fixes (addressing #1, #2, #3...)

❌ **Don't use for**:
- Trivial single-step tasks
- Simple file reads
- Basic git operations

### When to Use Task (Explore Agent)
✅ **Use for**:
- Understanding codebase patterns across many files
- Finding all usages of a concept
- Mapping dependencies and relationships

❌ **Don't use for**:
- Reading a specific known file
- Searching for exact string matches

---

## 📝 Documentation Standards

### Every Code Change Must Include

1. **CHANGELOG.md entry**
   ```markdown
   ## [Version] - [Date]
   ### Changed
   - [What changed]
   ### Why
   - [Blind spot addressed / Problem solved]
   ### Expected Impact
   - [Quantified if possible]
   ### Breaking Changes
   - [What might break]
   ```

2. **Inline Comments for Complex Logic**
   ```typescript
   // RATIONALE: This checks for 1000x errors because agents sometimes
   // extract MSEK values without unit, and wrapper assumes tkr by default.
   // See: EXTRACTION_ROBUSTNESS_ANALYSIS.md Blind Spot #2
   if (Math.abs(value) > MAX_PLAUSIBLE_TKR) {
     // ...
   }
   ```

3. **Version Headers in Prompts**
   ```markdown
   # Financial Agent
   **Version**: 1.1.0
   **Last Updated**: 2025-11-17
   **Changes**: Added explicit currency unit instructions (addresses Blind Spot #2)
   ```

---

## 🚀 Implementation Checklist

When you (Claude) receive instructions to apply this protocol:

### Initial Setup
```
☐ Read this RIGOR_PROTOCOL.md in full
☐ Create experiments/ directory structure
☐ Initialize CHANGELOG.md
☐ Create PATTERNS_THAT_WORK.md, PATTERNS_TO_AVOID.md
☐ Set up session tracking templates
```

### Per-Revision Workflow
```
☐ Follow relevant protocol checklist (Prompts / Validators / Schema)
☐ Document in TodoWrite if multi-phase work
☐ Track confidence ratings on all claims
☐ Cite line numbers for all code references
☐ Update CHANGELOG.md
☐ Feed learnings forward
```

### Per-Experiment Workflow
```
☐ Design experiment using template
☐ Define hypothesis + metrics
☐ Run extraction with instrumentation
☐ Collect results
☐ Analyze patterns
☐ Document learnings
☐ Update master configs if validated
```

### Self-Review Before Completing
```
☐ Did I verify all claims against code?
☐ Did I cite line numbers for assertions?
☐ Did I rate my confidence honestly?
☐ Did I look for new blind spots?
☐ Did I document what I learned?
☐ Did I update the learning database?
```

---

## 🎓 Meta-Learning: Improving This Protocol

This protocol itself should evolve. After every 10 sessions:

1. **Review Protocol Adherence**
   - Were all checklists followed?
   - Which steps were most valuable?
   - Which steps were busywork?

2. **Identify Protocol Gaps**
   - What went wrong that protocol didn't catch?
   - What new rigor mechanisms are needed?
   - What can be automated?

3. **Update Protocol**
   - Add new checklists for new failure modes
   - Remove steps that proved unnecessary
   - Refine success metrics
   - Add learnings to best practices

4. **Version Control Protocol**
   - Tag protocol versions (v1.0.0 → v1.1.0)
   - Document what changed and why
   - Track protocol effectiveness over time

---

## 🎯 TL;DR - Core Requirements

When revising prompts/validators/schema:

1. ✅ **ALWAYS read the code first** (cite line numbers)
2. ✅ **ALWAYS state assumptions explicitly** (write them down)
3. ✅ **ALWAYS test edge cases mentally** (null, missing, ambiguous)
4. ✅ **ALWAYS rate confidence honestly** (0-100%)
5. ✅ **ALWAYS document learnings** (feed forward to next iteration)
6. ✅ **ALWAYS look for new blind spots** (adversarial thinking)
7. ✅ **ALWAYS update CHANGELOG** (what changed + why + impact)
8. ✅ **ALWAYS cross-check consistency** (prompt ↔ validator ↔ schema)

**Motto**: *"Assume hallucination until proven otherwise. Verify everything. Learn relentlessly."*
