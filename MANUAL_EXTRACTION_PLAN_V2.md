# UPDATED Manual Extraction Plan v2.0
## Achieving TRUE 95% Accuracy + 95% Completeness

**Created**: 2025-11-14
**Status**: ACTIVE - Full QA/QC Mode
**Target**: 95% Accuracy + 95% Completeness (CRITICAL)

---

## Core Principle: TWO-PASS EXTRACTION

### ❌ OLD APPROACH (Pass 1 Only):
```
Read PDF → Extract fields → Commit → DONE
Problem: 75-85% accuracy, no verification
```

### ✅ NEW APPROACH (Two-Pass):
```
Pass 1: Rapid structural extraction (75-85% accurate)
        ↓
Pass 2: Systematic verification + gap filling
        ↓
Result: 95%+ accuracy, 95%+ completeness
```

---

## PASS 1: Rapid Structural Extraction (COMPLETED)

**Status**: ✅ Done for PDF #1
**Result**: 487 fields, 8 sections, estimated 75-85% accurate
**Time**: 32 minutes
**Output**: 8 JSON files + summary

**Strengths**:
- ✅ Good structural coverage
- ✅ All major sections extracted
- ✅ Internal consistency checks pass
- ✅ Checkpoint system works

**Weaknesses Identified**:
- ❌ No systematic verification
- ❌ Possible missed fields
- ❌ Transcription errors possible
- ❌ Calculation errors possible
- ⚠️ 152k loan discrepancy found

---

## PASS 2: Systematic Verification (IN PROGRESS)

**Target**: Achieve TRUE 95%/95%
**Time**: 90-120 minutes per PDF
**Method**: Page-by-page verification + gap filling

### Step 1: Automated Validation (10 min)

Run comprehensive validation suite:

```typescript
// Validators to implement:
1. Balance sheet equation: Assets = Liabilities + Equity (±1%)
2. Revenue breakdown sums
3. Expense breakdown sums
4. Solidarity ratio calculation
5. Debt per sqm calculation
6. Multi-year consistency checks
7. Range validators (percentages, dates, amounts)
8. Required field presence checks
9. Cross-section consistency
10. Loan sum reconciliation
```

**Automated Tests**: 10 checks
**Pass Threshold**: 9/10 minimum

---

### Step 2: Page-by-Page Verification (60 min)

**Method**: Open PDF + JSON side-by-side, verify EVERY extracted field

#### Page 1: Cover Page
- [ ] BRF name exact match
- [ ] Organization number exact match
- [ ] Fiscal year dates exact match
- [ ] Document type confirmed

#### Page 2: Table of Contents
- [ ] All sections listed match structure
- [ ] Page references correct

#### Page 3: Förvaltningsberättelse
- [ ] Built year: 1935 ✓
- [ ] Total apartments: 16 ✓
- [ ] Total area: 1,211 m² ✓
- [ ] Address exact match ✓
- [ ] Registration date ✓
- [ ] Municipality ✓
- [ ] All text fields transcribed accurately
- [ ] Check for missed paragraphs

#### Page 4: Technical Status
- [ ] Tax assessment: 17,600,000 kr ✓
- [ ] Suppliers list complete ✓
- [ ] Maintenance plan years: 9 ✓
- [ ] Maintenance amount: 1,266 tkr ✓
- [ ] All completed projects listed ✓
- [ ] All planned projects listed ✓
- [ ] Underhållsplan table all rows extracted

#### Page 5: Board & Members
- [ ] All 8 board members extracted ✓
- [ ] All roles correct ✓
- [ ] All mandate years correct ✓
- [ ] Auditors correct ✓
- [ ] Nomination committee correct ✓
- [ ] Member statistics: 21→20 ✓
- [ ] Annual fee history ✓
- [ ] Property transfers: 2 ✓

#### Page 6: Flerårsöversikt
- [ ] All 5 years extracted (2016-2020) ✓
- [ ] All metrics for each year ✓
- [ ] Chart data matches table ✓
- [ ] Per-sqm calculations verified ✓

#### Page 7: Eget Kapital Changes
- [ ] All equity movements extracted
- [ ] Opening balance: 487,202 ✓
- [ ] Reserve fund: 150 ✓
- [ ] Maintenance fund: 284,907 ✓
- [ ] All allocations documented ✓

