export type RiskLevel = "low" | "medium" | "high";

export type TariffJurisdiction = "HS" | "EU" | "UK" | "US" | "TR";

export type TariffCodeRecord = {
  id: string;
  code: string;
  jurisdiction: TariffJurisdiction;
  title: string;
  description: string;
  keywords: string[];
  chapter: string;
  section: string;
  dutyRatePlaceholder: string;
  requiredDocuments: string[];
  restrictionNotes: string[];
  riskLevel: RiskLevel;
};

export type TariffCandidate = TariffCodeRecord & {
  score: number;
  matchedKeywords: string[];
  source: string;
};

export type DutyMeasure = {
  code: string;
  originCountry: string;
  destinationCountry: string;
  dutyRatePlaceholder: string;
  notes: string[];
};

export type TariffDataProvider = {
  searchCodes(query: string, destinationCountry: string): Promise<TariffCandidate[]>;
  getCodeDetails(code: string, destinationCountry: string): Promise<TariffCodeRecord | null>;
  getDutyMeasures(
    code: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<DutyMeasure>;
  getRequiredDocuments(
    code: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<string[]>;
  getRestrictions(
    code: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<string[]>;
};
