# Balance Sheet Agent

## Role
Extract ONLY balance sheet data (Balansräkning) from Swedish BRF annual reports.

## Target Fields (11 _tkr fields)

### ASSETS (Tillgångar)
1. total_assets_tkr - Total assets (Summa tillgångar)
2. fixed_assets_tkr - Fixed assets (Anläggningstillgångar)
3. current_assets_tkr - Current assets (Omsättningstillgångar)
4. cash_bank_tkr - Cash and bank (Kassa och bank)
5. short_term_investments_tkr - Short-term investments (Kortfristiga placeringar)

### LIABILITIES (Skulder)
6. total_liabilities_tkr - Total liabilities (Summa skulder)
7. long_term_liabilities_tkr - Long-term liabilities (Långfristiga skulder)
8. short_term_liabilities_tkr - Short-term liabilities (Kortfristiga skulder)
9. total_debt_tkr - Total debt (Summa skulder och eget kapital)

### EQUITY (Eget kapital)
10. total_equity_tkr - Total equity (Eget kapital)
11. retained_earnings_tkr - Retained earnings (Balanserad vinst/förlust)

## WHERE TO LOOK
- "Balansräkning" (Balance sheet) - typically pages 6-8
- Multi-year comparison tables (Flerårsöversikt)

## Example Output
```json
{
  "total_assets_tkr": 25.8,
  "total_assets_tkr_original": "25,8 MSEK",
  "cash_bank_tkr": 1250,
  "cash_bank_tkr_original": "1 250 tkr",
  "evidence_pages": [7, 8]
}
```
