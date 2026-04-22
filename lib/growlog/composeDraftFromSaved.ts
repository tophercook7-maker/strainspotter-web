import type { GrowLogComposeDraft } from "@/lib/growlog/growLogStorage";
import { savedToClientSnapshot } from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

/** Single path from canonical saved scan → session compose draft (local or server-sourced). */
export function growLogComposeDraftFromSaved(saved: SavedUnifiedScan): GrowLogComposeDraft {
  const snapshot = savedToClientSnapshot(saved);
  return {
    mode: "full",
    snapshot,
    userNotes: "",
    imageDataUrls: snapshot.imageDataUrls,
  };
}
