# Meta-Analysis: Milestone {COUNT}

**Date**: {DATE}
**PDFs Processed**: {COUNT}
**Cumulative Total**: {TOTAL}

---

## Executive Summary

- **Overall Quality Distribution**:
  - HIGH: {high_count} PDFs ({high_percent}%)
  - MEDIUM: {medium_count} PDFs ({medium_percent}%)
  - LOW: {low_count} PDFs ({low_percent}%)

- **Average Metrics**:
  - Field Coverage: {avg_coverage}%
  - Confidence: {avg_confidence}
  - Cost per PDF: ${avg_cost}
  - Duration: {avg_duration} minutes

---

## 1. Performance Trends

### Field Coverage Over Time

```
Milestone  | Avg Coverage | Change
-----------|--------------|--------
1-10       | 78.2%        | baseline
11-20      | 82.3%        | +4.1%
21-30      | 85.1%        | +2.8%
```

**Trend**: {trend_description}

**Key Insight**: {insight}

### Confidence Trends

```
Milestone  | Avg Confidence | Change
-----------|----------------|--------
1-10       | 0.81           | baseline
11-20      | 0.84           | +0.03
21-30      | 0.86           | +0.02
```

**Trend**: {trend_description}

**Key Insight**: {insight}

---

## 2. Agent Performance Analysis

### Success Rates by Agent

| Agent | Success Rate | Avg Confidence | Common Issues |
|-------|--------------|----------------|---------------|
| chairman_agent | 98% | 0.92 | Occasional name formatting |
| board_members_agent | 95% | 0.88 | Role detection inconsistent |
| financial_agent | 97% | 0.91 | - |
| balance_sheet_agent | 96% | 0.89 | Rounding differences |
| ... | ... | ... | ... |

### Top 5 Best Performing Agents

1. **chairman_agent**: 98% success, 0.92 confidence
   - Strength: Consistent section placement
   - Improvement: None needed

2. **financial_agent**: 97% success, 0.91 confidence
   - Strength: Clear table structures
   - Improvement: Better handling of consolidated reports

3. ...

### Top 5 Struggling Agents

1. **energy_agent**: 72% success, 0.64 confidence
   - Issue: Energy class not always documented
   - Recommendation: Add inference from building age/location

2. **notes_tax_agent**: 75% success, 0.67 confidence
   - Issue: Tax notes vary significantly in format
   - Recommendation: Expand keyword dictionary

3. ...

---

## 3. Model Comparison

### Accuracy by Model

| Model | Avg Accuracy | Cost per PDF | Strengths | Weaknesses |
|-------|--------------|--------------|-----------|------------|
| Gemini 2.5 Pro | 87.2% | $0.42 | Swedish text, tables | Over-confidence |
| GPT-4o | 85.1% | $0.39 | JSON formatting | Swedish chars |
| Claude 3.7 Sonnet | 91.3% | $0.08 | Tiebreaking | Only used as tiebreaker |

**Best Overall**: Claude 3.7 Sonnet (when used as primary)

**Recommendation**: {recommendation}

### Consensus Analysis

```
Consensus Type       | Frequency | Avg Confidence
---------------------|-----------|----------------
Gemini + GPT agree   | 68%       | 0.90
Gemini + Claude      | 15%       | 0.92
GPT + Claude         | 12%       | 0.93
All disagree         | 5%        | 0.65
```

**Insight**: {insight}

---

## 4. Field-Level Analysis

### Top 10 Easiest Fields (Highest Confidence)

1. **brf_name**: 0.98 avg confidence
   - Reason: Always in header/footer
   - Success rate: 100%

2. **org_number**: 0.97 avg confidence
   - Reason: Standard format, clear labeling
   - Success rate: 99%

3. **year**: 0.96 avg confidence
   - Reason: Consistent placement
   - Success rate: 100%

4. ...

### Top 10 Hardest Fields (Lowest Confidence)

1. **heating_system**: 0.58 avg confidence
   - Reason: Often not explicitly stated
   - Success rate: 62%
   - **Recommendation**: Add inference from energy data

2. **board_member_roles**: 0.62 avg confidence
   - Reason: Inconsistent role labeling
   - Success rate: 65%
   - **Recommendation**: Implement role inference algorithm

3. **supplier_contracts**: 0.65 avg confidence
   - Reason: Buried in notes section
   - Success rate: 68%
   - **Recommendation**: Enhance note parsing

4. ...

---

## 5. Cost Analysis

### Cost Breakdown

```
Component              | Avg Cost | % of Total
-----------------------|----------|------------
Vision Sectionization  | $0.15    | 17%
Gemini Agents (19x)    | $0.42    | 47%
GPT Agents (19x)       | $0.39    | 43%
Claude Tiebreaks       | $0.08    | 9%
Total                  | $0.89    | 100%
```

### Cost Optimization Opportunities

1. **Reduce Sectionization Cost**: Use cheaper model for Round 1
   - Potential savings: $0.03 per PDF

