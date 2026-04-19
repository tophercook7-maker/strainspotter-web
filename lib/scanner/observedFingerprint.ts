// Stub — observed fingerprint (planned, not yet implemented)
export type ObservedFingerprint = {
  traits: string[];
  confidence: number;
  inferredTerpeneVector: { likely: string[]; possible: string[] };
  inferredEffectVector: { likely: string[]; possible: string[] };
};
