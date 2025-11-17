# How to Instruct Claude: Enforcing Maximum Rigor

**Purpose**: Instructions for how to tell Claude to follow the Rigor Protocol on every task
**Version**: 1.0.0

---

## 🎯 TL;DR - Copy-Paste This at Session Start

```
RIGOR PROTOCOL ENABLED

Read and follow RIGOR_PROTOCOL.md for all work on prompts, validators, and schemas.

Mandatory requirements:
1. ✅ Cite line numbers for all code references
2. ✅ Rate confidence (0-100%) on all claims
3. ✅ Follow the relevant protocol checklist
4. ✅ Document learnings (PATTERNS_THAT_WORK.md / PATTERNS_TO_AVOID.md)
5. ✅ Update CHANGELOG.md after changes
6. ✅ Assume hallucination until proven otherwise

Current task: [DESCRIBE YOUR TASK HERE]

Blind spots to address: [LIST RELEVANT BLIND SPOTS OR "TBD"]
```

---

## 📋 Session Templates by Task Type

### For Prompt Revisions

```
TASK: Revise [agent_name] prompt to address [specific blind spot or issue]

PROTOCOL: Follow RIGOR_PROTOCOL.md → "PROTOCOL: When Revising Prompts"

REQUIREMENTS:
1. Phase 1: Evidence Gathering
   - Read agents/[agent_name].md (cite line numbers)
   - Read schemas/brf-schema-v1.0.0.ts (target fields)
   - Read lib/schema-validator.ts (validation rules)
   - Read lib/field-wrapper.ts (normalization logic)
   - Identify current assumptions (write them down)

2. Phase 2: Revision Design
   - Define success criteria (quantified)
   - Design changes with rationale
   - Add anti-hallucination safeguards
   - Audit for clarity/precision

3. Phase 3: Implementation
   - Backup current version (agents/[agent_name].md.v1.0.0)
   - Version control + CHANGELOG.md entry
   - Implement incrementally

4. Phase 4: Validation
   - Self-review checklist (16 items)
   - Cross-system consistency check
   - Blind spot re-analysis
   - Confidence rating

5. Phase 5: Learning Loop
   - Document learnings
   - Update PATTERNS_THAT_WORK.md or PATTERNS_TO_AVOID.md

DELIVERABLES:
- Updated agents/[agent_name].md with version header
- CHANGELOG.md entry
- Learning database updates
- Confidence rating on changes (0-100%)

BLIND SPOTS ADDRESSED: [List from EXTRACTION_ROBUSTNESS_ANALYSIS.md]
```

---

### For Validator Changes

```
TASK: Add/revise validation rule for [field or condition]

PROTOCOL: Follow RIGOR_PROTOCOL.md → "PROTOCOL: When Revising Validators"

REQUIREMENTS:
1. Map validation landscape (all validators, gaps, redundancies)
2. Trace validation flow (when called, what happens on failure)
3. Define validation objective (what failure mode are we preventing?)
4. Design rule logic (plain English first, then code)
5. Cross-validation checks (conflicts? alignment with prompts?)
6. Implement with defense in depth (handle edge cases)
7. Test with valid/invalid/edge/malformed data
8. Validate the validator (false positives? false negatives?)

DELIVERABLES:
- Updated lib/schema-validator.ts (or new validator file)
- Test cases demonstrating rule works
- CHANGELOG.md entry
- Confidence rating (0-100%)

BLIND SPOTS ADDRESSED: [List from EXTRACTION_ROBUSTNESS_ANALYSIS.md]
```

---

### For Schema Changes

```
TASK: Add/modify schema field [field_name]

PROTOCOL: Follow RIGOR_PROTOCOL.md → "PROTOCOL: When Revising Schema"

REQUIREMENTS:
1. Map dependencies (agents, validators, downstream systems)
2. Identify ripple effects (what breaks if I change this?)
3. Field naming precision (unambiguous, consistent suffix, grep-able)
4. Type safety (specific type, nullability, units, constraints)
5. Metadata richness (description, source_section, examples, validation refs)

DELIVERABLES:
- Updated schemas/brf-schema-v1.0.0.ts
- Migration notes (if breaking change)
- CHANGELOG.md entry
- List of affected agents/validators
- Confidence rating (0-100%)

BREAKING CHANGES: [Yes/No - if yes, describe migration path]
```

