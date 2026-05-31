// lib/scanner/scanRouteOrchestrator.ts

import {
  assessImageQualityInputs,
  type ImageQualitySignal,
  SCAN_SUPPORTED_IMAGE_MIMES,
} from "@/lib/scanner/imageQuality";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

export interface ScanOrchestratorInput {
  images: string[];
}

export interface ScanOrchestratorPreparation {
  quality: ImageQualitySignal;
  preparedImages: string[];
  supportedMimes: string[];
}

export interface ScanFusionContext {
  quality: ImageQualitySignal;
  retrievalCandidates: RetrievalCandidate[];
}

export function prepareScanInputs(images: string[]): ScanOrchestratorPreparation {
  const safeImages = Array.isArray(images) ? images : [];
  const quality = assessImageQualityInputs(safeImages);

  return {
    quality,
    preparedImages: safeImages.slice(0, 5),
    supportedMimes: SCAN_SUPPORTED_IMAGE_MIMES,
  };
}

export function buildFusionContext(
  quality: ImageQualitySignal
): ScanFusionContext {
  return {
    quality,
    retrievalCandidates: [],
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

  return Math.max(0, Math.min(100, penaltyAdjusted));
}
