/**
 * Shared types for embedding / metadata / OCR / GPT retrieval candidates.
 */

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
