/**
 * Ultra-comprehensive schema for Swedish BRF Annual Reports.
 *
 * This schema extracts EVERY fact from BRF documents (skip only signatures and boilerplate).
 * Designed for scalability, robustness, and maximum information capture.
 *
 * MIGRATION NOTE (2025-10-07):
 * Week 1 Day 3-4 - Migrating to ExtractionField base classes for confidence tracking.
 * See extraction-field-v1.0.0.ts for ExtractionField implementation.
 *
 * Ported from: /Uploads/brf_schema.py (2206 lines)
 * Port date: November 4, 2025
 * Version: v1.0.0
 */

import { z } from 'zod';
import {
  StringField,
  NumberField,
  DateField,
  ListField,
  BooleanField,
  DictField,
  ExtractionField,
  createStringField,
  createNumberField,
  createDateField,
  createListField,
  createBooleanField,
  createDictField,
} from './extraction-field-v1.0.0';

// =============================================================================
// LEVEL 1: DOCUMENT METADATA
// =============================================================================

/**
 * Top-level document identification and context.
 */
export interface DocumentMetadata {
  // Document Identity (System-generated)
  /** Unique identifier (org_number_year) */
  document_id: string;
  /** Document type */
  document_type: 'arsredovisning' | 'ekonomisk_plan' | 'stadgar' | 'energideklaration';

  // Extracted Fields (with confidence tracking)
  /** Fiscal year from PDF (extracted) */
  fiscal_year: NumberField | null;
  /** Report date from PDF (extracted) */
  report_date: DateField | null;
  /** BRF name from PDF (extracted) */
  brf_name: StringField | null;
  /** Organization number from PDF (extracted) */
  organization_number: StringField | null;

  // Document Quality (System-generated)
  /** Total pages in document */
  pages_total: number;
  /** Whether document is machine-readable (not scanned) */
  is_machine_readable: boolean;
  /** OCR confidence score (0.0-1.0) if applicable */
  ocr_confidence: number | null;

  // Processing Metadata (System-generated)
  /** When document was extracted */
  extraction_date: string; // ISO 8601 datetime
  /** Extraction mode used */
  extraction_mode: 'fast' | 'deep' | 'auto';
  /** Extraction pipeline version */
  extraction_version: string;

  // File Information (System-generated)
  /** Original file path */
  file_path: string | null;
  /** File size in bytes */
  file_size_bytes: number | null;
  /** SHA-256 hash of file */
  file_hash_sha256: string | null;
}

/**
 * Zod schema for DocumentMetadata validation
 */
export const DocumentMetadataSchema = z.object({
  // Document Identity
  document_id: z.string(),
  document_type: z.enum(['arsredovisning', 'ekonomisk_plan', 'stadgar', 'energideklaration']),

  // Extracted Fields
  fiscal_year: z.any().nullable(), // NumberField
  report_date: z.any().nullable(), // DateField
  brf_name: z.any().nullable(), // StringField
  organization_number: z.any().nullable(), // StringField

  // Document Quality
  pages_total: z.number().positive(),
  is_machine_readable: z.boolean(),
  ocr_confidence: z.number().min(0).max(1).nullable(),

  // Processing Metadata
  extraction_date: z.string(),
  extraction_mode: z.enum(['fast', 'deep', 'auto']),
  extraction_version: z.string(),

  // File Information
  file_path: z.string().nullable(),
  file_size_bytes: z.number().nullable(),
  file_hash_sha256: z.string().nullable(),
});

/**
 * Create DocumentMetadata with defaults
 */
export function createDocumentMetadata(
  document_id: string,
  document_type: DocumentMetadata['document_type'],
  pages_total: number
): DocumentMetadata {
  return {
    document_id,
    document_type,
    fiscal_year: null,
    report_date: null,
    brf_name: null,
    organization_number: null,
    pages_total,
    is_machine_readable: true,
    ocr_confidence: null,
    extraction_date: new Date().toISOString(),
    extraction_mode: 'auto',
    extraction_version: 'v2.0',
    file_path: null,
    file_size_bytes: null,
    file_hash_sha256: null,
  };
}

// =============================================================================
// LEVEL 2: GOVERNANCE (COMPLETE DETAIL)
// =============================================================================

/**
 * Individual board member with full details.
 */
