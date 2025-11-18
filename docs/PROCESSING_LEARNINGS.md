# Processing Learnings Database

**Purpose**: Aggregate learnings across all autonomous PDF processing sessions
**Updated**: 2025-11-18

---

## Overview

This document tracks patterns, insights, and improvements discovered across all autonomous processing sessions. Each session contributes learnings that inform future extractions and protocol refinements.

---

## Session History

### Session 1: session_20251118_022212 (Framework Establishment)

**Date**: 2025-11-18
**PDF**: 267197_årsredovisning_norrköping_brf_axet_4.pdf (DEMO)
**Type**: Framework Establishment
**Status**: COMPLETED

**Key Achievements**:
1. Created AUTONOMOUS_SESSION_PROTOCOL.md (5-phase lifecycle)
2. Created RIGOR_PROTOCOL.md (consensus mechanisms, quality standards)
3. Established session isolation structure
4. Validated schema compatibility
5. Demonstrated consensus mechanisms (dual agreement, tiebreaker, etc.)

**Framework Quality**: EXCELLENT
**Infrastructure Readiness**: 100% (pending API keys only)
**Protocol Compliance**: 100%

**Detailed Learnings**: See `sessions/session_20251118_022212/learnings.md`

---

## Cross-Session Patterns

### Consensus Mechanisms

**Session 1 Baseline** (Demonstration):
- Dual Agreement: 60% of fields (expected: 85-90% in real extraction)
- Substantial Agreement: 20% (expected: 5-10%)
- Claude Tiebreaker: 10% (expected: 10-15%)
- All Models Missing: 10% (expected: <5%)

**Next Session**: Track actual consensus distribution vs expectations

---

### Model Performance

**Gemini 2.5 Pro**:
- Expected strengths: Swedish text, financial tables
- Expected weaknesses: TBD (monitor in real extractions)

**GPT-4o**:
- Expected strengths: Structured data, JSON adherence
- Expected weaknesses: TBD (monitor in real extractions)

**Claude 3.7 Sonnet**:
- Expected use: Tiebreaker in 10-15% of cases
- Expected effectiveness: TBD (monitor resolution accuracy)

**Next Session**: Begin tracking model-specific performance metrics

---

### Field Difficulty

**Expected Easy Fields** (high confidence predicted):
- org_number (standard format, always present)
- brf_name (prominent, usually on cover)
- year (standard location, clear format)
- total_assets_tkr (balance sheet, standard Swedish accounting)

**Expected Challenging Fields** (lower confidence predicted):
- chairman_address (sometimes redacted for privacy)
- maintenance_costs_tkr (varies in categorization)
- energy_class (not always reported)
- operating_costs_breakdown (inconsistent presentation)

**Next Session**: Validate predictions, identify actual difficult fields

---

### Agent Success Rates

**Expected High Success** (>90%):
- financial_agent (income statement always present)
- balance_sheet_agent (balance sheet always present)
- chairman_agent (governance section standard)

**Expected Medium Success** (70-90%):
- property_agent (some fields optional)
- energy_agent (reporting varies)
- notes_* agents (depends on accounting detail)

**Expected Variable Success** (<70%):
- leverantörer_agent (supplier data not always detailed)
- events_agent (not all BRFs report significant events)

**Next Session**: Track actual success rates, identify improvement areas

---

## Protocol Effectiveness

### Session Management

**Session Isolation**: ✅ Working well
- Clear audit trail
- Easy debugging
- Supports parallel processing (future)

**Lock Mechanism**: ✅ Implemented
- Prevents concurrent processing
- Needs stale lock detection (30 min timeout)

**Quality Gates**: ✅ Defined
- 15/19 agents minimum
- 60% high confidence threshold
- Critical fields required

**Next Session**: Test quality gates with real extraction

---

### Validation Framework

**Balance Sheet Validation**: ✅ 1% tolerance defined
**Fee Outlier Detection**: ✅ 500-15,000 SEK bounds set
**Swedish Format Validation**: ✅ Regex patterns defined

**Next Session**:
- Test validation effectiveness
- Identify false positives/negatives
- Adjust tolerances if needed

---

## Infrastructure Insights

### Agent Definitions

**Status**: All 19 agents reviewed
**Quality**: Production-ready
**No Changes Needed**: Agents are well-structured

**Monitor in Future Sessions**:
- Keyword coverage (are any fields consistently missed?)
- WHERE TO LOOK accuracy (are page ranges correct?)
- Anti-hallucination effectiveness

---

### Schema Definitions

**Status**: All 8 schemas verified
**Compatibility**: 100% with protocols
**No Changes Needed**: Schemas are production-ready

**Features Working Well**:
- ExtractionField<T> wrapper
- Confidence tracking (0.0-1.0)
- Evidence pages (1-based indexing)
- Original strings for currency fields

---

### Core Libraries

**Files Verified**:
- extraction-workflow.ts (26KB) ✅
- field-wrapper.ts (10KB) ✅
- schema-validator.ts (19KB) ✅
- vision-sectionizer.ts (21KB) ✅
- openrouter-client.ts (23KB) ✅