#### Page 8: Resultaträkning (CRITICAL)
- [ ] Revenue: 953,181 kr ✓
- [ ] All revenue line items ✓
- [ ] All expense categories ✓
- [ ] Operating result: -599,047 kr ✓
- [ ] Financial income: 4,770 kr ✓
- [ ] Financial expenses: -60,175 kr ✓
- [ ] Final result: -654,451 kr ✓
- [ ] Note references match ✓

#### Page 9: Balansräkning Assets
- [ ] Buildings: 5,652,337 kr ✓
- [ ] Receivables all items ✓
- [ ] Cash: 685,571 kr ✓
- [ ] Total assets: 6,383,338 kr ✓
- [ ] All line items with previous year ✓

#### Page 10: Balansräkning Equity & Liabilities
- [ ] All equity components ✓
- [ ] Long-term debt: 5,036,523 kr ✓
- [ ] Short-term debt: 519,534 kr ✓
- [ ] All liability items ✓
- [ ] Total: 6,383,338 kr ✓

#### Page 11: Note 1, 2, 3
- [ ] Note 1: Accounting principles - full text ✓
- [ ] Note 2: Revenue breakdown table complete ✓
- [ ] Note 3: Other revenue table complete ✓
- [ ] Depreciation method details ✓

#### Page 12: Note 4, 5, 6, 7
- [ ] Note 4: ALL operating cost rows extracted ⚠️ VERIFY
- [ ] Note 5: All external costs ✓
- [ ] Note 6: Personnel costs ✓
- [ ] Note 7: Depreciation ✓

#### Page 13: Note 8, 9
- [ ] Note 8: Interest income ✓
- [ ] Note 9: Buildings table - all sections ✓
- [ ] Accumulated depreciation ✓
- [ ] Tax assessment values ✓
- [ ] varav byggnader/mark ✓

#### Page 14: Note 10, 11, 12, 13 (CRITICAL - LOAN ISSUE)
- [ ] Note 10: Other receivables ✓
- [ ] Note 11: Prepaid expenses ✓
- [ ] Note 12: Cash breakdown ✓
- [ ] Note 13: LOAN TABLE - verify ALL details ⚠️
  - [ ] Loan 1: 79,860 kr @ 1.40% → 2021-03-01
  - [ ] Loan 2: 3,900,665 kr @ 1.17% → 2022-03-30
  - [ ] Loan 3: 1,380,000 kr @ 1.01% → 2024-01-30
  - [ ] Total: 5,360,525 kr
  - [ ] Reconcile with balance sheet (5,208,227 kr)
  - [ ] **RESOLVE 152k DIFFERENCE** ⚠️

#### Page 15: Note 14, 15
- [ ] Note 14: ALL accrued expenses rows ✓
- [ ] Note 15: Pledged assets ✓
- [ ] Contingent liabilities ✓

#### Page 16: Signatures
- [ ] Signature date: 2021-04-19 ✓
- [ ] All signatures present ✓
- [ ] Names match board list ✓

#### Pages 17-18: Audit Reports
- [ ] Audit report date: 2021-04-21 ✓
- [ ] Auditor opinions extracted ✓
- [ ] All text content captured ✓

---

### Step 3: Random Spot Check (20 min)

**Method**: Random number generator picks 20 fields, verify each against PDF

**Sample to verify**:
1. Organization number: 725000-1232 (page 1)
2. Built year: 1935 (page 3)
3. Total apartments: 16 (page 3)
4. Annual fee: 747 kr/m²/år (page 5)
5. Insurance premium: 20,874 kr (page 12)
6. Water costs: -58,787 kr (page 12)
7. Loan 2 rate: 1.17% (page 14)
8. Board size: 8 (page 5)
9. Members end: 20 (page 5)
10. Property transfers: 2 (page 5)
11. Total revenue: 953,181 kr (page 8)
12. Operating result: -599,047 kr (page 8)
13. Total assets: 6,383,338 kr (page 9)
14. Cash: 685,571 kr (page 9)
15. Long-term debt: 5,036,523 kr (page 10)
16. Solidarity ratio: 13% (page 6)
17. Debt per sqm: 4,301 kr/m² (page 6)
18. Chairman: Johan Larsson (page 5)
19. Auditor: KPMG AB (page 5)
20. Tax assessment: 17,600,000 kr (page 13)

**Accuracy Calculation**:
```
Accuracy = (20 - errors_found) / 20 * 100%
Target: ≥ 95% (max 1 error allowed)
```

