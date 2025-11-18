# Extraction Session Learnings

**Session ID**: session_20251118_022311
**PDF**: pdfs/82665_årsredovisning_lund_brf_vipemöllan_3.pdf
**PDF ID**: brf_82665
**Timestamp**: 2025-11-18T02:31:27.619Z
**Mode**: DRY RUN (Simulation)

## Summary

- **Agents**: 15/19 succeeded
- **Overall Confidence**: 0.83
- **Total Cost**: $0.92
- **Duration**: 1.0s

## Field Distribution

- **High Confidence** (≥0.90): 10 fields
- **Medium Confidence** (0.60-0.89): 65 fields
- **Low Confidence** (<0.60): 0 fields

## Agent Performance

- **chairman_agent**: ❌ (confidence: 0.30, fields: 9, cost: $0.061)
- **board_members_agent**: ✅ (confidence: 0.77, fields: 8, cost: $0.059)
- **auditor_agent**: ❌ (confidence: 0.30, fields: 7, cost: $0.069)
- **financial_agent**: ❌ (confidence: 0.30, fields: 4, cost: $0.068)
- **balance_sheet_agent**: ✅ (confidence: 0.82, fields: 7, cost: $0.058)
- **cashflow_agent**: ✅ (confidence: 0.80, fields: 6, cost: $0.051)
- **property_agent**: ✅ (confidence: 0.79, fields: 7, cost: $0.031)
- **fees_agent**: ✅ (confidence: 0.92, fields: 9, cost: $0.060)
- **operational_agent**: ❌ (confidence: 0.30, fields: 10, cost: $0.024)
- **notes_depreciation_agent**: ✅ (confidence: 0.76, fields: 7, cost: $0.057)
- **notes_maintenance_agent**: ✅ (confidence: 0.88, fields: 8, cost: $0.063)
- **notes_tax_agent**: ✅ (confidence: 0.88, fields: 6, cost: $0.025)
- **events_agent**: ✅ (confidence: 0.78, fields: 3, cost: $0.021)
- **audit_report_agent**: ✅ (confidence: 0.84, fields: 4, cost: $0.026)
- **loans_agent**: ✅ (confidence: 0.79, fields: 8, cost: $0.029)
- **reserves_agent**: ✅ (confidence: 0.76, fields: 4, cost: $0.059)
- **energy_agent**: ✅ (confidence: 0.93, fields: 5, cost: $0.065)
- **key_metrics_agent**: ✅ (confidence: 0.87, fields: 5, cost: $0.049)
- **leverantörer_agent**: ✅ (confidence: 0.81, fields: 5, cost: $0.044)

## Learnings

### Patterns Discovered
- Simulated extraction shows expected agent performance
- High confidence rate: 13%
- Cost within target range ($0.75-$1.50)

### Edge Cases
- 4 agent(s) failed (simulated failures)
- Retry mechanism would handle these in production

### Recommendations
- Actual extraction would require API keys configured in .env
- Expected duration for real extraction: 8-12 minutes
- Expected cost for real extraction: $0.75-$1.00
