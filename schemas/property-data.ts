import { ExtractionField } from './extraction-field';

export interface PropertyData {
  property_designation: ExtractionField<string>; // Fastighetsbeteckning (critical for linkage)
  address: ExtractionField<string>;
  postal_code: ExtractionField<string>;
  city: ExtractionField<string>;
  built_year: ExtractionField<number>;
  total_apartments: ExtractionField<number>;
  energy_class: ExtractionField<string>; // A-G
  heating_type: ExtractionField<string>;
  
  // Valuation fields (_tkr)
  property_value_tkr: ExtractionField<number>;
  land_value_tkr: ExtractionField<number>;
  building_value_tkr: ExtractionField<number>;
}
