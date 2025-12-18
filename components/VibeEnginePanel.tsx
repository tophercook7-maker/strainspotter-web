"use client";

import React from "react";
import type { VibeData } from "@/types/strain";

interface VibeEnginePanelProps {
  vibe: VibeData;
}

/* VIBE ENGINE — STEP 6 */
export default function VibeEnginePanel({ vibe }: VibeEnginePanelProps) {
  if (!vibe) return null;

  return (
    <div className="vibe-panel">
      <h2 className="vibe-title">AI Vibe Summary</h2>
      <p className="vibe-summary">{vibe.summary}</p>

      {/* Mood resonance bars */}
      <div className="vibe-bars">
        {vibe.resonance?.map((r, idx) => (
          <div key={idx} className="bar-wrapper">
            <div
              className="bar-fill"
              style={{ height: `${r.strength}%` }}
            />
            <span>{r.label}</span>
          </div>
        ))}
      </div>

      {/* AI Why Explanation */}
      <div className="vibe-why">
        <h3>Why the AI Thinks This</h3>
        <p>{vibe.reasoning}</p>
      </div>
    </div>
  );
}
