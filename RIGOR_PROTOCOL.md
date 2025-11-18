# RIGOR PROTOCOL - Extraction Quality Standards

**Version**: 1.0.0
**Purpose**: Ensure maximum accuracy and zero hallucination in BRF data extraction

---

## CARDINAL RULES

### Rule 1: Evidence-Based Extraction
**NEVER extract a value without identifying its location in the PDF**

✅ **Correct**:
```json
{
  "total_revenue_tkr": 12500,
  "total_revenue_tkr_original": "12 500 tkr",
  "evidence_pages": [5],
  "confidence": 0.95
}
```

❌ **Incorrect**:
```json
{
  "total_revenue_tkr": 12500,
  "evidence_pages": [],
  "confidence": 0.60
}
```

**Enforcement**:
- Validator rejects fields with empty `evidence_pages`
- Confidence automatically reduced by 0.3 if page reference missing

---

### Rule 2: Original Text Preservation
**Always preserve the exact Swedish text as it appears in the document**

For every `_tkr` field, include corresponding `_original` field:

✅ **Correct**:
```json
{
  "interest_costs_tkr": 450,
  "interest_costs_tkr_original": "450 tkr",
  "maintenance_costs_tkr": 1250000,
  "maintenance_costs_tkr_original": "1,25 MSEK"
}
```

❌ **Incorrect**:
```json
{
  "interest_costs_tkr": 450,
  // Missing _original field
}
```

**Purpose**:
- Enables verification against source PDF
- Preserves formatting variations for pattern analysis
- Supports future reprocessing with improved parsers

---

### Rule 3: Conservative Confidence Scoring
**When in doubt, report lower confidence - NEVER overstate certainty**

| Scenario | Confidence | Action |
|----------|------------|--------|
| Value directly stated in labeled field | 0.95-1.00 | Accept |
| Value requires simple calculation | 0.85-0.95 | Accept with note |
| Value inferred from context | 0.70-0.85 | Flag for review |
| Value ambiguous between 2+ interpretations | 0.50-0.70 | Mark uncertain |
| Value not found in document | 0.00 | Return null |

**Examples**:

✅ **High Confidence** (0.95):
```
PDF text: "Årets resultat: 2 150 000 SEK"
Extraction: net_result_tkr = 2150
```

⚠️ **Medium Confidence** (0.75):
```
PDF text: "Totala kostnader inklusive avskrivningar: 8,5 MSEK"
Context: Agent infers total_costs_tkr = 8500 from breakdown
```

❌ **Low Confidence** (0.40):
```
PDF text: No mention of property fee
Agent finds: "Månadsavgift" in another section but unclear if it's the property fee
Extraction: property_fee_sek_month = null, confidence = 0.40
```

---

### Rule 4: Null Over Hallucination
**Missing data is better than incorrect data**

✅ **Correct**:
```json
{
  "energy_consumption_kwh": null,
  "energy_consumption_kwh_original": null,
  "evidence_pages": [],
  "confidence": 0.0,
  "extraction_note": "Energy data not found in document"
}
```

❌ **Incorrect**:
```json
{
  "energy_consumption_kwh": 250000,  // HALLUCINATED
  "evidence_pages": [12],
  "confidence": 0.65,
  "extraction_note": "Estimated from building size"
}
```

**Never**:
- Infer values from building size/age/location
- Copy values from multi-year comparison (wrong year)
- Use averages or industry benchmarks
- Estimate "reasonable" values

---

### Rule 5: Currency Normalization Rigor
**Always convert to thousands (tkr) but preserve original format**

| Original Text | Normalized Value | Original Field |
|---------------|------------------|----------------|
| "12,5 MSEK" | 12500 | "12,5 MSEK" |
| "450 tkr" | 450 | "450 tkr" |
| "2 150 000 SEK" | 2150 | "2 150 000 SEK" |
| "8500000" | 8500 | "8500000" |

**Normalization Rules**:
- MSEK → multiply by 1,000
- SEK → divide by 1,000
- tkr → use as-is
- No unit → assume SEK, divide by 1,000

**Edge Cases**:
```json
// Original: "12,5" (no unit)
{
  "value_tkr": null,
  "value_tkr_original": "12,5",
  "confidence": 0.3,
  "extraction_note": "Unit unclear - could be tkr or MSEK"
}
```

---

### Rule 6: Cross-Field Validation
**Validate extracted values against financial equations**

#### Balance Sheet Equation
```
assets_total_tkr = liabilities_total_tkr + equity_total_tkr
```

**Tolerance**: ±5 tkr (rounding)

If validation fails:
- Flag in validation report
- Confidence reduced to 0.70 for all balance sheet fields
- Note discrepancy in extraction report

#### Income Statement
```
net_result_tkr = total_revenue_tkr - total_costs_tkr
```

**Tolerance**: ±10 tkr (rounding, reclassifications)

#### Cash Flow
```
cash_end_of_year_tkr = cash_start_of_year_tkr + cash_flow_operations_tkr + cash_flow_investing_tkr + cash_flow_financing_tkr
```

---

### Rule 7: Multi-Year Awareness
**Always extract the CORRECT fiscal year - watch for multi-year tables**

