"use client";

import React from "react";
import type { FlavorData } from "@/types/strain";

interface FlavorWheelProps {
  flavors: FlavorData[];
}

export default function FlavorWheel({ flavors }: FlavorWheelProps) {
  if (!flavors || flavors.length === 0) return null;

  return (
    <div className="flavor-wheel-container">
      <h2 className="wheel-title">Flavor & Aroma Profile</h2>

      <div className="flavor-wheel">
        {flavors.map((f, idx) => (
          <div
            key={idx}
            className="flavor-slice"
            style={{
              "--index": idx,
              "--percent": f.intensity / 100,
              "--hue": f.hue,
            } as React.CSSProperties}
          >
            <span className="flavor-label">{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
