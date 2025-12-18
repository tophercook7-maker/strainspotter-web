"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { usePortal } from "./PortalController";
import EffectsMatrix from "@/components/EffectsMatrix";
import MoodTimeline from "@/components/MoodTimeline";
import VibeEnginePanel from "@/components/VibeEnginePanel";
import FlavorWheel from "@/components/FlavorWheel";
import type { StrainData } from "@/types/strain";

export default function PortalWarp() {
  const { activeSlug, isActive, exiting, closePortal } = usePortal();
  const [strain, setStrain] = useState<StrainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSlug) {
      setStrain(null);
      setError(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/strain/${activeSlug}`);
        if (!res.ok) {
          throw new Error(`Failed to load strain: ${res.statusText}`);
        }
        const json = await res.json();
        setStrain(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load strain");
        console.error("Error loading strain:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeSlug]);

  if (!activeSlug) return null;

  return (
    <div className={clsx("portal-overlay", isActive && "active", exiting && "exiting")}>
      <div className={clsx("portal-vortex", isActive && "active", exiting && "exiting")} />

      <div className={clsx("portal-holo-panel", isActive && "active", exiting && "exiting")}>
        {loading ? (
          <p className="text-emerald-300 text-center">Loading strain…</p>
        ) : error ? (
          <div className="text-center space-y-3">
            <p className="text-red-400">{error}</p>
            <button
              onClick={closePortal}
              className="px-4 py-2 rounded-md border border-emerald-300/30 text-emerald-200/80 hover:bg-emerald-700/20"
            >
              Close
            </button>
          </div>
        ) : !strain ? (
          <p className="text-emerald-300 text-center">No strain data available</p>
        ) : (
          <div className="space-y-5">
            {/* Hero image - 44px × 44px, centered */}
            <div className="flex justify-center">
              <div 
                className="flex items-center justify-center"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#000',
                  border: '1px solid rgba(16,255,180,0.45)',
                  boxShadow: '0 0 12px rgba(16,255,180,0.55)',
                  borderRadius: '50%',
                }}
              >
                <Image
                  src="/emblem/hero-small.png"
                  alt="Strain hero"
                  width={44}
                  height={44}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>

            {/* NAME + TYPE */}
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-bold text-emerald-200 drop-shadow">
                {strain.name}
              </h2>
              <p className="uppercase tracking-wide text-emerald-300/70 text-sm">
                {strain.type || "Unknown Type"}
              </p>
            </div>

            {/* STATS */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-emerald-300/70 mb-1">THC</p>
                <div className="w-full bg-emerald-800/40 h-2 rounded">
                  <div
                    className="h-2 bg-emerald-400 rounded transition-all"
                    style={{ width: `${Math.min((strain.thc ?? 0), 40) * 2.5}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <p className="text-xs text-emerald-300/70 mb-1">CBD</p>
                <div className="w-full bg-emerald-800/40 h-2 rounded">
                  <div
                    className="h-2 bg-emerald-300 rounded transition-all"
                    style={{ width: `${Math.min((strain.cbd ?? 0), 20) * 4}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* AI MICRO SUMMARY */}
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {strain.ai_summary ||
                "Balanced effects reported. Good for relaxation, mood support, and clarity."}
            </p>

            {/* VIBE ENGINE PANEL */}
            {strain.vibe && (
              <VibeEnginePanel vibe={strain.vibe} />
            )}

            {/* FLAVOR WHEEL */}
            {strain.flavors && strain.flavors.length > 0 && (
              <FlavorWheel flavors={strain.flavors} />
            )}

            {/* EFFECTS MATRIX */}
            {strain.effects && (
              <EffectsMatrix effects={strain.effects} />
            )}

            {/* MOOD TIMELINE */}
            {strain.timeline && strain.timeline.length > 0 && (
              <MoodTimeline timeline={strain.timeline} />
            )}

            {/* BUTTONS */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={() => (window.location.href = `/strain/${strain.slug}`)}
                className="w-full py-2 rounded-md 
                     bg-emerald-600/40 hover:bg-emerald-500/50 
                     border border-emerald-300/40 
                     text-emerald-200 font-semibold"
              >
                View Full Profile
              </button>

              <button
                className="w-full py-2 rounded-md 
                     bg-black/40 hover:bg-black/60 
                     border border-gold/30 
                     text-gold font-medium"
              >
                ⭐ Add to Favorites
              </button>

              <button
                className="w-full py-2 rounded-md 
                     bg-emerald-700/30 hover:bg-emerald-600/40 
                     border border-emerald-400/40
                     text-emerald-200"
              >
                🌱 Start Grow Log
              </button>

              <button
                onClick={closePortal}
                className="w-full py-2 rounded-md border border-emerald-300/30 text-emerald-200/80 hover:bg-emerald-700/20"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
