import { ExtractionField } from './extraction-field';

export interface BoardMember {
  name: string;
  role: string; // Ordförande, Ledamot, Suppleant
}

export interface GovernanceData {
  chairman: ExtractionField<string>;
  board_members: ExtractionField<BoardMember[]>;
  auditor_name: ExtractionField<string>;
  audit_firm: ExtractionField<string>;
}
