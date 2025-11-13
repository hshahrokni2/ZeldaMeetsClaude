import { ExtractionField } from './extraction-field';

/**
 * Income statement fields (Resultaträkning)
 * All _tkr fields require original_string for currency normalization
 */
export interface FinancialData {
  total_revenue_tkr: ExtractionField<number>;
  property_revenue_tkr: ExtractionField<number>;
  interest_revenue_tkr: ExtractionField<number>;
  other_revenue_tkr: ExtractionField<number>;
  total_costs_tkr: ExtractionField<number>;
  operational_costs_tkr: ExtractionField<number>;
  maintenance_costs_tkr: ExtractionField<number>;
  administrative_costs_tkr: ExtractionField<number>;
  interest_costs_tkr: ExtractionField<number>;
  depreciation_tkr: ExtractionField<number>;
  net_result_tkr: ExtractionField<number>;
}
