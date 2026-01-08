'use client';

import { useMemo, useState } from 'react';

type Props = {
  descriptors?: string[];
  confidence?: 'observational';
  growContext?: string[];
};

// TODO: Replace placeholders with model-generated descriptors, embeddings, and personal notes context when available.
export default function VisualSimilarityPanel({ descriptors, confidence = 'observational', growContext }: Props) {
  const [showContext, setShowContext] = useState(false);

  const displayDescriptors = useMemo(() => {
    const source = descriptors && descriptors.length > 0 ? descriptors : undefined;
    const base = source ?? [
      'Leaf margin curl under sustained light exposure',
      'Surface texture often seen in late vegetative growth',
      'Color distribution typical of nitrogen-rich environments',
      'Canopy shape commonly associated with even light spread',
    ];
    const list = base.slice(0, 4);
    return list.length >= 2 ? list : base;
  }, [descriptors]);

  const hasDescriptors = (descriptors && descriptors.length > 0) ?? false;
  const hasGrowContext = Array.isArray(growContext) && growContext.length > 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">Visual similarity</h3>
        <p className="text-sm text-white/70">Observations based on visual patterns, not identification</p>
      </div>

      {hasDescriptors ? (
        <ul className="list-disc list-inside space-y-2 text-sm text-white/85">
          {displayDescriptors.slice(0, 4).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/70">Pattern observations will appear as more scans are collected.</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-white/60">
        <span>Confidence: Observational</span>
        <button
          type="button"
          onClick={() => setShowContext((s) => !s)}
          className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
        >
          {showContext ? 'Hide context' : 'How this relates to my grow'}
        </button>
      </div>

      {showContext && (
        <div className="text-sm text-white/75 bg-white/5 border border-white/10 rounded-md p-3 space-y-2">
          {hasGrowContext ? (
            <ul className="list-disc list-inside space-y-1">
              {growContext!.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>Linking to a grow allows deeper context over time.</p>
          )}
        </div>
      )}
    </div>
  );
}