---

### For Running Experiments

```
TASK: Design and run Experiment Session [X/10]

PROTOCOL: Follow RIGOR_PROTOCOL.md → "LEARNING PROTOCOL: 10 Parallel Sessions"

HYPOTHESIS: [Specific, testable, falsifiable hypothesis]

EXAMPLE: "Adding explicit unit extraction instructions to financial_agent will reduce currency normalization errors by >50%"

REQUIREMENTS:
1. Copy experiments/session_template/EXPERIMENT_TEMPLATE.md → experiments/session_[XXX]/hypothesis.md
2. Fill in:
   - Hypothesis (specific, testable)
   - Variables (independent, dependent, control)
   - Test documents (5-10 with characteristics)
   - Prompts/validators being tested (2-3 variations)
   - Success criteria (quantified improvement target)
3. Run extractions with instrumentation
4. Collect results in experiments/session_[XXX]/results/
5. Analyze using template sections
6. Document learnings
7. Recommend changes (promote to production or defer)

DELIVERABLES:
- Completed experiments/session_[XXX]/hypothesis.md
- Results files (JSON + metrics)
- Analysis with confidence ratings
- Recommendations for production (if applicable)
- Updates to PATTERNS_THAT_WORK.md / PATTERNS_TO_AVOID.md

METRICS TO TRACK:
- Field coverage (% of schema)
- Confidence scores (mean/median/std)
- Validation errors/warnings (count by type)
- Cost per document (tokens + $)
- Extraction time (seconds)
- Hallucination rate
- Miss rate
```

---

## 🛡️ Anti-Hallucination Enforcement

### Mandatory Self-Checks (Ask Claude to Perform These)

Before claiming any fact:
```
VERIFY CHECKLIST:
☐ Can you cite the exact line number? (If no → re-read the code)
☐ Did you test this claim? (If no → mark as hypothesis)
☐ Could you be misremembering? (If yes → verify against code)
☐ Are you pattern-matching from other projects? (If yes → verify this project works the same)

CONFIDENCE RATING: [0-100%]
- 100%: Verified by reading code, can cite line numbers
- 90%: High confidence based on code structure
- 70%: Reasonable inference, but could be wrong
- 50%: Guess based on patterns, needs verification
- <50%: Speculation, flag as hypothesis
```

### Red Flag Phrases (Train Claude to Catch These)

When Claude says these phrases, ask for verification:
```
❌ "This should work..." → Ask: "Did you test it?"
❌ "Typically this means..." → Ask: "Can you verify in THIS codebase?"
❌ "I think this is..." → Ask: "Can you cite the line number?"
❌ "Usually you would..." → Ask: "Does this project do that?"
❌ "Based on my knowledge..." → Ask: "Based on what code did you read?"
```

### Forcing Citations

Use this prompt structure:
```
For every claim you make:
1. Cite the file path + line number
2. Quote the relevant code snippet
3. Rate your confidence (0-100%)

Example format:
CLAIM: The validator allows null values for currency fields
EVIDENCE: lib/schema-validator.ts:266-269
CODE:
  // Value is null - completely valid, no warning
  if (value === null || value === undefined) {
    return;
  }
CONFIDENCE: 100% (verified by reading code)
```

---

## 📊 Compound Learning Enforcement

### After Every Task

```
LEARNING LOOP:

1. What worked?
   → Add to PATTERNS_THAT_WORK.md with:
     - Pattern description
     - Example
     - Evidence (which session/document)
     - Confidence rating

2. What failed?
   → Add to PATTERNS_TO_AVOID.md with:
     - Anti-pattern description
     - Example (code that failed)
     - Problem explanation
     - Evidence (blind spot number or session results)
     - Fix recommendation
     - Confidence rating

3. What was surprising?
   → Document in experiment notes
   → Design follow-up hypothesis if needed

4. What needs empirical validation?
   → Add to experiments/meta_analysis/next_hypotheses.md

Update CHANGELOG.md with:
- What changed
- Why (blind spot addressed / problem solved)
- Expected impact (quantified if possible)
- Breaking changes (if any)
```