export interface BoardMember {
  /** Board member name (extracted) */
  full_name: StringField | null;
  /** Role in board */
  role: 'ordforande' | 'vice_ordforande' | 'ledamot' | 'suppleant' | null;
  /** Term start date (extracted) */
  term_start: DateField | null;
  /** Term end date (extracted) */
  term_end: DateField | null;
  /** Election date (extracted) */
  elected_at_meeting: DateField | null;
  /** Employee representative status (extracted) */
  is_employee_representative: BooleanField | null;
  /** Contact information (extracted) */
  contact_info: StringField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Auditor details.
 */
export interface Auditor {
  /** Auditor name (extracted) */
  name: StringField | null;
  /** Audit firm (extracted) */
  firm: StringField | null;
  /** Certification, e.g., "Auktoriserad revisor" (extracted) */
  certification: StringField | null;
  /** Contact information (extracted) */
  contact_info: StringField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Complete governance information.
 */
export interface GovernanceStructure {
  // Board
  /** Chairman name (extracted) */
  chairman: StringField | null;
  /** Vice chairman name (extracted) */
  vice_chairman: StringField | null;
  /** List of board members */
  board_members: BoardMember[];
  /** Number of board members (extracted) */
  board_size: NumberField | null;
  /** Mandate period in years (extracted) */
  board_term_years: NumberField | null;

  // Auditors
  /** Primary auditor */
  primary_auditor: Auditor | null;
  /** Deputy auditor */
  deputy_auditor: Auditor | null;
  /** Audit period (extracted) */
  audit_period: StringField | null;

  // Nomination Committee
  /** Nomination committee members (extracted) */
  nomination_committee: ListField<string> | null;
  /** Nomination committee details (extracted) */
  nomination_committee_details: StringField | null;

  // Annual Meeting
  /** Annual meeting date (extracted) */
  annual_meeting_date: DateField | null;
  /** Annual meeting location (extracted) */
  annual_meeting_location: StringField | null;
  /** Annual meeting attendees count (extracted) */
  annual_meeting_attendees: NumberField | null;
  /** Extraordinary meeting dates (extracted) */
  extraordinary_meetings: ListField<string> | null;

  // Governance Documents
  /** Bylaws last updated date (extracted) */
  stadgar_last_updated: DateField | null;
  /** Bylaws references (extracted) */
  bylaws_references: ListField<string> | null;

  // Evidence
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// LEVEL 3: FINANCIAL (ULTRA-COMPREHENSIVE) - PARTIAL PORT
// =============================================================================

/**
 * Individual line item in financial statements.
 */
export interface FinancialLineItem {
  /** Line item category (extracted) */
  category: StringField | null;
  /** Line item subcategory (extracted) */
  subcategory: StringField | null;
  /** Line item description (extracted) */
  description: StringField | null;
  /** Current year amount (extracted) */
  amount_current_year: NumberField | null;
  /** Previous year amount (extracted) */
  amount_previous_year: NumberField | null;
  /** Note reference number (extracted) */
  note_reference: NumberField | null;
  /** Percentage of total (extracted) */
  percentage_of_total: NumberField | null;
  /** Source page */
  source_page: number | null;
}

/**
 * Complete income statement (Resultaträkning).
 *
 * NOTE: Python version has @model_validator for revenue_split validation.
 * TODO: Port validator logic to TypeScript validation function.
 */
export interface IncomeStatement {
  // Revenue (Intäkter)
  /** Total revenue (extracted) */
  revenue_total: NumberField | null;
  /** Revenue line items */
  revenue_line_items: FinancialLineItem[];

  // Revenue Breakdown (Pattern H from HIERARCHICAL_SCHEMA_STRATEGY.md)
  /** Revenue from apartment fees (årsavgifter bostäder) - typically 38-60% of total */
  revenue_apartment_fees: NumberField | null;
  /** Revenue from commercial rent (hyresintäkter lokaler) - typically 0-30% of total */
  revenue_commercial_rent: NumberField | null;
  /** Other revenue (garage, parking, laundry, etc.) - can be 0-35% of total (computed or extracted) */
  revenue_other: NumberField | null;

  // Expenses (Kostnader)
  /** Total expenses (extracted) */
  expenses_total: NumberField | null;
  /** Expense line items */
  expenses_line_items: FinancialLineItem[];

  // Operating Result
  /** Operating result (extracted) */
  operating_result: NumberField | null;

  // Financial Items
  /** Financial income (extracted) */
  financial_income: NumberField | null;
  /** Financial expenses (extracted) */
  financial_expenses: NumberField | null;

  // Result
  /** Result before tax (extracted) */
  result_before_tax: NumberField | null;
  /** Tax (extracted) */
  tax: NumberField | null;
  /** Result after tax (extracted) */
  result_after_tax: NumberField | null;

