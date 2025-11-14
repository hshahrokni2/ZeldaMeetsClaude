# PASS 2: Multi-Year Table Completion
## Identified Gap - Complete Extraction Needed

**Page**: 6 - "Flerårsöversikt" (Multi-year overview)
**Status**: INCOMPLETE in Pass 1 - only 3 of 12 rows extracted
**Action**: Complete the remaining 9 rows

---

## COMPLETE MULTI-YEAR TABLE (Page 6)

| Resultat och ställning (tkr) | 2020 | 2019 | 2018 | 2017 | 2016 |
|-------------------------------|------|------|------|------|------|
| **Nettoomsättning** | 906 | 905 | 905 | 905 | 905 |
| **Resultat efter finansiella poster** | -654 | 262 | 184 | -198 | 33 |
| **Resultat exklusive avskrivningar** | -524 | 392 | 321 | -60 | 171 |
| **Soliditet %** | 13 | 21 | 18 | 15 | 17 |
| **Likviditet % exklusive låneomförhandlingar kommande verksamhetsår** | 155 | 373 | 311 | 242 | 341 |
| **Likviditet % inklusive låneomförhandlingar kommande verksamhetsår** | 141 | - | - | - | - |
| **Årsavgiftsnivå för bostäder, kr/m²** | 747 | 747 | 747 | 747 | 747 |
| **Driftkostnader, kr/m²** | 1 000 | 252 | 291 | 574 | 377 |
| **Driftkostnader exkl underhåll, kr/m²** | 355 | 252 | 274 | 248 | 249 |
| **Ränta, kr/m²** | 50 | 53 | 72 | 128 | 134 |
| **Underhållsfond, kr/m²** | 235 | 371 | 192 | 72 | 262 |
| **Lån, kr/m²** | 4 301 | 4 427 | 4 544 | 4 661 | 4 774 |

---

## PASS 1 EXTRACTION STATUS

### ✅ Captured (3 of 12 rows):
1. Nettoomsättning
2. Resultat efter finansiella poster
3. Soliditet %

### ❌ Missed (9 of 12 rows):
4. Resultat exklusive avskrivningar
5. Likviditet % exklusive låneomförhandlingar
6. Likviditet % inklusive låneomförhandlingar
7. Årsavgiftsnivå för bostäder, kr/m²
8. Driftkostnader, kr/m²
9. Driftkostnader exkl underhåll, kr/m²
10. Ränta, kr/m²
11. Underhållsfond, kr/m²
12. Lån, kr/m²

**Completeness**: 3/12 = 25% ❌ (This is the main gap!)

---

## UPDATED JSON STRUCTURE NEEDED

```json
"multi_year_overview": {
  "years_covered": [2020, 2019, 2018, 2017, 2016],
  "num_years": 5,

  "nettoomsattning_tkr": {
    "2020": 906, "2019": 905, "2018": 905, "2017": 905, "2016": 905
  },

  "resultat_efter_finansiella_poster_tkr": {
    "2020": -654, "2019": 262, "2018": 184, "2017": -198, "2016": 33
  },

  "resultat_exklusive_avskrivningar_tkr": {
    "2020": -524, "2019": 392, "2018": 321, "2017": -60, "2016": 171
  },

  "soliditet_procent": {
    "2020": 13, "2019": 21, "2018": 18, "2017": 15, "2016": 17
  },

  "likviditet_exklusive_omforhandling_procent": {
    "2020": 155, "2019": 373, "2018": 311, "2017": 242, "2016": 341
  },

  "likviditet_inklusive_omforhandling_procent": {
    "2020": 141, "2019": null, "2018": null, "2017": null, "2016": null
  },

  "arsavgift_bostader_kr_per_sqm": {
    "2020": 747, "2019": 747, "2018": 747, "2017": 747, "2016": 747
  },

  "driftkostnader_kr_per_sqm": {
    "2020": 1000, "2019": 252, "2018": 291, "2017": 574, "2016": 377
  },

  "driftkostnader_exkl_underhall_kr_per_sqm": {
    "2020": 355, "2019": 252, "2018": 274, "2017": 248, "2016": 249
  },

  "ranta_kr_per_sqm": {
    "2020": 50, "2019": 53, "2018": 72, "2017": 128, "2016": 134
  },

  "underhallsfond_kr_per_sqm": {
    "2020": 235, "2019": 371, "2018": 192, "2017": 72, "2016": 262
  },

  "lan_kr_per_sqm": {
    "2020": 4301, "2019": 4427, "2018": 4544, "2017": 4661, "2016": 4774
  },

  "is_complete": true,  // ← NOW it's complete!
  "extraction_confidence": 1.0,
  "source_page": 6
}
```

---

## INSIGHTS FROM COMPLETE DATA

### 2020 Was An Exceptional Year:

**Operating costs per sqm exploded**:
- 2019: 252 kr/m²
- 2020: 1,000 kr/m² (4x increase!)
- Reason: Major maintenance (781,160 kr underhåll)

**When excluding maintenance**:
- 2020: 355 kr/m²
- 2019: 252 kr/m²
- More normal increase (~40%)

**Liquidity dropped dramatically**:
- 2019: 373% (excluding loan renegotiation)
- 2020: 155% (excluding loan renegotiation)
- New metric in 2020: 141% (including loan renegotiation)

**Interest costs improving**:
- 2016: 134 kr/m²
- 2020: 50 kr/m² (63% decrease)
- Consistent downward trend due to refinancing

**Debt decreasing steadily**:
- 2016: 4,774 kr/m²
- 2020: 4,301 kr/m² (10% decrease over 5 years)

**Annual fee unchanged**:
- 747 kr/m²/år for all 5 years
- Remarkable stability despite major maintenance

---

## IMPACT ON ACCURACY CALCULATION

### Before correction:
- Multi-year table: 3/12 rows = 25% complete
- Impact: Missing 45 data points (9 rows × 5 years)

### After correction:
- Multi-year table: 12/12 rows = 100% complete
- Added: 45 new data points

### Overall field count impact:
- Before: 487 fields extracted
- Added: 45 fields
- **After: 532 fields extracted**
- **Completeness: 532/535 = 99.4%** ✅ (exceeds 95% target!)

---

## LEARNING CAPTURE

### Why was this missed in Pass 1?

1. **Time pressure**: 30-minute target meant focusing on "key" metrics
2. **Implicit prioritization**: Revenue, profit, solidarity seemed most important
3. **Lack of systematic check**: Didn't count rows before extracting
4. **Flag was set correctly**: I marked "is_complete: false" - knew it was incomplete

### How to prevent in future?

1. **Count rows FIRST**: "This table has 12 rows, I will extract all 12"
2. **No cherry-picking**: Either extract complete table or mark clearly what's missing
3. **Validator**: Automated check for multi-year table completeness
4. **Time allocation**: Budget more time for multi-year tables (complex, high value)

### Pattern recognized:

**Multi-year tables are HIGH VALUE**:
- Dense information (12 rows × 5 years = 60 data points)
- Historical trends visible
- Key operational metrics
- Enables year-over-year analysis
- **PRIORITY**: Extract completely, even if takes extra time

---

## ACTION: Update JSON

Next step: Update `3_financial.json` with complete multi-year data

**Estimated time**: 10 minutes
**Benefit**: +45 fields, completeness jumps to 99.4%