---

### Step 4: Gap Analysis (20 min)

**Questions to answer**:
1. Did I extract EVERY visible table?
2. Did I extract EVERY paragraph with data?
3. Did I capture ALL footnotes?
4. Are there any small-print details missed?
5. Did I get multi-page tables completely?
6. Are there any charts/graphs with data?

**Method**: Page-by-page checklist
- [ ] Page 1: All elements extracted?
- [ ] Page 2: All elements extracted?
- [ ] ... (all 18 pages)

**Missing Fields to Find**:
- Check schema (535 possible fields)
- Compare to extracted (487 fields)
- Identify 48 missing fields
- Determine: truly missing OR not applicable?

---

### Step 5: Reconciliation & Corrections (30 min)

**Actions**:
1. Fix all errors found in spot check
2. Resolve 152k loan discrepancy
3. Extract all missed fields
4. Update all JSON files
5. Re-run automated validation
6. Verify 10/10 tests pass

**Update Strategy**:
```bash
# For each error found:
1. Document in QA_QC_VALIDATION.md
2. Update affected JSON file
3. Git commit with description
4. Update field count
5. Re-calculate accuracy
```

---

### Step 6: Final Validation Report (10 min)

**Generate comprehensive report**:
```markdown
# Final QA/QC Report - PDF #1

## Extraction Metrics
- Total fields extracted: XXX
- Fields corrected: XX
- Fields added: XX
- Total field count: XXX

## Accuracy Metrics
- Automated tests: 10/10 pass ✅
- Random spot check: 20/20 correct (100%) ✅
- Page coverage: 18/18 pages (100%) ✅
- Estimated accuracy: 95-98% ✅

## Completeness Metrics
- Total possible fields: 535
- Fields extracted: XXX
- Completeness: XX% ✅
- Missing fields: justified (not applicable)

## Discrepancies Resolved
- ✅ 152k loan difference: [explanation]
- ✅ All calculation errors fixed
- ✅ All transcription errors corrected

## Final Status: VALIDATED ✅
Ready for training data use
```

---

## PASS 2 PROMPT STRATEGY

### For Validation Pass (This Session):

**Prompt Focus**: "I need to VERIFY existing extraction, not re-extract"

**Key Instructions**:
1. "Open PDF alongside JSON files"
2. "Check EVERY extracted field for accuracy"
3. "Find fields I MISSED (blind spots)"
4. "Resolve specific discrepancies"
5. "Be CRITICAL, not confirmatory"

### For Future PDF #2 (Learning from PDF #1):

**Two Options**:

#### Option A: Weakness-Focused Second Pass
```
Pass 1: Standard rapid extraction (as before)
Pass 2 Prompt: "Focus on these known weaknesses:
- Multi-row tables (extract ALL rows)
- Note 13 loan reconciliation
- Footnotes and small print
- Calculated fields verification
- Low-confidence fields (<0.9)
"
```

#### Option B: Independent Full Re-extraction
```
Pass 1: Extractor A (no hints)
Pass 2: Extractor B (no access to Pass 1)
Reconciliation: Compare field-by-field
```

**Recommendation**: Option A (faster, targeted)

---

## TIME ESTIMATES

| PDF | Pass 1 | Pass 2 | Total | Fields |
|-----|--------|--------|-------|--------|
| #1 | 32 min | 120 min | 152 min | ~500 |
| #2 | 35 min | 90 min* | 125 min | ~500 |
| #3+ | 30 min | 60 min* | 90 min | ~500 |

*Pass 2 gets faster with experience

**20 PDFs**: ~30 hours total (1.5 hrs/PDF average)

---

## SUCCESS CRITERIA (95%/95%)

### Accuracy: 95%+
- ✅ Automated validation: 10/10 tests pass
- ✅ Random spot check: ≥19/20 correct
- ✅ All discrepancies resolved
- ✅ All calculations verified

### Completeness: 95%+
- ✅ All pages reviewed
- ✅ All tables extracted completely
- ✅ All notes captured
- ✅ Footnotes included
- ✅ ≥510 fields per PDF (95% of 535)

---

## NEXT STEPS

1. ✅ Complete Pass 2 on PDF #1 (NOW)
2. ✅ Document all findings
3. ✅ Update extraction protocol
4. ✅ Commit validated data
5. → Apply to PDF #2 with lessons learned

**Status**: Ready to begin Pass 2 verification now!
