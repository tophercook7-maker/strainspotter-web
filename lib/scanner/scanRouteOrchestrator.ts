import {
  assessImageQualityInputs,
  type ImageQualitySignal,
} from "@/lib/scanner/imageQuality";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

export interface ScanOrchestratorInput {
  images: string[];
}

export interface ScanOrchestratorPreparation {
  quality: ImageQualitySignal;
  preparedImages: string[]; // max 5
  supportedMimes: string[];
}

export interface ScanFusionContext {
  quality: ImageQualitySignal;
  retrievalCandidates: RetrievalCandidate[];
}

const SUPPORTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function prepareScanInputs(images: string[]): ScanOrchestratorPreparation {
  const safeImages = Array.isArray(images) ? images : [];
  const quality = assessImageQualityInputs(safeImages);

  return {
    quality,
    preparedImages: safeImages.slice(0, 5),
    supportedMimes: SUPPORTED_MIMES,
  };
}

export function buildFusionContext(
  quality: ImageQualitySignal
): ScanFusionContext {
  return {
    quality,
    retrievalCandidates: [
      // TODO(scanner-brain): inject embedding retrieval candidates here.
      // TODO(scanner-brain): inject metadata reranking candidates here.
      // TODO(scanner-brain): inject OCR-backed candidates here.
    ],
  };
}

export function applyConfidenceAdjustments(
  baseConfidence: number,
  context: ScanFusionContext
): number {
  const numericBase = Number.isFinite(baseConfidence) ? baseConfidence : 0;
  const penaltyAdjusted = Math.round(
    numericBase - context.quality.qualityPenalty * 20
  );

  // TODO(scanner-brain): add synthetic-image / stock-photo penalties here.
  // TODO(scanner-brain): add retrieval agreement boosts here.

  return Math.max(0, Math.min(100, penaltyAdjusted));
}