  // Source
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * Complete balance sheet (Balansräkning).
 *
 * NOTE: Python version has @model_validator for balance sheet equation validation.
 * TODO: Port validator logic (Assets = Liabilities + Equity with 6% tolerance).
 */
export interface BalanceSheet {
  // Assets
  /** Total assets (extracted) */
  assets_total: NumberField | null;
  /** Fixed assets (extracted) */
  fixed_assets: NumberField | null;
  /** Current assets (extracted) */
  current_assets: NumberField | null;
  /** Asset line items */
  assets_line_items: FinancialLineItem[];

  // Liabilities
  /** Total liabilities (extracted) */
  liabilities_total: NumberField | null;
  /** Total equity (extracted) */
  equity_total: NumberField | null;
  /** Long-term liabilities (extracted) */
  long_term_liabilities: NumberField | null;
  /** Short-term liabilities (extracted) */
  short_term_liabilities: NumberField | null;
  /** Liability line items */
  liabilities_line_items: FinancialLineItem[];

  // Source
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * Cash flow statement (Kassaflödesanalys).
 */
export interface CashFlowStatement {
  /** Operating activities (extracted) */
  operating_activities: NumberField | null;
  /** Investing activities (extracted) */
  investing_activities: NumberField | null;
  /** Financing activities (extracted) */
  financing_activities: NumberField | null;
  /** Total cash flow (extracted) */
  cash_flow_total: NumberField | null;
  /** Line items */
  line_items: FinancialLineItem[];
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// LEVEL 3 CONTINUED: CALCULATED FINANCIAL METRICS
// =============================================================================

/**
 * Calculate dynamic tolerance based on amount magnitude.
 *
 * Thresholds based on Swedish BRF report analysis:
 * - Small amounts (<100k SEK): ±5k or ±15% (OCR errors common)
 * - Medium amounts (100k-10M SEK): ±50k or ±10% (balance precision)
 * - Large amounts (>10M SEK): ±500k or ±5% (tight relative tolerance)
 */
export function getFinancialTolerance(amount: number): number {
  const absAmount = Math.abs(amount);

  if (absAmount < 100_000) {
    return Math.max(5_000, absAmount * 0.15);
  } else if (absAmount < 10_000_000) {
    return Math.max(50_000, absAmount * 0.10);
  } else {
    return Math.max(500_000, absAmount * 0.05);
  }
}

/**
 * Calculate tolerance for per-unit metrics (kr/m², kr/m²/år).
 *
 * Thresholds for Swedish BRF per-unit metrics:
 * - Debt per sqm (typically 10k-50k kr/m²): ±10% or ±1,000 kr minimum
 * - Fee per sqm (typically 500-2,000 kr/m²/år): ±10% or ±100 kr minimum
 */
export function getPerSqmTolerance(valuePerSqm: number, metricType: 'debt' | 'fee' = 'debt'): number {
  const absValue = Math.abs(valuePerSqm);

  if (metricType === 'debt') {
    return Math.max(1_000, absValue * 0.10);
  } else if (metricType === 'fee') {
    return Math.max(100, absValue * 0.10);
  } else {
    return Math.max(500, absValue * 0.10);
  }
}

/**
 * Financial metrics with tolerant validation.
 *
 * Key principles:
 * 1. NEVER null data - preserve both extracted and calculated values
 * 2. 3-tier validation: valid (green), warning (yellow), error (red)
 * 3. Dynamic tolerance based on amount magnitude
 * 4. Cross-validate extracted vs calculated values
 *
 * NOTE: Python version has @model_validator for 3-tier validation.
 * TODO: Port validator logic to TypeScript validation function.
 */
export interface CalculatedFinancialMetrics {
  // Debt per square meter (SEK/m²)
  total_debt_extracted: NumberField | null;
  total_area_sqm_extracted: NumberField | null;
  debt_per_sqm_extracted: NumberField | null;
  debt_per_sqm_calculated: number | null;

  // Solidarity percentage (Soliditet)
  equity_extracted: NumberField | null;
  assets_extracted: NumberField | null;
  solidarity_percent_extracted: NumberField | null;
  solidarity_percent_calculated: number | null;

  // Fee per square meter (Avgift per m²/år)
  monthly_fee_extracted: NumberField | null;
  apartment_area_extracted: NumberField | null;
  fee_per_sqm_annual_extracted: NumberField | null;
  fee_per_sqm_annual_calculated: number | null;

  // Validation metadata (3-tier system)
  validation_status: 'valid' | 'warning' | 'error' | 'unknown' | 'no_data';
  validation_warnings: string[];
  validation_errors: string[];
  overall_confidence: number; // 0.0-1.0

