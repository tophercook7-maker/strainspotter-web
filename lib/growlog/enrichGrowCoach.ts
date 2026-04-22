import { buildProgressionNoteForClient } from "@/lib/scanner/growCoachBuilder";
import type { GrowCoachPayload, PlantAnalysisPayload } from "@/lib/scanner/rankedScanTypes";
import type { PreviousScanComparisonContext } from "@/lib/growlog/scanProgression";

/**
 * Merge progression wording using durable saved-scan context when available,
 * otherwise the resolved chain-backed prior from `resolvePreviousScanForProgression`.
 */
export function enrichGrowCoachWithProgression(
  gc: GrowCoachPayload,
  plant: PlantAnalysisPayload,
  priorContext: PreviousScanComparisonContext | null
): GrowCoachPayload {
  if (!priorContext) return gc;
  const note = buildProgressionNoteForClient(
    {
      capturedAt: priorContext.capturedAt,
      plantAnalysis: priorContext.plantAnalysis,
    },
    plant,
    {
      priorKind: priorContext.source === "saved" ? "saved" : "session",
    }
  );
  if (!note) return gc;
  return { ...gc, progressionNote: note };
}
