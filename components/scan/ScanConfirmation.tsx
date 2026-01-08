'use client';

import { useMemo } from 'react';

type Props = {
  growName?: string | null;
  diagnosisSummary?: string | null;
  confidenceLabel?: string | null;
  scannedRecently?: boolean;
  seed?: string | null;
};

const reassurancePool = [
  "Changes typically unfold over time.",
  "This helps track trends, not instant results.",
  "The Garden will continue observing this grow.",
];

export default function ScanConfirmation({
  growName,
  diagnosisSummary,
  confidenceLabel,
  scannedRecently = false,
  seed = null,
}: Props) {
  const reassurance = useMemo(() => {
    const key = seed || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const idx = reassurancePool.length ? hash % reassurancePool.length : 0;
    return reassurancePool[idx];
  }, [seed]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Added to your grow’s history</p>
          <p className="text-xs text-white/70">{growName ? `Grow: ${growName}` : "Captured for your timeline."}</p>
        </div>
      </div>
      <p className="text-sm text-white/80">{reassurance}</p>

      {diagnosisSummary && (
        <div className="text-sm text-white/85">
          {diagnosisSummary}
          {confidenceLabel && <span className="text-white/60 text-xs ml-2">({confidenceLabel} confidence)</span>}
        </div>
      )}

      {scannedRecently && (
        <p className="text-xs text-white/60">
          Recent scans already represent this stage well.
        </p>
      )}
    </div>
  );
}