---

## 🔄 Feedback Loop for 10 Parallel Sessions

### After Each Session

```
SESSION [X/10] COMPLETE

Review:
☐ Was hypothesis confirmed or rejected?
☐ What was confidence level on findings? (0-100%)
☐ Were success criteria met?
☐ Any unexpected behaviors discovered?
☐ Any new blind spots identified?

Document:
☐ Update experiments/session_[XXX]/analysis.md
☐ Add learnings to PATTERNS_THAT_WORK.md or PATTERNS_TO_AVOID.md
☐ If applicable, queue for promotion to production

Next:
☐ Design Session [X+1] based on learnings
☐ Carry forward insights to next hypothesis
```

### After Every 10 Sessions

```
META-ANALYSIS REQUIRED

Aggregate:
1. Cross-session patterns (experiments/meta_analysis/cross_session_patterns.md)
   - What patterns emerged in 3+ sessions?
   - What correlations exist? (e.g., "longer prompts → higher cost but not higher accuracy")

2. Winning configurations (experiments/meta_analysis/winning_configurations.md)
   - Best prompt per agent (after N tests)
   - Best validation rules (after N tests)
   - Promotion history (what was promoted when)

3. Failure modes catalog (experiments/meta_analysis/failure_modes_catalog.md)
   - All failure modes discovered
   - Frequency of each
   - Root causes
   - Mitigation strategies

4. Next hypotheses (experiments/meta_analysis/next_hypotheses.md)
   - Queue of ideas based on learnings
   - Prioritization (impact × ease)

Update:
☐ Promote best configs to production (agents/, lib/, schemas/)
☐ Update RIGOR_PROTOCOL.md with new patterns
☐ Update CHANGELOG.md with meta-learnings
☐ Design next 10 experiments
```

---

## 🎓 Training Examples

### Example 1: Fixing Blind Spot #2 (Currency Ambiguity)

**User Instruction:**
```
RIGOR PROTOCOL ENABLED

Task: Fix Blind Spot #2 (Currency Ambiguity) in financial_agent

Follow RIGOR_PROTOCOL.md → "PROTOCOL: When Revising Prompts"

Requirements:
1. Read agents/financial_agent.md (cite line numbers for ambiguous instructions)
2. Read lib/field-wrapper.ts (cite default assumption logic)
3. Identify the mismatch between prompt and wrapper
4. Design new instruction that eliminates ambiguity
5. Add negative examples for common errors
6. Update CHANGELOG.md
7. Rate confidence on fix (0-100%)

Success criteria:
- Prompt clearly separates extraction from normalization
- Examples show raw value + unit preservation
- Wrapper logic compatible with new instruction

Deliverables:
- Updated agents/financial_agent.md (v1.1.0)
- CHANGELOG.md entry
- Confidence rating
```

