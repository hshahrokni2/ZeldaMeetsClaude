# Rigor Framework - Quick Start Guide

This framework ensures systematic, verifiable improvements to the PDF extraction pipeline with compound learning across iterations.

---

## 📚 Core Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **RIGOR_PROTOCOL.md** | Master protocol with checklists for prompts/validators/schema | Before every revision |
| **EXTRACTION_ROBUSTNESS_ANALYSIS.md** | Baseline blind spot analysis (13 issues) | Reference when prioritizing fixes |
| **CHANGELOG.md** | Version history and change tracking | After every change |
| **PATTERNS_THAT_WORK.md** | Proven patterns (update after experiments) | When designing prompts/validators |
| **PATTERNS_TO_AVOID.md** | Anti-patterns that caused failures | When reviewing changes |

---

## 🚀 Quick Start: How to Use This Framework

### For Prompt Revisions

1. **Read** `RIGOR_PROTOCOL.md` → "PROTOCOL: When Revising Prompts"
2. **Follow** the 4-phase checklist (16 steps total):
   - Phase 1: Evidence Gathering (read code, identify assumptions)
   - Phase 2: Revision Design (define success criteria, design changes)
   - Phase 3: Implementation (version control, incremental changes)
   - Phase 4: Validation (self-review, consistency checks)
   - Phase 5: Learning Loop (document learnings, update knowledge base)
3. **Document** changes in `CHANGELOG.md`
4. **Update** `PATTERNS_THAT_WORK.md` or `PATTERNS_TO_AVOID.md`

### For Validation Rule Changes

1. **Read** `RIGOR_PROTOCOL.md` → "PROTOCOL: When Revising Validators"
2. **Follow** the validator-specific checklist (10 steps)
3. **Test** with valid/invalid/edge case data
4. **Validate** the validator (can it produce false positives/negatives?)

### For Schema Changes

1. **Read** `RIGOR_PROTOCOL.md` → "PROTOCOL: When Revising Schema"
2. **Map** dependencies (agents, validators, downstream systems)
3. **Identify** ripple effects (what breaks if I change this?)
4. **Document** in `CHANGELOG.md` with migration notes

---

## 🧪 Running Experiments (10 Parallel Sessions)

### Session Structure

Each session tests **1 hypothesis** on **5-10 documents** with **2-3 prompt variations**.

1. **Copy** `experiments/session_template/EXPERIMENT_TEMPLATE.md` → `experiments/session_001/hypothesis.md`
2. **Fill in**:
   - Hypothesis (specific, testable)
   - Variables (independent, dependent, control)
   - Test documents (with characteristics)
   - Prompts/validators being tested
3. **Run** extractions with instrumentation
4. **Collect** results in `experiments/session_001/results/`
5. **Analyze** using template sections
6. **Document** learnings
7. **Recommend** changes (promote to production or defer)

### After 10 Sessions

1. **Aggregate** findings in `experiments/meta_analysis/`
2. **Update** master configurations (promote winning prompts/validators)
3. **Update** `RIGOR_PROTOCOL.md` with new patterns
4. **Design** next 10 experiments based on learnings

---

## 🎯 Key Principles

### 1. Assume Hallucination Until Proven
- Cite line numbers for all claims
- Verify examples against code
- Rate confidence on every assertion

### 2. Compound Learning
- Track what worked vs failed
- Feed insights back into prompts/validators
- Build institutional knowledge

### 3. Systematic Double-Checking
- Review through 3 lenses: correctness, completeness, consistency
- Every blind spot analysis must find NEW blind spots
- Validators must validate validators

### 4. Explicit Uncertainty
- Rate confidence (0-100%) on all claims
- Mark assumptions clearly
- Flag areas needing empirical validation

---

## 📊 Success Metrics

Track across sessions:
- **Field coverage**: % of schema fields extracted
- **Confidence scores**: Mean/median/std dev
- **Validation pass rate**: % passing validators
- **Cost efficiency**: Tokens per field
- **Blind spot detection**: # new issues found

---

## 🛡️ Anti-Hallucination Safeguards

Before claiming any fact:
1. ✅ Can I cite the line number?
2. ✅ Did I test this claim?
3. ✅ Could I be misremembering?
4. ✅ Am I pattern-matching from other projects?

Red flags:
- "This should work..." → TEST IT
- "Typically this means..." → VERIFY IT
- "I think this is..." → READ THE CODE

---

## 📁 Directory Structure

```
ZeldaMeetsClaude/
├── RIGOR_PROTOCOL.md              ← Master protocol (read first!)
├── RIGOR_FRAMEWORK_README.md      ← This file (quick reference)
├── EXTRACTION_ROBUSTNESS_ANALYSIS.md  ← Baseline blind spots (13 issues)
├── CHANGELOG.md                   ← Version history
├── PATTERNS_THAT_WORK.md          ← Proven patterns
├── PATTERNS_TO_AVOID.md           ← Anti-patterns
├── experiments/
│   ├── session_template/
│   │   └── EXPERIMENT_TEMPLATE.md ← Copy this for each session
│   ├── session_001/
│   │   ├── hypothesis.md
│   │   ├── prompts/
│   │   ├── results/
│   │   └── analysis.md
│   ├── session_002/
│   │   └── ...
│   └── meta_analysis/
│       ├── cross_session_patterns.md
│       ├── winning_configurations.md
│       ├── failure_modes_catalog.md
│       └── next_hypotheses.md
├── agents/                        ← Production prompts
├── lib/                           ← Validators, wrappers
└── schemas/                       ← Schema definitions
```

