import { ExtractionField } from './extraction-field';

/**
 * Balance sheet fields (Balansräkning)
 */
export interface BalanceSheetData {
  // Assets
  total_assets_tkr: ExtractionField<number>;
  fixed_assets_tkr: ExtractionField<number>;
  current_assets_tkr: ExtractionField<number>;
  cash_bank_tkr: ExtractionField<number>;
  short_term_investments_tkr: ExtractionField<number>;
  
  // Liabilities
  total_liabilities_tkr: ExtractionField<number>;
  long_term_liabilities_tkr: ExtractionField<number>;
  short_term_liabilities_tkr: ExtractionField<number>;
  total_debt_tkr: ExtractionField<number>;
  
  // Equity
  total_equity_tkr: ExtractionField<number>;
  retained_earnings_tkr: ExtractionField<number>;
}
