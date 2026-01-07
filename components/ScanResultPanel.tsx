// components/ScanResultPanel.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FlavorWheel from "@/components/FlavorWheel";
import EffectsMatrix from "@/components/EffectsMatrix";

interface ScanResult {
  name?: string;
  strainName?: string;
  type?: string | string[];
  thc?: number | string;
  cbd?: number | string;
  summary?: string;
  heroImage?: string;
  terpenes?: any[];
  effects?: any;
  issues?: string[];
  doctorSummary?: string;
  doctor?: {
    health?: number;
    issues?: string[];
    fixes?: string[];
  };
}

interface ScanResultPanelProps {
  result: ScanResult;
  isDoctorScan?: boolean;
  growId?: string;
  tier?: "free" | "garden" | "pro" | null;
  onClose: () => void;
}

type Insight = {
  title?: string;
  summary?: string;
  confidence?: "Low" | "Moderate" | "High";
  relation?: "new" | "consistent" | "improving";
  status?: "resolving" | "unresolved" | "resolved" | null;
  evidencePreview?: string[];
};

export default function ScanResultPanel({
  result,
  isDoctorScan = false,
  growId,
  tier = "free",
  onClose,
}: ScanResultPanelProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    // animate in
    setTimeout(() => setVisible(true), 20);
  }, []);

  useEffect(() => {
    if (!growId) return;
    let aborted = false;
    const fetchInsight = async () => {
      try {
        const res = await fetch(`/api/grow-doctor/insight?growId=${growId}&tier=${tier}`);
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        if (data?.diagnosis) {
          setInsight(data.diagnosis);
        }
      } catch (err) {
        console.error("[GrowDoctor] insight fetch failed", err);
      }
    };
    fetchInsight();
    return () => {
      aborted = true;
    };
  }, [growId, tier]);

  const strainName = result.name || result.strainName || "Unknown Strain";
  const types = Array.isArray(result.type) ? result.type : result.type ? [result.type] : [];
  const thcValue = typeof result.thc === 'number' ? result.thc : typeof result.thc === 'string' ? parseFloat(result.thc.replace('%', '').replace('–', '-').split('-')[0]) : 0;
  const cbdValue = typeof result.cbd === 'number' ? result.cbd : typeof result.cbd === 'string' ? parseFloat(result.cbd.replace('%', '').replace('<', '').replace('–', '-').split('-')[0]) : 0;

  return (
    <div className={`result-overlay ${visible ? "active" : ""}`} onClick={onClose}>
      <div className="result-container" onClick={(e) => e.stopPropagation()}>
        {/* TOP BAR */}
        <button className="close-btn" onClick={onClose}>✕</button>

        {/* HERO IMAGE */}
        <div className="result-hero">
          <Image
            src={result.heroImage || "/emblem/hero.png"}
            width={180}
            height={180}
            alt="strain hero"
            className="result-hero-img"
          />
        </div>

        {/* STRAIN NAME */}
        <h1 className="strain-title">{strainName}</h1>

        {/* TYPE BADGES */}
        {types.length > 0 && (
          <div className="strain-types">
            {types.map((t, i) => (
              <span key={i} className="type-pill">{t}</span>
            ))}
          </div>
        )}

        {/* THC/CBD BARS */}
        <div className="cannabinoid-bars">
          <div className="bar-row">
            <span className="bar-label">THC</span>
            <div className="bar-bg">
              <div
                className="bar-fill thc"
                style={{ width: `${Math.min(thcValue, 40) * 2.5}%` }}
              />
            </div>
            <span className="bar-value">{result.thc ?? "--"}%</span>
          </div>

          <div className="bar-row">
            <span className="bar-label">CBD</span>
            <div className="bar-bg">
              <div
                className="bar-fill cbd"
                style={{ width: `${Math.min(cbdValue, 20) * 5}%` }}
              />
            </div>
            <span className="bar-value">{result.cbd ?? "--"}%</span>
          </div>
        </div>

        {/* AI SUMMARY */}
        {result.summary && (
          <div className="ai-summary">
            <h2>AI Identification Summary</h2>
            <p>{result.summary}</p>
          </div>
        )}

        {/* GROW DOCTOR INSIGHT */}
        {insight && (
          <div className="doctor-section">
            <h2>Grow Doctor Insight</h2>
            <div className="doctor-card">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">
                  {insight.title || insight.summary || "Recent cultivation patterns reviewed."}
                </div>
                {insight.confidence && (
                  <span className="px-2 py-1 rounded bg-white/10 text-xs text-white/80">
                    Confidence: {insight.confidence}
                  </span>
                )}
              </div>
              {insight.relation && (
                <div className="text-xs text-white/60 mt-2">Relation to previous scans: {insight.relation}</div>
              )}
              {insight.evidencePreview && insight.evidencePreview.length > 0 && (
                <ul className="mt-2 text-sm text-white/70 list-disc list-inside space-y-1">
                  {insight.evidencePreview.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TERPENE WHEEL PREVIEW */}
        {result.terpenes && result.terpenes.length > 0 && (
          <div className="mini-terpene-wheel">
            <h2>Terpene Profile</h2>
            <FlavorWheel flavors={result.terpenes} />
          </div>
        )}

        {/* EFFECT MATRIX */}
        {result.effects && (
          <div className="effect-matrix">
            <h2>Primary Effects</h2>
            <EffectsMatrix effects={result.effects} />
          </div>
        )}

        {/* DOCTOR SCAN SECTION */}
        {isDoctorScan && result.doctor && (
          <div className="doctor-section">
            <h2>Grow Doctor Diagnosis</h2>

            <div className="doctor-card">
              {result.doctor.health !== undefined && (
                <>
                  <h3>Health Score</h3>
                  <div className="doctor-health">
                    <div className="health-bar-bg">
                      <div
                        className="health-bar-fill"
                        style={{ width: `${result.doctor.health}%` }}
                      />
                    </div>
                    <span>{result.doctor.health}%</span>
                  </div>
                </>
              )}

              {result.doctor.issues && result.doctor.issues.length > 0 && (
                <>
                  <h3>Issues Detected</h3>
                  <ul>
                    {result.doctor.issues.map((i, idx) => (
                      <li key={idx}>• {i}</li>
                    ))}
                  </ul>
                </>
              )}

              {result.doctor.fixes && result.doctor.fixes.length > 0 && (
                <>
                  <h3>Recommended Fixes</h3>
                  <ul>
                    {result.doctor.fixes.map((f, idx) => (
                      <li key={idx}>• {f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* NON-MEMBER UPGRADE OFFER */}
        {!isDoctorScan && (
          <div className="upgrade-box">
            <h3>Unlock Full Grower + Doctor Diagnostics</h3>
            <p>Join the Garden to access advanced features.</p>
            <button className="upgrade-btn" onClick={() => router.push("/join")}>
              Join the Garden
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

