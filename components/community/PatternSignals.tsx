"use client";

import { useState, useEffect } from "react";

interface PatternSignal {
  id: string;
  signal_text: string;
  confidence_score: number;
  created_at: string;
}

export default function PatternSignals() {
  const [signals, setSignals] = useState<PatternSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);
  const [patternSignalsEnabled, setPatternSignalsEnabled] = useState(true);

  useEffect(() => {
    // STEP 8: Kill switch is checked server-side in API routes

    // STEP 7: Check user preferences
    async function checkPreferences() {
      try {
        const res = await fetch("/api/community/intelligence-settings");
        const prefs = await res.json();
        setIntelligenceEnabled(prefs.enabled);
        setPatternSignalsEnabled(prefs.pattern_signals);
        return prefs;
      } catch (error) {
        console.error("Error fetching preferences:", error);
        return { enabled: true, pattern_signals: true }; // Defaults
      }
    }

    async function fetchSignals() {
      try {
        const res = await fetch("/api/community/pattern-signals");
        const data = await res.json();
        if (data.signals) {
          // Filter by confidence threshold (0.6) and not dismissed
          const valid = data.signals.filter(
            (s: PatternSignal) => s.confidence_score >= 0.6 && !dismissed.has(s.id)
          );
          setSignals(valid.slice(0, 1)); // Max 1 signal
        }
      } catch (error) {
        console.error("Error fetching pattern signals:", error);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const prefs = await checkPreferences();
      if (prefs.enabled && prefs.pattern_signals) {
        await fetchSignals();
      }
    }

    init();
  }, [dismissed, intelligenceEnabled, patternSignalsEnabled]);

  // STEP 8 & STEP 7: Kill switch and user preferences
  if (!intelligenceEnabled || !patternSignalsEnabled) {
    return null;
  }

  if (loading || signals.length === 0) {
    return null;
  }

  const signal = signals[0];

  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20 relative">
      <button
        onClick={() => setDismissed(new Set([...dismissed, signal.id]))}
        className="absolute top-2 right-2 text-white/60 hover:text-white/80 text-sm"
        aria-label="Dismiss"
      >
        ×
      </button>
      <h3 className="text-sm font-semibold text-white mb-2">Quiet Intelligence</h3>
      <p className="text-sm text-white/80">{signal.signal_text}</p>
    </div>
  );
}
