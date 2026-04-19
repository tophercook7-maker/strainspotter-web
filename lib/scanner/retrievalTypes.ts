// lib/scanner/retrievalTypes.ts

export type RetrievalSource = "embedding" | "metadata" | "ocr" | "gpt";

export interface RetrievalCandidate {
  strainName: string;
  score: number; // 0 to 1
  source: RetrievalSource;
  reasons?: string[];
  metadataAgreement?: number; // 0 to 1
  retrievalDistance?: number | null;
}

export interface RetrievalSet {
  candidates: RetrievalCandidate[];
}
