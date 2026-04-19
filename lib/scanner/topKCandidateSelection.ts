// Stub — top-K candidate selection (planned, not yet implemented)
import type { CandidateMatch } from "./fingerprintMatching";
export type { CandidateMatch };
export type CandidateSet = {
  primary: CandidateMatch;
  candidates: CandidateMatch[];
  alternates: CandidateMatch[];
  rejectedButClose: CandidateMatch[];
  topK: number;
};
