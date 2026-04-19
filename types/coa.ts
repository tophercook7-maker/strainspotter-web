export interface CoaAnalyzedPotency {
  thcPercent: number | null;
  cbdPercent: number | null;
  minorCannabinoids: { name: string; percent: number }[];
}

export interface CoaAnalyzedTerpenes {
  totalPercent: number | null;
  topTerpenes: { name: string; percent: number }[];
}

export interface CoaAnalyzedSafety {
  pesticidesPass: boolean | null;
  heavyMetalsPass: boolean | null;
  microbesPass: boolean | null;
  residualSolventsPass: boolean | null;
  notes: string[];
}

export interface CoaAnalyzedSummary {
  productName: string | null;
  batchId: string | null;
  labName: string | null;
  testDate: string | null;
  strainName: string | null;
}

export interface CoaAnalysisResult {
  summary: CoaAnalyzedSummary;
  potency: CoaAnalyzedPotency;
  terpenes: CoaAnalyzedTerpenes;
  safety: CoaAnalyzedSafety;
  aiSummary: string;
  recommendedUseCases: string[];
  riskWarnings: string[];
}

