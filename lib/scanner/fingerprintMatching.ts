// Stub — fingerprint matching (planned, not yet implemented)
export type FingerprintMatchScore = { strain: string; score: number; matchedTraits: string[] };
export type CandidateMatch = {
  strainName: string;
  name: string;
  confidence: number;
  overallScore: number;
  traits: string[];
  channelScores: {
    visual: number;
    genetics: number;
    terpenes: number;
    effects: number;
  };
};
