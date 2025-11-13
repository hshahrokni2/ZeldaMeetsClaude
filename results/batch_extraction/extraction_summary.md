# BRF Annual Report Extraction Summary

## Extraction Details
- **Date**: 2025-11-13
- **PDFs Processed**: 2
- **Fields Extracted**: Financial (11), Balance Sheet (10), Chairman (1)

## Results Table

| PDF ID | Net Result (tkr) | Total Assets (tkr) | Chairman | Overall Confidence |
|--------|------------------|--------------------|-----------|--------------------|
| 54886 | -22 | 16,713 | John Kristofer Ahlborg | 94% |
| 55218 | 616 | 16,507 | Jonas Karlsson | 94% |

## Detailed Breakdown

### PDF 54886: BRF Kastanjen nr 4-5 (Södertälje)

**Financial Data:**
- Total Revenue: 1,565 tkr
- Operational Costs: 824 tkr
- Interest Costs: 191 tkr
- Depreciation: 368 tkr
- **Net Result: -22 tkr**

**Balance Sheet:**
- Fixed Assets: 15,777 tkr
- Current Assets: 936 tkr
- **Total Assets: 16,713 tkr**
- Total Equity: 4,210 tkr
- Total Liabilities: 12,503 tkr
- Soliditet: 25%

**Governance:**
- **Chairman**: John Kristofer Ahlborg
- Location: Södertälje
- Fiscal Year: 2020

**Validation:**
- Balance Equation: PASS ✓
- Result Consistency: PASS ✓
- Audit Score: 95/100

---

### PDF 55218: BRF Lekerydshus nr 1 (Jönköping)

**Financial Data:**
- Total Revenue: 1,808 tkr
- Operational Costs: 323 tkr
- Interest Costs: 208 tkr
- Depreciation: 544 tkr
- **Net Result: 616 tkr**

**Balance Sheet:**
- Fixed Assets: 13,084 tkr
- Current Assets: 3,424 tkr
- **Total Assets: 16,507 tkr**
- Total Equity: 4,587 tkr
- Total Liabilities: 11,920 tkr
- Soliditet: 28%

**Governance:**
- **Chairman**: Jonas Karlsson
- Location: Jönköping
- Fiscal Year: 2021-07-01 to 2022-06-30

**Validation:**
- Balance Equation: PASS ✓
- Result Consistency: PASS ✓
- Audit Score: 95/100

---

## Key Insights

1. **Performance Comparison:**
   - PDF 55218 shows significantly better financial performance with a positive net result of 616 tkr vs -22 tkr for PDF 54886
   - Both associations have similar total assets (~16.5M kr)

2. **Financial Health:**
   - PDF 55218 has higher soliditet (28% vs 25%), indicating better equity position
   - PDF 55218 has significantly more liquid assets (3,358 tkr in cash vs 0.1 tkr)

3. **Cost Structure:**
   - PDF 54886 has higher operational costs relative to revenue (53% vs 18%)
   - Both have significant interest costs relative to their size

4. **Extraction Quality:**
   - All fields extracted with 90%+ confidence
   - Both extractions passed cross-validation checks
   - Overall confidence: 94% for both reports

## Files Generated

- `/home/user/ZeldaMeetsClaude/results/batch_extraction/54886_extraction.json`
- `/home/user/ZeldaMeetsClaude/results/batch_extraction/55218_extraction.json`
- `/home/user/ZeldaMeetsClaude/results/batch_extraction/extraction_summary.md`