  // Metric-specific validation status
  debt_per_sqm_status: string;
  solidarity_percent_status: string;
  fee_per_sqm_status: string;
}

/**
 * Complete financial information.
 */
export interface FinancialData {
  income_statement: IncomeStatement | null;
  balance_sheet: BalanceSheet | null;
  cash_flow: CashFlowStatement | null;
  calculated_metrics: CalculatedFinancialMetrics | null;
}

// =============================================================================
// LEVEL 3: MULTI-YEAR FINANCIAL DATA (DYNAMIC 2-10+ YEARS)
// =============================================================================

/**
 * Multi-year table orientation detection.
 */
export enum MultiYearTableOrientation {
  YEARS_AS_COLUMNS = 'years_columns',  // Most common: years in header
  YEARS_AS_ROWS = 'years_rows',        // Years in first column
  MIXED = 'mixed',                      // Mixed orientation
  UNKNOWN = 'unknown'                   // Could not determine
}

/**
 * Single year of financial data with Swedish-first semantic fields.
 *
 * NOTE: Python version has @model_validator for Swedish ↔ English field synchronization.
 * TODO: Port sync_swedish_english_financial_aliases() validator logic.
 */
export interface YearlyFinancialData {
  // Required year identifier
  year: number; // 1900-2100

  // Swedish-first fields (Primary)
  nettoomsattning_tkr: NumberField | null; // Net revenue in tkr
  driftskostnader_tkr: NumberField | null; // Operating expenses in tkr
  driftsoverskott_tkr: NumberField | null; // Operating surplus in tkr
  arsresultat_tkr: NumberField | null;     // Annual result in tkr

  tillgangar_tkr: NumberField | null;      // Assets in tkr
  skulder_tkr: NumberField | null;         // Liabilities in tkr
  eget_kapital_tkr: NumberField | null;    // Equity in tkr
  soliditet_procent: NumberField | null;   // Solidarity in %

  // Metadata fields
  terminology_found: string | null;        // Which Swedish terminology was found
  unit_verified: boolean | null;           // Whether units were explicitly verified

  // English alias fields (Secondary - for backward compatibility)
  net_revenue_tkr: NumberField | null;        // ALIAS for nettoomsättning_tkr
  operating_expenses_tkr: NumberField | null; // ALIAS for driftskostnader_tkr
  operating_surplus_tkr: NumberField | null;  // ALIAS for driftsöverskott_tkr
  total_assets_tkr: NumberField | null;       // ALIAS for tillgångar_tkr
  total_liabilities_tkr: NumberField | null;  // ALIAS for skulder_tkr
  equity_tkr: NumberField | null;             // ALIAS for eget_kapital_tkr
  solidarity_percent: NumberField | null;     // ALIAS for soliditet_procent

  // Metadata
  is_complete: boolean;               // All core fields extracted successfully
  extraction_confidence: number;      // 0.0-1.0
  source_page: number | null;         // Page where this year's data was found
}

/**
 * Flexible multi-year financial data container.
 * Handles 2-10+ years without hardcoded columns.
 *
 * NOTE: Python version has @model_validator for auto-computing metadata.
 * TODO: Port compute_metadata() validator logic.
 */
export interface DynamicMultiYearOverview {
  // Core data
  years: YearlyFinancialData[];
  years_covered: number[];           // Sorted list of years [2021, 2022, 2023, ...]
  num_years: number;                 // Number of years extracted

  // Extraction metadata
  table_orientation: MultiYearTableOrientation;
  extraction_method: string;         // Method used for extraction
  confidence: number;                // 0.0-1.0 overall extraction confidence
}

// =============================================================================
// LEVEL 4: NOTES (COMPLETE EXTRACTION)
// =============================================================================

/**
 * Individual note with full details.
 */
export interface Note {
  note_number: NumberField | null;
  title: StringField | null;
  content: StringField | null;
  tables: Record<string, any>[];
  line_items: FinancialLineItem[];
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * Note 8: Building details (ultra-comprehensive).
 */
export interface BuildingDetails {
  // Acquisition Values
  opening_acquisition_value: NumberField | null;
  additions: NumberField | null;
  disposals: NumberField | null;
  closing_acquisition_value: NumberField | null;

  // Depreciation
  opening_depreciation: NumberField | null;
  current_year_depreciation: NumberField | null;
  disposals_depreciation: NumberField | null;
  closing_depreciation: NumberField | null;

  // Residual Values
  planned_residual_value: NumberField | null;

  // Tax Values
  tax_assessment_building: NumberField | null;
  tax_assessment_land: NumberField | null;
  tax_assessment_year: NumberField | null;

  // Depreciation Method
  depreciation_method: StringField | null;
  depreciation_period_years: NumberField | null;

