"use client";

import React from "react";
import type { EffectsData } from "@/types/strain";

interface EffectsMatrixProps {
  effects: EffectsData;
}

export default function EffectsMatrix({ effects }: EffectsMatrixProps) {
  if (!effects) return null;

  const { body, mental, social } = effects;

  // Convert 0–100 values into triangle coordinates
  const max = 100;
  const x = (social - body) * 0.9; 
  const y = (mental - (body + social) / 2) * 1.1;

  return (
    <div className="effects-matrix">
      <h2 className="matrix-title">Effects Matrix</h2>

      <div className="triangle-wrapper">
        {/* Triangle background */}
        <div className="triangle-bg" />

        {/* Glowing centroid */}
        <div
          className="triangle-dot"
          style={{
            transform: `translate(${x}px, ${-y}px)`
          }}
        />
      </div>

      {/* Labels */}
      <div className="label-top">Mental Lift</div>
      <div className="label-left">Body Relief</div>
      <div className="label-right">Social Energy</div>
    </div>
  );
}
