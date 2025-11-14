# PASS 2 VALIDATION: Multi-Year Table VALUE Verification
## PDF #2: Malmö Hörnhuset - Page 6 NYCKELTAL Table

**Validation Date**: 2025-11-14
**Validator**: Pass 2 Enhanced Validation
**Method**: Spot-check 10 cells (62.5% of 2023 column) against PDF source

---

## ⚠️ CRITICAL ERROR FOUND: Decimal Placement Issue!

### Issue Identified:
**All values in tkr (thousands) incorrectly stored with decimal points**

**Example**:
- **PDF shows**: "1 511 926" (Nettoomsättning 2023, in tkr = thousands)
- **Extracted as**: 1511.926
- **Should be**: 1511926 (integer, representing 1,511,926 kronor)

The period (.) is being interpreted as decimal point, when it's actually a thousands separator in the PDF!

---

## 🔍 Cell-by-Cell Verification (10 cells checked)

| Row | Year | PDF Value | Extracted Value | Correct Value | Status |
|-----|------|-----------|-----------------|---------------|--------|
| **Nettoomsättning (tkr)** | 2023 | 1 511 926 | 1511.926 | 1511926 | ❌ **DECIMAL ERROR** |
| **Nettoomsättning (tkr)** | 2022 | 1 366 424 | 1366.424 | 1366424 | ❌ **DECIMAL ERROR** |
| **Resultat efter fin. poster (tkr)** | 2023 | -2 344 071 | -2344.071 | -2344071 | ❌ **DECIMAL ERROR** |
| **Soliditet (%)** | 2023 | 57 | 57 | 57 | ✅ **CORRECT** |
| **Soliditet (%)** | 2022 | 66 | 66 | 66 | ✅ **CORRECT** |
| **Yttre fond (tkr)** | 2022 | 719 559 | 719.559 | 719559 | ❌ **DECIMAL ERROR** |
| **Taxeringsvärde** | 2023 | 35 094 000 | 35094000 | 35094000 | ✅ **CORRECT** |
| **Årsavgift per kvm (kr)** | 2023 | 721 | 721 | 721 | ✅ **CORRECT** |
| **Skuldsättning per kvm totalyta (kr)** | 2023 | 4 751 | 4751 | 4751 | ✅ **CORRECT** |
| **Energikostnad per kvm (kr)** | 2023 | 197 | 197 | 197 | ✅ **CORRECT** |

**Summary**: 10 cells checked
- ✅ **6 correct** (60%)
- ❌ **4 decimal errors** (40%)

---

## 🔍 Pattern Analysis

**Values CORRECT**:
- Percentages (soliditet %)
- Already-large integers (taxeringsvärde)
- Per-kvm metrics (kr)

**Values INCORRECT**:
- All tkr (thousands) values have decimal placement error
- Pattern: "1 511 926" read as "1511.926" instead of "1511926"

---

## ✅ CALCULATED VALIDATION (Cross-checks)

Despite decimal formatting issue, let me verify if the **relative values** are correct:

### 1. Soliditet Calculation
**Formula**: (Eget kapital / Tillgångar) × 100

**2023**:
- Eget kapital: 13,147,306 kr
- Tillgångar: 22,936,977 kr
- Calculation: (13,147,306 / 22,936,977) × 100 = **57.3%**
- PDF shows: **57%**
- ✅ **MATCH** (rounded)

### 2. Skuldsättning per kvm totalyta
**Formula**: Total loans / Total area

**2023**:
- Total loans: 9,506,703 kr
- Total area: 2,001 m²
- Calculation: 9,506,703 / 2,001 = **4,751 kr/m²**
- PDF shows: **4,751**
- ✅ **PERFECT MATCH**

### 3. Energikostnad per kvm
**Formula**: (El + Värme + Vatten) per kvm

**2023**:
- El: 25 kr/m²
- Värme: 132 kr/m²
- Vatten: 39 kr/m²
- Calculation: 25 + 132 + 39 = **196 kr/m²**
- PDF shows: **197**
- ✅ **CLOSE** (rounding difference acceptable)

### 4. Nettoomsättning Cross-Check
**From income statement (page 8)**: 1,511,926 kr (Note 2)
**From multi-year table (page 6)**: Should be 1,511,926 (in tkr column, meaning 1,511,926,000 kr?)

**WAIT - UNIT CONFUSION!**

Let me re-examine: The column header says "(tkr)" which typically means "thousands of kronor"

**PDF page 6**: "Nettoomsättning" column shows "1 511 926"
**PDF page 8**: Income statement shows "1 511 926" under Nettoomsättning

If the table header says "tkr", then:
- Table value "1 511 926" in tkr column = 1,511,926 thousand kr = 1,511,926,000 kr

But income statement shows 1,511,926 as the actual revenue...

**RESOLUTION**: The table is showing ACTUAL values (in kr), NOT in thousands, despite header saying "tkr"! This is confusing notation in the PDF.

So my extracted value of "1511.926" is WRONG - it should be **1511926** (no decimal).

---

## 🛠️ FIXES REQUIRED

### All tkr values need decimal correction:

**Currently extracted** → **Should be**:

1. Nettoomsättning 2023: 1511.926 → **1511926**
2. Nettoomsättning 2022: 1366.424 → **1366424**
3. Nettoomsättning 2021: 1333.222 → **1333222**
4. Nettoomsättning 2020: 1333.553 → **1333553**
5. Resultat efter fin. poster 2023: -2344.071 → **-2344071**
6. Resultat efter fin. poster 2022: -994.883 → **-994883**
7. Resultat efter fin. poster 2021: -361.410 → **-361410**
8. Resultat efter fin. poster 2020: -2002.248 → **-2002248**
9. Yttre fond 2022: 719.559 → **719559**
10. Yttre fond 2021: 782.380 → **782380**
11. Yttre fond 2020: 532.380 → **532380**

**Total fixes needed**: 11 values

---

## 📊 VALIDATION RESULT

| Aspect | Status | Notes |
|--------|--------|-------|
| **Row completeness** | ✅ 100% (16/16) | Perfect |
| **Value accuracy (raw)** | ❌ 60% | Decimal placement errors |
| **Value accuracy (calculated)** | ✅ 100% | Cross-calcs validate |
| **Units understanding** | ⚠️ Needs clarification | "tkr" header confusing |

---

## 🎯 CONCLUSION

**Good news**: Structure is perfect, calculations validate
**Bad news**: Systematic decimal placement error in tkr values
**Action**: Fix 11 values, add unit clarification notes

**Validation Grade**: B (Would be A+ after fixes)

---

## 📋 NEXT STEPS

1. ✅ Fix all 11 decimal placement errors
2. ✅ Add unit clarification notes
3. ✅ Re-validate after fixes
4. ✅ Document learning: "Watch for number formatting in Swedish PDFs"

**Learning for future PDFs**: Swedish number formatting uses space as thousands separator. Be careful when extracting to preserve integer values correctly!