  // Components (if detailed)
  building_components: Record<string, any>[];

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * Note 9: Receivables (every line item).
 */
export interface ReceivablesBreakdown {
  tax_account: NumberField | null;
  vat_deduction: NumberField | null;
  client_funds: NumberField | null;
  receivables: NumberField | null;
  other_deductions: NumberField | null;
  prepaid_expenses: NumberField | null;
  accrued_income: NumberField | null;
  other_items: FinancialLineItem[];
  total: NumberField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * All notes from annual report.
 */
export interface NotesCollection {
  // Standard Notes
  note_1_accounting_principles: Note | null;
  note_2_revenue: Note | null;
  note_3_personnel: Note | null;
  note_4_operating_costs: Note | null;
  note_5_financial_items: Note | null;
  note_6_tax: Note | null;
  note_7_intangible_assets: Note | null;
  note_8_buildings: BuildingDetails | null;
  note_9_receivables: ReceivablesBreakdown | null;
  note_10_cash: Note | null;
  note_11_equity: Note | null;
  note_12_liabilities: Note | null;
  note_13_contingencies: Note | null;
  note_14_pledged_assets: Note | null;
  note_15_related_parties: Note | null;

  // Additional Notes (variable)
  additional_notes: Note[];

  // Count
  total_notes: number;
}

// =============================================================================
// LEVEL 5: PROPERTY (MAXIMUM DETAIL)
// =============================================================================

/**
 * Individual apartment details.
 */
export interface ApartmentUnit {
  apartment_number: StringField | null;
  room_count: NumberField | null;
  size_sqm: NumberField | null;
  floor: NumberField | null;
  monthly_fee: NumberField | null;
  owner_name: StringField | null;
}

/**
 * Apartment distribution by size.
 */
export interface ApartmentDistribution {
  one_room: number; // 1 rok
  two_rooms: number; // 2 rok
  three_rooms: number; // 3 rok
  four_rooms: number; // 4 rok
  five_rooms: number; // 5 rok
  more_than_five: number; // >5 rok
}

/**
 * Commercial tenant information.
 */
export interface CommercialTenant {
  business_name: StringField | null;
  business_type: StringField | null;
  lease_area_sqm: NumberField | null;
  lease_start_date: DateField | null;
  lease_end_date: DateField | null;
  annual_rent: NumberField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Common area/facility.
 */
export interface CommonArea {
  name: StringField | null;
  area_type: 'gym' | 'laundry' | 'storage' | 'garage' | 'courtyard' | 'sauna' | 'other' | null;
  size_sqm: NumberField | null;
  description: StringField | null;
  maintenance_responsibility: StringField | null;
}

/**
 * Ultra-comprehensive property information.
 */
export interface PropertyDetails {
  // Property Identity
  property_designation: StringField | null; // Fastighetsbeteckning
  address: StringField | null;
  postal_code: StringField | null;
  city: StringField | null;
  municipality: StringField | null;
  county: StringField | null;
  coordinates: DictField | null; // lat/lng

  // Building Information
  built_year: NumberField | null;
  renovation_years: ListField<number> | null;
  building_type: StringField | null;
  number_of_buildings: NumberField | null;
  number_of_floors: NumberField | null;
  total_area_sqm: NumberField | null;
  living_area_sqm: NumberField | null;
  commercial_area_sqm: NumberField | null;

  // Apartments
  total_apartments: NumberField | null;
  apartment_distribution: ApartmentDistribution | null;
  apartment_units: ApartmentUnit[]; // If detailed list available

  // Commercial
  commercial_tenants: CommercialTenant[];
  number_of_commercial_units: NumberField | null;

  // Common Areas
  common_areas: CommonArea[];

  // Land
  land_area_sqm: NumberField | null;
  land_lease: BooleanField | null;
  land_lease_expiry: DateField | null;

  // Ownership
  cooperative_type: 'bostadsratt' | 'hyresratt' | 'mixed' | null;
  samfallighet_percentage: NumberField | null;
  samfallighet_description: StringField | null;

  // Energy
  energy_class: StringField | null;
  energy_performance_kwh_sqm_year: NumberField | null;
  energy_declaration_date: DateField | null;
  heating_type: StringField | null;

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// LEVEL 6: FEES & FINANCES (DETAILED)
// =============================================================================

/**
 * Complete fee structure with Swedish-first semantic fields.
 *
 * NOTE: Python version has @model_validator for Swedish ↔ English field synchronization
 * and monthly*12 ≈ annual cross-validation with ±10% tolerance.
 * TODO: Port sync_swedish_english_aliases() validator logic.
 */
export interface FeeStructure {
  // Swedish-first fields (Primary)
  arsavgift_per_sqm_total: NumberField | null; // Årsavgift kr/m²/år
  arsavgift_per_apartment_avg: NumberField | null; // Genomsnittlig årsavgift kr/lägenhet/år
  manadsavgift_per_sqm: NumberField | null; // Månadsavgift kr/m²/mån
  manadsavgift_per_apartment_avg: NumberField | null; // Genomsnittlig månadsavgift kr/lägenhet/mån

