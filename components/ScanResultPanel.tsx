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
  onClose: () => void;
}

export default function ScanResultPanel({ result, isDoctorScan = false, onClose }: ScanResultPanelProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // animate in
    setTimeout(() => setVisible(true), 20);
  }, []);

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

