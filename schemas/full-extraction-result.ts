import { FinancialData } from './financial-data';
import { BalanceSheetData } from './balance-sheet';
import { GovernanceData } from './governance-data';
import { PropertyData } from './property-data';

export interface AgentResult {
  agentId: string;
  consensusLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  overallConfidence: number;
  data: Record<string, any>;
  evidence_pages: number[];
}

export interface FullExtractionResult {
  pdfId: string;
  pdfPath: string;
  agents: AgentResult[];
  
  // Aggregated data by category
  financial?: FinancialData;
  balanceSheet?: BalanceSheetData;
  governance?: GovernanceData;
  property?: PropertyData;
  
  // Summary metrics
  summary: {
    totalFields: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unresolved: number;
    totalCost: number;
    duration: string;
  };
}