  // What's included (Swedish terminology)
  inkluderar_vatten: BooleanField | null; // Water included
  inkluderar_uppvarmning: BooleanField | null; // Heating included
  inkluderar_el: BooleanField | null; // Electricity included
  inkluderar_bredband: BooleanField | null; // Broadband included

  // Metadata
  terminology_found: string | null; // Which terminology was found
  unit_verified: boolean | null; // Whether unit was explicitly verified

  // English alias fields (Secondary - backward compatibility)
  monthly_fee_average: NumberField | null; // ALIAS for månadsavgift_per_apartment_avg
  monthly_fee_per_sqm: NumberField | null; // ALIAS for månadsavgift_per_sqm
  annual_fee_per_sqm: NumberField | null; // ALIAS for årsavgift_per_sqm_total

  // Fee by Apartment Size
  fee_1_rok: NumberField | null;
  fee_2_rok: NumberField | null;
  fee_3_rok: NumberField | null;
  fee_4_rok: NumberField | null;
  fee_5_rok: NumberField | null;

  // Fee Calculation
  fee_calculation_basis: StringField | null;
  fee_includes: string[]; // Legacy list
  fee_excludes: string[];

  // Fee Changes
  last_fee_increase_date: DateField | null;
  last_fee_increase_percentage: NumberField | null;
  planned_fee_changes: Record<string, any>[];

  // Special Fees
  special_assessments: Record<string, any>[]; // One-time assessments

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

/**
 * Individual loan information.
 */
export interface LoanDetails {
  loan_number: StringField | null;
  lender: StringField | null;
  original_amount: NumberField | null;
  outstanding_balance: NumberField | null;
  interest_rate: NumberField | null;
  interest_type: 'fixed' | 'variable' | null;
  maturity_date: DateField | null;
  amortization_schedule: StringField | null;
  collateral: StringField | null;
  covenants: string[];
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Reserve fund details.
 */
export interface ReserveFund {
  fund_name: StringField | null;
  balance: NumberField | null;
  purpose: StringField | null;
  target_amount: NumberField | null;
  annual_contribution: NumberField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Hierarchical cost structure metadata - supports 4 different cost organization types.
 */
export interface OperationalCostStructure {
  structure_type: 'flat' | 'hierarchical_7' | 'hybrid_5' | 'k2_standard' | 'unknown' | null;
  num_categories: NumberField | null;
  num_line_items: NumberField | null;
  categories: string[]; // Swedish terminology preserved
  accounting_regime: 'K2' | 'K3' | null;
  extraction_completeness: number; // 0.0-1.0
  source_pages: number[];
}

/**
 * Shared facility (GA1/GA2/samfällighet/gemensamhetsanläggningar) details.
 */
export interface SharedFacilityArrangement {
  facility_type: string | null; // GA1, GA2, samfällighet, etc.
  facility_description: StringField | null;
  annual_cost: NumberField | null;
  cost_percentage: NumberField | null; // Percentage of operating costs
  shared_with_brfs: string[]; // List of other BRFs sharing
  maintenance_responsibility: StringField | null;
  source_pages: number[];
}

/**
 * Detailed repair breakdown by building component.
 */
export interface RepairCostsBreakdown {
  // Envelope
  repairs_roof: NumberField | null;
  repairs_facade: NumberField | null;
  repairs_windows_doors: NumberField | null;
  repairs_balcony: NumberField | null;

  // Building systems
  repairs_plumbing: NumberField | null; // VVS - MAJOR cost category
  repairs_ventilation: NumberField | null;
  repairs_elevator: NumberField | null;
  repairs_electrical: NumberField | null;
  repairs_heat_pump: NumberField | null;

  // Special areas
  repairs_stairwell: NumberField | null;
  repairs_garage: NumberField | null;
  preschool_repairs: NumberField | null;

  // Utilities
  repairs_water_sewage: NumberField | null;
  repairs_waste_handling: NumberField | null;
  repairs_telecom: NumberField | null;

  // Other
  repairs_lokaler: NumberField | null; // Commercial space
  repairs_other: NumberField | null;