2. **Selective Agent Execution**: Skip low-value agents for simple PDFs
   - Potential savings: $0.10 per PDF

3. **Model Substitution**: Use Claude as primary (more accurate, cheaper)
   - Potential savings: $0.20 per PDF

**Total Potential Savings**: $0.33 per PDF (37% reduction)

---

## 6. Quality Gate Analysis

### Quality Distribution

```
Quality Tier | Count | Percentage | Avg Coverage | Avg Confidence
-------------|-------|------------|--------------|----------------
HIGH         | 18    | 60%        | 88.2%        | 0.91
MEDIUM       | 10    | 33%        | 72.5%        | 0.78
LOW          | 2     | 7%         | 48.3%        | 0.61
```

### Factors Correlating with Quality

1. **PDF Length**: Shorter PDFs (10-15 pages) → 85% HIGH quality
2. **Visual Layout**: Table-heavy PDFs → 78% HIGH quality
3. **Report Year**: 2023-2024 → 72% HIGH quality vs 58% for 2020-2021
4. **BRF Size**: Mid-size BRFs (50-150 units) → highest quality

**Insight**: {insight}

---

## 7. Error Pattern Analysis

### Most Common Errors

1. **Missing Field Errors** (45% of all errors)
   - Top missing field: `heating_system`
   - Root cause: Field not in standard BRF reports

2. **Format Validation Errors** (30%)
   - Top error: `postal_code` format mismatch
   - Root cause: Inconsistent spacing

3. **Cross-Field Inconsistency** (15%)
   - Top error: Balance sheet equation mismatch
   - Root cause: Rounding differences

4. **API Errors** (10%)
   - Top error: Rate limit exceeded (GPT-4o)
   - Root cause: Burst processing

### Error Resolution Strategies

1. For missing fields: Implement inference algorithms
2. For format errors: Add fuzzy matching
3. For inconsistencies: Increase tolerance thresholds
4. For API errors: Add exponential backoff

---

## 8. Learning Insights

### Top 5 Learnings from This Milestone

1. **Board Member Extraction**:
   - Challenge: Names formatted inconsistently (Last, First vs First Last)
   - Solution: Normalize to "First Last" format
   - Impact: +12% confidence on `board_members_agent`

2. **Revenue Table Detection**:
   - Challenge: Non-standard table layouts
   - Solution: Multi-pass table detection with fallback
   - Impact: +8% field coverage

3. **Energy Data Inference**:
   - Challenge: Energy class often missing
   - Solution: Infer from building age + renovation history
   - Impact: +15% success rate on `energy_agent`

4. ...

### Recommendations for Next Milestone

1. **Protocol Adjustments**:
   - Increase balance sheet tolerance to ±7% (from ±5%)
   - Add fuzzy matching for board member names
   - Expand Swedish keyword dictionary for energy terms

2. **Agent Improvements**:
   - Enhance `energy_agent` with inference rules
   - Add role detection to `board_members_agent`
   - Improve table parsing in `financial_agent`

3. **Cost Optimization**:
   - Pilot Claude-first approach on next 10 PDFs
   - Evaluate selective agent execution

---

## 9. Projections for Next Milestone

Based on current trends:

### Expected Metrics (Next 10 PDFs)

- **Field Coverage**: 87.5% (+2.4% from current)
- **Avg Confidence**: 0.88 (+0.02)
- **Cost per PDF**: $0.85 (-$0.04)
- **Duration**: 11.5 min (-1.0 min)

### Confidence Intervals (95%)

- Field Coverage: [85.2%, 89.8%]
- Avg Confidence: [0.86, 0.90]
- Cost: [$0.80, $0.90]

---

## 10. Action Items

### Immediate Actions

- [ ] Update `energy_agent` prompt with inference rules
- [ ] Add fuzzy matching to `board_members_agent`
- [ ] Increase balance sheet tolerance to ±7%
- [ ] Expand Swedish keyword dictionary

### Medium-Term Actions

- [ ] Pilot Claude-first extraction on 10 PDFs
- [ ] Implement selective agent execution
- [ ] Add inference algorithms for missing fields
- [ ] Create dashboard for real-time monitoring

### Long-Term Actions

- [ ] Distributed processing architecture
- [ ] Database migration (JSON → PostgreSQL)
- [ ] Advanced analytics dashboard
- [ ] Auto-scaling for large batches

---

## Appendix

### PDFs Processed in This Milestone

1. `pdfs/267197_årsredovisning_norrköping_brf_axet_4.pdf` - MEDIUM
2. `pdfs/267456_årsredovisning_stockholm_brf_granen_18.pdf` - HIGH
3. ...

### Session IDs

1. `session_20251118_042841`
2. `session_20251118_051234`
3. ...

---

**Generated**: {TIMESTAMP}
**Analyst**: Claude (Autonomous Meta-Analysis System)
**Next Milestone**: After {NEXT_COUNT} PDFs