Common trap:
```
Resultaträkning          2023    2024
------------------------------------
Intäkter                12,5    13,2
Kostnader              -10,2   -10,8
Resultat                 2,3     2,4
```

✅ **Correct** (if fiscal_year = 2024):
```json
{
  "total_revenue_tkr": 13200,
  "fiscal_year": 2024,
  "evidence_pages": [5]
}
```

❌ **Incorrect**:
```json
{
  "total_revenue_tkr": 12500,  // WRONG YEAR
  "fiscal_year": 2024,
  "evidence_pages": [5]
}
```

**Agent Instructions**:
- Clearly identify which column is current year
- Look for "Föregående år" vs "Innevarande år" labels
- Default to rightmost column if labels unclear
- Flag if year column ambiguous

---

### Rule 8: Swedish Pattern Recognition
**Know the Swedish terminology variations**

#### Property Revenue
- Fastighetsintäkter
- Hyresintäkter
- Årsavgifter
- Månadsavgifter (annualized)
- Intäkter från fastighet

#### Operating Costs
- Driftkostnader
- Fastighetskostnader
- Reparation och underhåll
- Löpande underhåll
- Drift och underhåll

#### Maintenance
- Underhåll
- Reparationer
- ROT (Reparation, Ombyggnad, Tillbyggnad)
- Planerat underhåll
- Akut underhåll

**Agent Training**:
- Each agent has Swedish keyword list
- Use fuzzy matching for variations
- Log novel keywords for future improvement

---

### Rule 9: Evidence Page Accuracy
**Page numbers must be verifiable and 1-based**

✅ **Correct**:
```json
{
  "total_revenue_tkr": 12500,
  "evidence_pages": [5, 6, 7],  // 1-based, matches PDF viewer
  "extraction_note": "Income statement on page 5, detailed breakdown on pages 6-7"
}
```

❌ **Incorrect**:
```json
{
  "total_revenue_tkr": 12500,
  "evidence_pages": [4, 5, 6],  // 0-based indexing
}
```

**Validation**:
- All page numbers ≤ pages_total
- All page numbers ≥ 1
- Pages logically grouped (no random jumps)

---

### Rule 10: Transparent Uncertainty
**Always document WHY confidence is not 1.0**

Required `extraction_note` when confidence < 0.95:

```json
{
  "operational_costs_tkr": 3200,
  "confidence": 0.82,
  "extraction_note": "Sum of individual cost categories (3,215 tkr) doesn't exactly match 'Summa driftkostnader' label (3,200 tkr). Used labeled total."
}
```

```json
{
  "auditor_name": "Ernst & Young AB",
  "confidence": 0.70,
  "extraction_note": "Auditor signature unclear. Name extracted from printed text below signature."
}
```

---

## VALIDATION CHECKLIST

Before marking extraction as complete:

- [ ] All `_tkr` fields have corresponding `_original` fields
- [ ] All extracted fields have `evidence_pages` array
- [ ] No `evidence_pages` array is empty
- [ ] All page numbers are 1-based and ≤ pages_total
- [ ] Balance sheet equation validates (±5 tkr tolerance)
- [ ] Income statement equation validates (±10 tkr tolerance)
- [ ] Fiscal year matches document (not prior year from comparison table)
- [ ] All confidence scores < 0.95 have `extraction_note`
- [ ] No hallucinated values (all values exist in PDF)
- [ ] Currency conversions verified (MSEK → tkr, SEK → tkr)

**Automated Validation**:
- Run `schema-validator.ts` on aggregated result
- Flag any failed checks in validation report
- Reduce overall quality score if critical failures

---

## AGENT-SPECIFIC RIGOR RULES

### Financial Agent
- ✅ Extract from "Resultaträkning" section
- ✅ Verify all 11 _tkr fields sum correctly
- ❌ Don't extract from "Noter" unless cross-referenced
- ❌ Don't use multi-year comparison (wrong year risk)

### Balance Sheet Agent
- ✅ Extract from "Balansräkning" section
- ✅ Verify assets = liabilities + equity
- ❌ Don't infer missing line items
- ❌ Don't extract from condensed summary tables

### Property Agent
- ✅ Extract from "Fastighetsuppgifter" or early pages
- ✅ Verify building year is 4-digit number (1800-2024)
- ❌ Don't estimate missing energy data
- ❌ Don't infer apartment count from other metrics

### Fees Agent
- ✅ Extract from "Månadsavgift" or "Årsavgift" sections
- ✅ Normalize monthly fees (annual ÷ 12)
- ❌ Don't include one-time special fees
- ❌ Don't average different apartment sizes

---

## CONTINUOUS IMPROVEMENT

After each session:
1. **Review Validation Report**: Identify fields with low confidence
2. **Document Novel Patterns**: Add new Swedish keywords to agent prompts
3. **Update Routing Rules**: Improve section-to-agent mapping
4. **Refine Prompts**: Clarify ambiguous extraction instructions

After every 10 sessions (meta-analysis):
1. **Agent Performance Benchmarking**: Identify consistently low-performing agents
2. **Pattern Library Update**: Formalize discovered document patterns
3. **Confidence Calibration**: Adjust confidence thresholds based on accuracy metrics
4. **Prompt Engineering**: Systematically improve agent prompts

---

**END RIGOR PROTOCOL**