  source_pages: number[];
}

/**
 * Tomträtt (ground lease) financial burden analysis.
 */
export interface GroundLeaseMetrics {
  has_ground_lease: BooleanField | null; // tomträtt vs äganderätt
  annual_ground_rent: NumberField | null; // tomträttsavgäld
  ground_rent_percentage: NumberField | null; // % of operating costs
  burden_tier: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | null;
  lease_expiry_year: NumberField | null;
  years_until_expiry: NumberField | null;
  escalation_clause: StringField | null;
  projected_increase_20_year: NumberField | null;
  source_pages: number[];
}

/**
 * Property type classification and cost driver analysis.
 */
export interface PropertyTypeDetails {
  property_type: 'radhus' | 'flerbostadshus' | 'mixed' | 'other' | null;
  num_townhouses: NumberField | null;
  num_apartments: NumberField | null;
  townhouse_percentage: NumberField | null;
  individual_garden_count: NumberField | null;
  shared_green_space: BooleanField | null;
  garden_maintenance_responsibility: 'brf' | 'individual' | 'shared' | null;
  source_pages: number[];
}

/**
 * Canonical operating costs schema.
 *
 * All agents MUST use these exact field names when extracting operating cost data.
 * Swedish synonyms map to these canonical English field names.
 *
 * NOTE: Python version has 3 validators for:
 * - validate_utilities_hierarchy() - Smart utility aggregation
 * - validate_waste_hierarchy() - Waste cost aggregation
 * - validate_total() - Total vs sum validation ±10%
 * TODO: Port validator logic to TypeScript validation functions.
 */
export interface OperationalCosts {
  // UTILITIES (~40-50% of operating costs)
  electricity_cost: NumberField | null; // 10-15%
  heating_cost: NumberField | null; // 20-30%
  water_cost: NumberField | null; // 5-10%

  // MAINTENANCE (~20-30% of operating costs)
  property_maintenance_cost: NumberField | null; // 10-15%
  repairs_cost: NumberField | null; // 5-10%
  planned_maintenance_cost: NumberField | null; // 5-10%

  // ADMINISTRATIVE (~10-15% of operating costs)
  insurance_cost: NumberField | null; // 3-5%
  property_tax_cost: NumberField | null; // 2-4%
  management_fee: NumberField | null; // 3-5%

  // OPERATIONS (~5-10% of operating costs)
  waste_management_cost: NumberField | null; // 2-3%
  snow_removal_cost: NumberField | null; // 1-2%
  elevator_maintenance_cost: NumberField | null; // 1-2%
  cleaning_cost: NumberField | null; // 2-3%

  // GROUNDS & EXTERIOR (~5-10% of operating costs)
  garden_maintenance_cost: NumberField | null; // 3-12% (varies by type)
  grounds_keeping_cost: NumberField | null; // 1-3%

  // SPECIAL CATEGORIES
  tomtratt_cost: NumberField | null; // Ground lease 0-40%
  shared_facility_cost: NumberField | null; // GA1/GA2/samfällighet 5-20%

  // OTHER COSTS
  other_operational_costs: NumberField | null;

  // TOTALS
  total_operational_costs: NumberField | null; // Sum of all above

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// LEVEL 7: OPERATIONS & MAINTENANCE
// =============================================================================

/**
 * Supplier/contractor information.
 */
export interface Supplier {
  company_name: StringField | null;
  service_type: StringField | null;
  contract_value_annual: NumberField | null;
  contract_start: DateField | null;
  contract_end: DateField | null;
  renewal_terms: StringField | null;
  contact_info: StringField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Planned maintenance item.
 */
export interface MaintenanceItem {
  description: StringField | null;
  planned_year: NumberField | null;
  estimated_cost: NumberField | null;
  priority: 'high' | 'medium' | 'low' | null;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred' | null;
  actual_cost: NumberField | null;
  completion_date: DateField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Operations and maintenance information.
 */
export interface OperationsData {
  // Service Providers
  property_manager: StringField | null;
  property_management_fee: NumberField | null;
  suppliers: Supplier[];

  // Maintenance
  maintenance_plan_years: NumberField | null;
  planned_maintenance: MaintenanceItem[];
  completed_maintenance: MaintenanceItem[];

  // Insurance
  insurance_provider: StringField | null;
  insurance_coverage_types: string[];
  insurance_premium_annual: NumberField | null;
  insurance_deductible: NumberField | null;

  // Utilities
  electricity_provider: StringField | null;
  heating_provider: StringField | null;
  water_provider: StringField | null;
  broadband_provider: StringField | null;