---

## 🔄 Workflow Example

### Scenario: Fix Blind Spot #2 (Currency Ambiguity)

1. **Read** `EXTRACTION_ROBUSTNESS_ANALYSIS.md` → Blind Spot #2
2. **Read** `RIGOR_PROTOCOL.md` → Prompt Revision Protocol
3. **Phase 1: Evidence Gathering**
   - Read `agents/financial_agent.md:19-23` (current instruction)
   - Read `lib/field-wrapper.ts:53-54` (default assumption)
   - Identify assumption: "agents pre-normalize to tkr"
4. **Phase 2: Revision Design**
   - Success criteria: 95% reduction in currency errors
   - Change: "Extract raw number + unit, let wrapper normalize"
   - Anti-hallucination: Add negative examples
5. **Phase 3: Implementation**
   - Backup: `agents/financial_agent.md.v1.0.0`
   - Update: `agents/financial_agent.md` (v1.1.0)
   - Changelog: Document change + expected impact
6. **Phase 4: Validation**
   - Self-review: Read as if I'm the LLM
   - Consistency check: Does example match instruction?
   - Blind spot check: Did we address #2? Introduce new ones?
7. **Phase 5: Learning**
   - Update `PATTERNS_THAT_WORK.md`: "Explicit unit extraction"
   - Update `PATTERNS_TO_AVOID.md`: "Ambiguous currency instructions"
8. **Experiment** (optional but recommended)
   - Design session_001: Test old vs new prompt
   - Run on 10 documents
   - Measure error reduction
   - If >50% improvement → promote to production

---

## ❓ FAQ

### When should I use TodoWrite?
- Multi-phase work (4+ steps)
- Parallel experiments (tracking 10 sessions)
- Systematic blind spot fixes (addressing #1, #2, #3...)

### When should I update CHANGELOG.md?
- After every prompt revision
- After every validator change
- After every schema update
- When promoting experiment results to production

### How do I know if a pattern is "proven"?
- Tested in 3+ documents across 2+ sessions
- Consistent improvement (>20% on target metric)
- No negative side effects discovered
- Confidence rating >80%

### What if experiment results contradict?
- Document both in `experiments/meta_analysis/`
- Design tie-breaker experiment with larger sample
- Consider context differences (doc type, year, complexity)

### How often should I update the rigor protocol itself?
- After every 10 sessions (meta-learning cycle)
- When discovering protocol gaps
- When finding more efficient workflows

---

## 🎓 Training: How to Instruct Claude

### Session Start Prompt

```
Follow the Rigor Protocol (RIGOR_PROTOCOL.md) for all prompt/validator/schema work.

Key requirements:
1. Cite line numbers for all code references
2. Rate confidence (0-100%) on all claims
3. Follow the relevant checklist (prompts/validators/schema)
4. Document learnings in PATTERNS_THAT_WORK.md or PATTERNS_TO_AVOID.md
5. Update CHANGELOG.md after changes
6. Assume hallucination until proven otherwise

Current task: [Describe what you want Claude to do]

Blind spots to address: [List relevant blind spots from EXTRACTION_ROBUSTNESS_ANALYSIS.md]
```

### For Experiments

```
Design and run Experiment Session [X/10] using the template at:
experiments/session_template/EXPERIMENT_TEMPLATE.md

Hypothesis: [Specific, testable hypothesis]

Test documents: [List 5-10 documents]

Prompt variations: [Describe what you're changing]

Success criteria: [Quantified improvement target]

Follow the Rigor Protocol throughout. Document all learnings.
```

---

## 📞 Support

If you encounter:
- **Contradictory patterns**: Document both, design tie-breaker experiment
- **Unexpected failures**: Add to `PATTERNS_TO_AVOID.md`, analyze root cause
- **Protocol gaps**: Update `RIGOR_PROTOCOL.md`, document in CHANGELOG
- **Measurement challenges**: Add to `experiments/meta_analysis/next_hypotheses.md`

---

## ✅ Final Checklist Before Starting

- [ ] Read `RIGOR_PROTOCOL.md` in full
- [ ] Understand the 4-phase workflow (Evidence → Design → Implementation → Validation → Learning)
- [ ] Locate the relevant checklist for your task (prompts/validators/schema)
- [ ] Set up `experiments/` directory structure
- [ ] Review `EXTRACTION_ROBUSTNESS_ANALYSIS.md` for context
- [ ] Prepare to cite line numbers and rate confidence
- [ ] Commit to compound learning (document everything!)

**Ready to start? Pick a blind spot from the analysis and follow the protocol!**
