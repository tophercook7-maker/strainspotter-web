"use client";

import { useState } from "react";
import AddLogForm from "./AddLogForm";

const TEMPLATES = [
  { label: "Watered", kind: "watering", note: "Watered." },
  { label: "Fed", kind: "feeding", note: "Fed nutrients." },
  { label: "Trained", kind: "training", note: "Training session." },
  { label: "Observed", kind: "note", note: "Observation:" },
  { label: "Pest check", kind: "pest", note: "Pest check:" },
  { label: "Deficiency check", kind: "deficiency", note: "Deficiency check:" },
] as const;

type Props = { plantId: string; gardenId: string };

export default function LogTemplatesBar({ plantId, gardenId }: Props) {
  const [initialKind, setInitialKind] = useState<string | undefined>(undefined);
  const [initialNote, setInitialNote] = useState<string | undefined>(undefined);
  const [templateNonce, setTemplateNonce] = useState(0);

  function applyTemplate(kind: string, note: string) {
    setInitialKind(kind);
    setInitialNote(note);
    setTemplateNonce((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TEMPLATES.map(({ label, kind, note }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyTemplate(kind, note)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
      <AddLogForm
        plantId={plantId}
        gardenId={gardenId}
        initialKind={initialKind}
        initialNote={initialNote}
        templateNonce={templateNonce}
      />
    </div>
  );
}