**Next Session**: Integrate extraction-workflow.ts into autonomous execution

---

## Cost & Performance Tracking

### Estimated vs Actual

**Session 1** (Framework Demo):
- Estimated: $0.00 (no API calls)
- Actual: $0.00 ✅
- Duration: ~2 minutes

**Session 2** (First Real Extraction):
- Estimated: $0.75-1.00
- Actual: TBD
- Duration Estimate: 8-10 minutes
- Duration Actual: TBD

**Full Batch (20 PDFs)**:
- Estimated Total: $15-20
- Estimated Duration: ~3 hours

**Next Session**: Track actual costs and compare to estimates

---

## Improvement Recommendations

### Immediate (Session 2)

1. **Configure API Keys**
   - Add to .env file
   - Test all 3 API providers (Anthropic, OpenAI, Google)

2. **Create extract-single-pdf.ts Script**
   - CLI wrapper around extraction-workflow.ts
   - Implements autonomous session protocol
   - Handles errors and retries

3. **Run First Real Extraction**
   - Process one PDF completely
   - Validate all protocols
   - Compare results to framework demo

---

### Short-Term (Sessions 3-5)

1. **Stale Lock Detection**
   - Add 30-minute timeout
   - Create recovery mechanism for crashed sessions

2. **Cost Budget Limits**
   - Optional max_cost_per_pdf parameter
   - Abort if exceeded

3. **Progressive Quality Thresholds**
   - Early abort if first 5 agents fail
   - Optimize based on early success patterns

---

### Long-Term (After Session 10)

1. **Model Performance Analysis**
   - Which model is best for which field types?
   - Should we adjust model selection?
   - Are tiebreaker invocations at expected rate?

2. **Confidence Score Calibration**
   - Compare predicted confidence to actual accuracy
   - Adjust scoring formulas if needed

3. **Agent Optimization**
   - Refine keywords based on miss patterns
   - Update WHERE TO LOOK based on actual page locations
   - Enhance prompts for low-performing agents

4. **Protocol Refinements**
   - Update quality thresholds based on actual distributions
   - Adjust validation tolerances
   - Optimize retry policies

---

## Recurring Issues

### None Yet

**This section will track**:
- Fields consistently difficult to extract
- Agents with high failure rates
- Validation rules with false positives/negatives
- Cost overruns or performance issues

**Update after each session**: Add patterns seen in ≥2 sessions

---

## Success Metrics Over Time

### Target Benchmarks

**Extraction Quality**:
- High confidence fields: ≥80%
- Agent success rate: ≥85% (16+/19)
- Balance sheet validation: ≥90%
- Critical fields present: 100%

**Cost & Performance**:
- Cost per PDF: $0.70-1.00
- Duration per PDF: 8-10 minutes
- Retry rate: <10%

**Protocol Compliance**:
- Session completion: 100%
- Quality gate pass: ≥90%

### Actual Performance

**Session 1**: Framework establishment only (no extraction metrics)

**Session 2+**: TBD

---

## Knowledge Base

### Swedish BRF Report Characteristics

**Standard Sections** (observed in agent definitions):
1. Styrelse (Board) - governance info
2. Resultaträkning (Income Statement) - financial data
3. Balansräkning (Balance Sheet) - assets/liabilities
4. Noter (Notes) - detailed breakdowns
5. Revisionsberättelse (Audit Report) - auditor statement

**Common Keywords**:
- Intäkter (Revenue)
- Kostnader (Costs)
- Tillgångar (Assets)
- Skulder (Liabilities)
- Årsavgift (Annual fee)
- Styrelseordförande (Chairman)

**Document Variations** (from README.md):
- 55% comprehensive reports
- 30% visual summaries
- 15% financial heavy

**Next Session**: Start categorizing PDFs by type, track extraction quality by category

---

## Future Research Questions

1. **Model Selection Optimization**
   - Is Gemini + GPT-4o the optimal pair?
   - Should we try other combinations?
   - Can we reduce costs without sacrificing quality?

2. **Consensus Threshold Tuning**
   - Is dual agreement threshold (0.95) calibrated correctly?
   - Should tiebreaker confidence be higher/lower?
   - Do normalized values need different scoring?

3. **Extraction Strategy**
   - Would page-by-page extraction be more accurate than section-based?
   - Should we extract tables separately from text?
   - Can we optimize by extracting critical fields first?

4. **Training Data Quality**
   - What confidence threshold for training data inclusion?
   - Should we manually review borderline cases?
   - How to handle missing fields in training?

---

## Session Comparison Template

*To be populated after Session 2+*

| Session | PDF ID | Agents Success | High Conf % | Cost | Duration | Quality Tier |
|---------|--------|----------------|-------------|------|----------|--------------|
| 1 | 267197 | 3/19 (DEMO) | 88.9% | $0.00 | 2m | DEMO |
| 2 | TBD | TBD | TBD | TBD | TBD | TBD |

---

**Last Updated**: Session 1 (2025-11-18)
**Next Update**: After Session 2 (first real extraction)