**Expected Claude Response Format:**
```
PHASE 1: EVIDENCE GATHERING

Current Implementation Analysis:

1. agents/financial_agent.md:19-23
   CURRENT INSTRUCTION:
   "Extract NUMERIC value in tkr (thousands)
   Example: '12,5 MSEK' → total_revenue_tkr: 12.5"

   PROBLEM: Ambiguous - is 12.5 the raw number or pre-normalized?
   CONFIDENCE: 100% (verified by reading file)

2. lib/field-wrapper.ts:53-54
   DEFAULT ASSUMPTION:
   "// Default: assume tkr (most common in BRF reports)
   return 'tkr';"

   PROBLEM: If agent extracts "12.5" without unit, wrapper assumes tkr → 1000x underestimate
   CONFIDENCE: 100% (verified by reading file)

MISMATCH IDENTIFIED:
- Prompt says "extract value in tkr" (implies normalization)
- Example shows "12.5" for "12,5 MSEK" (raw number, no normalization)
- Wrapper assumes tkr if no unit → 12.5 tkr instead of 12,500 tkr
CONFIDENCE: 95% (logical inference from code)

PHASE 2: REVISION DESIGN

Success Criteria:
- Currency errors reduced by >80% (target: <1 error per 10 docs)
- Field coverage maintained or improved
- No increase in hallucination rate

Proposed Change:
1. Separate extraction from normalization
2. Instruct agents to extract RAW number + unit
3. Let wrapper handle conversion
4. Add explicit negative examples

New Instruction (DRAFT):
"""
Extract the numeric value AS WRITTEN, including the unit:
- "12,5 MSEK" → value: 12.5, unit: "MSEK"
- "1 250 tkr" → value: 1250, unit: "tkr"
- "2 500 000 SEK" → value: 2500000, unit: "SEK"

DO NOT pre-convert to tkr. The wrapper will normalize.

❌ WRONG: "12,5 MSEK" → 12.5 (missing unit - causes 1000x error!)
✅ CORRECT: "12,5 MSEK" → value: 12.5, unit: "MSEK"
"""

Anti-Hallucination Safeguards Added:
- Explicit "DO NOT" instruction
- Negative example with warning
- Multiple positive examples

CONFIDENCE: 85% (design sound but needs testing)

PHASE 3: IMPLEMENTATION

[Shows backup creation, file update, CHANGELOG.md entry]

PHASE 4: VALIDATION

Self-Review:
☐ Read as LLM - is every instruction clear? YES
☐ Internal contradictions? NO
☐ Examples match instructions? YES (verified)
☐ Terminology matches schema? YES (verified against schemas/brf-schema-v1.0.0.ts)
☐ Units match wrapper expectations? YES (verified against lib/field-wrapper.ts:69-114)

Cross-System Consistency:
☐ Prompt instruction matches validator expectation? YES
☐ Example output passes validator? [NEEDS TESTING]
☐ Field naming matches schema? YES
☐ Currency normalization matches wrapper? YES

Blind Spot Re-Analysis:
☐ Addresses Blind Spot #2? YES
☐ Introduces new blind spots? POSSIBLY (multi-currency docs - see note)
☐ Edge cases covered? PARTIALLY (Swedish number formats yes, EUR no)

CONFIDENCE RATING:
- This will improve extraction: 85%
- This won't break existing functionality: 90%
- This addresses Blind Spot #2: 95%

Assumptions that could invalidate:
- Assumes wrapper correctly detects units (verified: yes)
- Assumes agents can extract units accurately (needs testing)
- Assumes no multi-currency documents (FALSE - doc_004 had EUR in experiment)

PHASE 5: LEARNING LOOP

Added to PATTERNS_THAT_WORK.md:
- "Explicit unit extraction reduces ambiguity"
- Confidence: 85% (needs experiment validation)

Added to PATTERNS_TO_AVOID.md:
- "Ambiguous currency instructions" (with this as example)
- Confidence: 95%

RECOMMENDATION FOR NEXT STEP:
Design Experiment Session 001 to test:
- Control: Current prompt (v1.0.0)
- Treatment: New prompt (v1.1.0)
- Documents: 10 diverse BRF reports
- Metric: Currency error count
- Hypothesis: >80% reduction in errors
```

---

### Example 2: Running an Experiment

**User Instruction:**
```
RIGOR PROTOCOL ENABLED

Task: Run Experiment Session 001 - Test currency extraction changes

Hypothesis: "Adding explicit unit extraction instructions to financial_agent will reduce currency normalization errors by >80%"

Requirements:
1. Copy experiments/session_template/EXPERIMENT_TEMPLATE.md → experiments/session_001/hypothesis.md
2. Test documents: [provide list of 10 documents]
3. Prompts:
   - Control: agents/financial_agent.md.v1.0.0
   - Treatment: agents/financial_agent.md.v1.1.0
4. Track metrics: field coverage, confidence, errors, cost
5. Document in hypothesis.md using template structure
6. Confidence rating on findings
7. Recommendation: promote to production or defer

Success criteria: >80% reduction in currency errors
```

