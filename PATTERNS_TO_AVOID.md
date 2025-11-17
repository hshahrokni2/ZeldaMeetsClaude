# Patterns to Avoid

**Purpose**: Document anti-patterns that led to failures or blind spots
**Update**: After each failed experiment or blind spot discovery

---

## Prompt Engineering Anti-Patterns

### ❌ Ambiguous Currency Instructions
**Anti-Pattern**: Telling agents "extract value in tkr" without clarifying normalization
**Example** (agents/financial_agent.md:19-23):
```markdown
Extract NUMERIC value in tkr (thousands)
Example: "12,5 MSEK" → total_revenue_tkr: 12.5
```
**Problem**: Is 12.5 the raw number or already normalized? Causes 1000x errors
**Evidence**: Blind Spot #2 in EXTRACTION_ROBUSTNESS_ANALYSIS.md
**Impact**: Critical (1000x underestimate)
**Fix**: Separate extraction from normalization
**Confidence**: 95%

---

### ❌ Substring-Based Section Matching
**Anti-Pattern**: Using bidirectional substring matching for routing
**Example** (extraction-workflow.ts:203):
```typescript
if (section.title.includes(sectionPattern) || sectionPattern.includes(section.title))
```
**Problem**: "Noterade lån" matches "Noter" → routes notes agents to wrong section
**Evidence**: Blind Spot #4
**Impact**: Medium (agents get irrelevant pages)
**Fix**: Use fuzzy matching with scoring
**Confidence**: 85%

---

### ❌ Implicit Default Assumptions
**Anti-Pattern**: Assuming defaults without documenting them
**Example** (field-wrapper.ts:53):
```typescript
// Default: assume tkr (most common in BRF reports)
return 'tkr';
```
**Problem**: If assumption is wrong, silent 1000x error occurs
**Evidence**: Blind Spot #2
**Impact**: Critical
**Fix**: Make assumptions explicit in prompts
**Confidence**: 90%

---

## Validation Anti-Patterns

### ❌ Validating Only One Direction
**Anti-Pattern**: Checking for over-estimates but not under-estimates
**Example**: Validator checks if value > 1M tkr (too large) but not if value < 10 tkr (too small)
**Problem**: Miss 1000x underestimates (12.5 instead of 12,500)
**Evidence**: Blind Spot #2
**Impact**: Critical
**Fix**: Add symmetric validation (min + max thresholds)
**Confidence**: 95%

---

### ❌ Validating Without Context
**Anti-Pattern**: Validating individual fields without checking relationships
**Example**: Validate total_assets_tkr exists, but not if it equals sum of components
**Problem**: Internal consistency but cross-field contradictions
**Evidence**: Blind Spot #3
**Impact**: Medium
**Fix**: Add cross-field validation rules
**Confidence**: 85%

---

### ❌ Silent Success After Data Loss
**Anti-Pattern**: Logging "✅ Success" after salvaging truncated JSON without tracking what was lost
**Example** (extraction-workflow.ts:386):
```typescript
console.warn(`✅ JSON repaired successfully! Salvaged ${Object.keys(data).length} fields`);
```
**Problem**: User doesn't know 3/11 fields were discarded
**Evidence**: Blind Spot #6
**Impact**: Medium (silent data loss)
**Fix**: Track expected vs salvaged field count
**Confidence**: 90%

---

## Schema Design Anti-Patterns

### ❌ Generic Field Names
**Anti-Pattern**: Using non-specific names like `value`, `data`, `result`
**Problem**: Not grep-able, ambiguous meaning
**Fix**: Use specific names like `total_revenue_tkr`, `net_result_tkr`
**Confidence**: 95%

---

### ❌ Inconsistent Suffixes
**Anti-Pattern**: Mixing `_tkr`, `_thousands`, `_currency` for same concept
**Problem**: Hard to find all currency fields
**Fix**: Standardize on `_tkr` for all currency fields
**Confidence**: 90%

---

### ❌ Missing Nullability Definition
**Anti-Pattern**: Not explicitly defining if field can be null
**Problem**: Ambiguity in validation (is null an error or valid?)
**Fix**: Explicitly mark nullable fields in schema
**Confidence**: 85%

---

## System Architecture Anti-Patterns

### ❌ Fallback Without Cost Estimation
**Anti-Pattern**: Running all agents on full document if sectionization fails
**Example** (extraction-workflow.ts:228):
```typescript
// Fallback: If no sections matched, run all agents on full document
```
**Problem**: Cost explosion (20 pages × 19 agents = $2-5 instead of $0.30)
**Evidence**: Blind Spot #1
**Impact**: Critical
**Fix**: Add cost estimate + quality check before fallback
**Confidence**: 95%

---

### ❌ Collecting Alternatives Without Using Them
**Anti-Pattern**: Storing `alternative_values` but no consensus logic
**Problem**: Manual review required for every field with conflicts
**Evidence**: Blind Spot #8
**Impact**: Medium
**Fix**: Implement consensus resolution algorithm
**Confidence**: 80%

---

## Error Handling Anti-Patterns

### ❌ Catching Errors Too Broadly
**Anti-Pattern**: `try { ... } catch (e) { /* continue */ }` without logging
**Problem**: Silent failures, no way to debug
**Fix**: Log errors with context, count failure rates
**Confidence**: 95%

---

### ❌ Retry Without Backoff
**Anti-Pattern**: Immediate retry on rate limit
**Problem**: Amplifies rate limit issues
**Fix**: Exponential backoff (already implemented in vision-sectionizer.ts:342)
**Confidence**: 100% (proven pattern)

---

## Documentation Anti-Patterns

### ❌ Examples That Contradict Instructions
**Anti-Pattern**: Text says "do X" but example shows "Y"
**Example**: Instruction says "extract in tkr" but example shows raw MSEK value
**Problem**: LLM follows example, not instruction
**Evidence**: Common in prompt engineering
**Impact**: High
**Fix**: Verify examples match instructions (checklist item)
**Confidence**: 90%

---

### ❌ Vague Error Messages
**Anti-Pattern**: "Validation failed" without specifics
**Problem**: User doesn't know what to fix
**Fix**: Include field name, expected format, actual value, recommendation
**Confidence**: 95%

---

## Notes

- This document should grow with each failed experiment
- Add evidence (code references, blind spot numbers)
- Rate impact (Critical/Medium/Low)
- Include fix recommendations
- Remove if pattern proves acceptable in some contexts
