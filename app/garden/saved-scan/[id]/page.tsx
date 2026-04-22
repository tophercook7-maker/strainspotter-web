"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/app/garden/_components/TopNav";
import SavedScanResultsView from "@/app/garden/_components/SavedScanResultsView";
import { getSavedScanLocal } from "@/lib/growlog/savedScanRegistry";
import { savedToScanUi } from "@/lib/scanner/savedScanMappers";
import { compareScansPath } from "@/lib/scanner/savedScanNav";

export default function LocalSavedScanPage() {
  const params = useParams();
  const raw = params.id as string;
  const id = decodeURIComponent(raw);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const s = getSavedScanLocal(id);
    if (!s) setMissing(true);
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return (
      <>
        <TopNav title="Scan" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-8">
          <p className="text-white/40 text-sm">Loading…</p>
        </main>
      </>
    );
  }

  if (missing) {
    return (
      <>
        <TopNav title="Scan" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-12 text-center max-w-lg mx-auto">
          <p className="text-white/70">This saved scan isn&apos;t on this device anymore.</p>
          <p className="text-white/45 text-sm mt-2">
            If you saved it while signed in, open it from Scan History on any device.
          </p>
          <Link href="/garden/history" className="text-green-400 mt-6 inline-block">
            Scan History
          </Link>
        </main>
      </>
    );
  }

  const saved = getSavedScanLocal(id)!;
  const scanUi = savedToScanUi(saved);

  return (
    <>
      <TopNav title="Scan Results" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          <div className="mb-4 flex justify-end">
            <Link
              href={compareScansPath(saved.id)}
              className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/25 transition-colors"
            >
              Compare with another scan
            </Link>
          </div>
          <SavedScanResultsView
            scanUi={scanUi}
            poorImageMessage={saved.poorImageMessage}
            savedScanId={saved.id}
            linkedGrowLogEntryIds={saved.linkedGrowLogEntryIds}
            linkedPlantId={saved.linkedPlantId}
            linkedPlantName={saved.linkedPlantName}
            variant="fullscreen"
          />
        </div>
      </main>
    </>
  );
}