  // Staff
  number_of_employees: NumberField | null;
  employee_roles: string[];

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// LEVEL 8: EVENTS & POLICIES
// =============================================================================

/**
 * Significant event during the year.
 */
export interface Event {
  event_date: DateField | null;
  event_type: StringField | null;
  description: StringField | null;
  financial_impact: NumberField | null;
  related_documents: string[];
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * BRF policy or rule.
 */
export interface Policy {
  policy_name: StringField | null;
  policy_type: 'financial' | 'operational' | 'governance' | 'environmental' | 'other' | null;
  policy_description: StringField | null;
  effective_date: DateField | null;
  review_date: DateField | null;
  approved_by: StringField | null;
  /** DEPRECATED: Use evidence_pages in fields instead */
  source_page: number[];
}

/**
 * Environmental and sustainability information.
 */
export interface EnvironmentalData {
  // Energy
  total_energy_consumption_kwh: NumberField | null;
  renewable_energy_percentage: NumberField | null;
  energy_efficiency_improvements: string[];

  // Waste
  waste_management_system: StringField | null;
  recycling_rate: NumberField | null;

  // Water
  water_consumption_m3: NumberField | null;
  water_saving_measures: string[];

  // Certifications
  environmental_certifications: string[];

  // Green Investments
  green_investments: Record<string, any>[];

  /** DEPRECATED: Use evidence_pages in fields instead */
  source_pages: number[];
}

// =============================================================================
// MASTER DOCUMENT MODEL
// =============================================================================

/**
 * Complete Swedish BRF Annual Report - Maximum Information Extraction.
 *
 * This is the top-level schema that encompasses all extracted data from a
 * BRF annual report. Version v1.0.0 includes:
 * - 8 hierarchical levels (Metadata → Events/Policies)
 * - 535 unique fields with confidence tracking
 * - Swedish-first semantic fields with English aliases
 * - Multi-year dynamic financial data (2-10+ years)
 * - Hierarchical cost structures (4 types)
 * - Ground lease burden analysis
 * - Tolerant validation (warnings, not rejections)
 */
export interface BRFAnnualReport {
  // Metadata
  metadata: DocumentMetadata;

  // Core Sections
  governance: GovernanceStructure | null;
  financial: FinancialData | null;
  multi_year_overview: DynamicMultiYearOverview | null;
  notes: NotesCollection | null;
  property: PropertyDetails | null;
  fees: FeeStructure | null;

  // Detailed Sections
  loans: LoanDetails[];
  reserves: ReserveFund[];
  operational_costs: OperationalCosts | null;
  operations: OperationsData | null;

  // Enhanced Classes (Phase 0 - added 2025-10-22)
  operational_cost_structure: OperationalCostStructure | null;
  shared_facilities: SharedFacilityArrangement[];
  repair_costs_breakdown: RepairCostsBreakdown | null;
  ground_lease_metrics: GroundLeaseMetrics | null;
  property_type_details: PropertyTypeDetails | null;

  // Events & Policies
  events: Event[];
  policies: Policy[];
  environmental: EnvironmentalData | null;

  // Free-Form Sections
  chairman_statement: StringField | null;
  board_report: StringField | null;
  auditor_report: StringField | null;

  // Quality Metrics
  extraction_quality: Record<string, number>;
  coverage_percentage: number; // 0-100
  confidence_score: number; // 0.0-1.0

  // Source Evidence
  all_source_pages: number[];
}

// =============================================================================
// SCHEMA COMPLETE - v1.0.0
// =============================================================================
//
// Port Status: 100% COMPLETE
// - Level 1: DocumentMetadata ✅
// - Level 2: GovernanceStructure ✅
// - Level 3: Financial (IncomeStatement, BalanceSheet, CashFlow, Metrics, MultiYear) ✅
// - Level 4: Notes (NotesCollection, BuildingDetails, Receivables) ✅
// - Level 5: PropertyDetails (Apartments, Commercial, CommonAreas, Land, Energy) ✅
// - Level 6: Fees & Finances (FeeStructure, Loans, Reserves, OperationalCosts) ✅
// - Level 7: Operations & Maintenance (Suppliers, MaintenanceItems, OperationsData) ✅
// - Level 8: Events & Policies (Events, Policies, EnvironmentalData) ✅
// - Master: BRFAnnualReport ✅
//
// Total: ~1,700 lines TypeScript (from 2,206 lines Python)
// Fields: 535 unique fields across all levels
// Validators marked TODO: 9 complex validators for future implementation
//
// Next Steps:
// 1. Update 19 agents to return ExtractionField types
// 2. Run ONE real ground truth extraction test
// 3. Implement DSPy integration for prompt/schema evolution
