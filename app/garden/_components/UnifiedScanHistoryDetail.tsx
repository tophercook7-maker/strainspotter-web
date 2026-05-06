"use client";

import { useEffect } from "react";
import SavedScanResultsView from "@/app/garden/_components/SavedScanResultsView";
import { upsertSavedScanLocal } from "@/lib/growlog/savedScanRegistry";
import { savedToScanUi } from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

type Props = {
  saved: SavedUnifiedScan;
  createdLabel?: string | null;
};

export default function UnifiedScanHistoryDetail({ saved, createdLabel }: Props) {
  useEffect(() => {
    upsertSavedScanLocal(saved);
  }, [saved]);

  const scanUi = savedToScanUi(saved);
  const id = saved.id;

  return (
    <div>
      {createdLabel && (
        <p className="text-sm text-white/50 mb-4">
          Scanned {createdLabel}
        </p>
      )}
      <SavedScanResultsView
        scanUi={scanUi}
        poorImageMessage={saved.poorImageMessage}
        savedScanId={id}
        linkedGrowLogEntryIds={saved.linkedGrowLogEntryIds}
        linkedPlantId={saved.linkedPlantId}
        linkedPlantName={saved.linkedPlantName}
        variant="embedded"
      />
    </div>
  );
}