**Expected Claude Response Format:**
```
EXPERIMENT SESSION 001: Currency Unit Extraction

[Fills out complete template with real data]

RESULTS SUMMARY:

Control (v1.0.0):
- Currency errors: 16/10 docs (1.6 per doc)
- Field coverage: 68% ± 8%
- Avg confidence: 0.80 ± 0.05

Treatment (v1.1.0):
- Currency errors: 2/10 docs (0.2 per doc) ✅ -87.5% reduction
- Field coverage: 87% ± 6% ✅ +19 pp
- Avg confidence: 0.86 ± 0.04 ✅ +0.06

HYPOTHESIS: CONFIRMED
- Target: >80% reduction → Achieved: 87.5% ✅
- Confidence: 95% (consistent across all docs)

LEARNINGS:
1. Explicit unit extraction eliminates ambiguity
   → Add to PATTERNS_THAT_WORK.md

2. Negative examples prevent specific errors
   → Generalize to other agents

3. Multi-currency documents need special handling
   → doc_004 had EUR, current schema doesn't support
   → Design Session 002 to address

RECOMMENDATION: PROMOTE TO PRODUCTION
- Evidence: 87.5% error reduction, 19pp coverage improvement
- Risk: 8% cost increase (acceptable ROI)
- Confidence: 95%
- Action: Update agents/financial_agent.md to v1.1.0 immediately

NEXT STEPS:
1. Promote v1.1.0 to production
2. Update CHANGELOG.md
3. Design Session 002: Multi-currency support
4. Apply pattern to other currency-handling agents
```

---

## 🎯 Summary: The Contract

**When you say:** "Follow the Rigor Protocol"

**Claude must:**
1. ✅ Read and cite code before making claims
2. ✅ Rate confidence on all assertions (0-100%)
3. ✅ Follow the phase-by-phase checklist for the task type
4. ✅ Document learnings (PATTERNS_THAT_WORK.md / PATTERNS_TO_AVOID.md)
5. ✅ Update CHANGELOG.md with version, changes, rationale, impact
6. ✅ Assume hallucination until proven by code
7. ✅ Perform self-checks (verify checklist, confidence rating)
8. ✅ Feed learnings forward (compound knowledge)

**Claude must NOT:**
- ❌ Make claims without citing line numbers
- ❌ Say "this should work" without testing
- ❌ Use vague confidence ("probably", "likely" → use percentages)
- ❌ Skip checklist steps
- ❌ Forget to document learnings
- ❌ Update code without updating CHANGELOG.md

**Quality Bar:**
- Rigor on par with GraphLang and DSPy (but applied manually)
- Healthy distrust in own abilities (verify everything)
- Maximum blind spot detection (adversarial thinking)
- Compound learning (every iteration builds on previous)

---

## 📁 Quick Reference

**Start of Session:**
1. Say: "RIGOR PROTOCOL ENABLED"
2. Specify: Task type (prompt/validator/schema/experiment)
3. Point to: Relevant blind spots or "TBD"
4. Expect: Claude to follow checklist, cite code, rate confidence

**During Work:**
- Watch for red flag phrases → ask for verification
- Require line number citations
- Require confidence ratings (0-100%)

**End of Session:**
- Verify CHANGELOG.md updated
- Verify PATTERNS_*.md updated
- Verify confidence ratings provided
- Verify learning loop completed

**After 10 Sessions:**
- Require meta-analysis
- Update master configs (promote winners)
- Update RIGOR_PROTOCOL.md with new patterns
- Design next 10 experiments

---

## ✅ Checklist: Am I Enforcing Rigor?

Before ending session:
- [ ] Did Claude cite line numbers for all code claims?
- [ ] Did Claude rate confidence on major assertions?
- [ ] Was the relevant protocol checklist followed?
- [ ] Was CHANGELOG.md updated?
- [ ] Were PATTERNS_*.md updated with learnings?
- [ ] Did Claude identify assumptions explicitly?
- [ ] Did Claude perform self-checks (verify checklist)?
- [ ] Did Claude look for new blind spots?
- [ ] Was learning fed forward to next iteration?

If any unchecked → ask Claude to complete before closing session.
