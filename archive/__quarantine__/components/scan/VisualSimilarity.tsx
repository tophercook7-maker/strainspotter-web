'use client';

import { useState } from 'react';

const defaultItems = [
  "Flowering-stage plants with dense lateral growth and stacked sites",
  "Broad-leaf plants documented under steady nitrogen feeding",
  "Canopies showing even light distribution with compact internodes",
  "Mid-flower tops with balanced pistil coverage and moderate resin build-up",
];

export default function VisualSimilarity({ items = defaultItems }: { items?: string[] }) {
  const [open, setOpen] = useState(false);
  const display = (items || defaultItems).slice(0, Math.max(2, Math.min(5, (items || defaultItems).length)));

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">Visual Similarity</h3>
        <p className="text-sm text-white/70">
          This plant shares visual traits with documented examples from the Garden’s growing library.
        </p>
      </div>

      <div className="space-y-2">
        {display.map((item, idx) => (
          <div key={idx} className="text-sm text-white/85 bg-white/5 rounded-md px-3 py-2 border border-white/10">
            {item}
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpen((s) => !s)}
        className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
      >
        {open ? "Hide details" : "Learn how similarity is determined"}
      </button>

      {open && (
        <p className="text-xs text-white/70">
          Visual similarity is based on leaf structure, color patterns, and growth form observed across documented grows.
        </p>
      )}
    </div>
  );
}

