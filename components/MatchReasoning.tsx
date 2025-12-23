'use client';

import { useState } from 'react';
import { formatReasons, getPrimaryReason } from '@/lib/scanner/reasoning';

interface MatchReasoningProps {
  reasoning: string;
  breakdown?: {
    color: number;
    text: number;
    label: number;
    web: number;
  };
  reasons?: string[]; // Internal reason codes from API
}

export default function MatchReasoning({ reasoning, breakdown, reasons }: MatchReasoningProps) {
  const [expanded, setExpanded] = useState(false);

  // Format reasons to human-readable text
  const formattedReasons = reasons ? formatReasons(reasons) : [];
  const primaryReason = reasons ? getPrimaryReason(reasons) : null;

  // Show reasoning section if we have reasons or reasoning text
  const hasReasoning = formattedReasons.length > 0 || reasoning;

  if (!hasReasoning) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-2">
          Why this match?
        </h3>
        
        {/* Primary reason (always visible) */}
        {primaryReason && (
          <p className="text-[var(--botanical-accent)] text-sm mb-2">{primaryReason}</p>
        )}
        
        {/* Fallback to reasoning text if no reasons array */}
        {!primaryReason && reasoning && (
          <p className="text-[var(--botanical-text-secondary)] text-sm">{reasoning}</p>
        )}

        {/* Additional reasons (expandable) */}
        {formattedReasons.length > 1 && (
          <div>
            {expanded ? (
              <div className="mt-2 space-y-1">
                {formattedReasons.map((reason, idx) => (
                  <div key={idx} className="text-xs text-[var(--botanical-text-secondary)] flex items-center gap-2">
                    <span className="text-[var(--botanical-accent)]">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-[var(--botanical-accent)] hover:underline mt-2"
                >
                  Show less
                </button>
              </div>
            ) : (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-[var(--botanical-accent)] hover:underline mt-2"
              >
                + {formattedReasons.length - 1} more reason{formattedReasons.length - 1 !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legacy breakdown (if provided) */}
      {breakdown && (
        <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-3">Score Breakdown</h3>
          <div className="space-y-2">
            {breakdown.text > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--botanical-text-secondary)]">Text Match</span>
                  <span className="text-[var(--botanical-accent)]">{breakdown.text}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{ width: `${breakdown.text}%` }}
                  />
                </div>
              </div>
            )}
            {breakdown.color > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--botanical-text-secondary)]">Color Similarity</span>
                  <span className="text-[var(--botanical-accent)]">{breakdown.color}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${breakdown.color}%` }}
                  />
                </div>
              </div>
            )}
            {breakdown.label > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--botanical-text-secondary)]">Label Detection</span>
                  <span className="text-[var(--botanical-accent)]">{breakdown.label}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${breakdown.label}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

