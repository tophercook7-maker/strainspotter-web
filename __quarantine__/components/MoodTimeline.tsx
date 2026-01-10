"use client";

import React from "react";
import type { TimelineData } from "@/types/strain";

interface MoodTimelineProps {
  timeline: TimelineData[];
}

export default function MoodTimeline({ timeline }: MoodTimelineProps) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="timeline-panel">
      <h2 className="timeline-title">Experience Timeline</h2>

      <div className="timeline-curve">
        {timeline.map((point, idx) => (
          <div
            key={idx}
            className="timeline-node"
            style={{
              bottom: `${point.intensity}%`,
              animationDelay: `${idx * 0.25}s`,
            }}
          >
            <div className="node-glow"></div>
            <span>{point.label}</span>
          </div>
        ))}

        <svg viewBox="0 0 100 40" className="timeline-svg">
          <polyline
            points={timeline
              .map((p, i) => `${i * 25},${40 - (p.intensity * 0.35)}`)
              .join(" ")}
            className="timeline-line"
          />
        </svg>
      </div>
    </div>
  );
}
