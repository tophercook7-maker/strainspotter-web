"use client";

export default function ScannerResult({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="result-panel fade-in">
      <h1 className="result-title">SCAN COMPLETE</h1>

      <div className="result-strain-card">
        <h2 className="strain-name">Galactic Sherbet</h2>
        <p className="strain-type">Hybrid — 55% Indica</p>

        <div className="strain-stats">
          <div><span>THC</span> 28%</div>
          <div><span>CBD</span> 1%</div>
          <div><span>Confidence</span> 94%</div>
        </div>
      </div>

      <p className="result-summary">
        Known for its neon terp profile, Galactic Sherbet delivers a euphoric uplift
        followed by a deep, calm atmospheric body effect.
      </p>

      <button onClick={onRestart} className="try-again-btn">
        Run Again
      </button>

      <a href="/" className="download-app-btn">
        Download the App
      </a>
    </div>
  );
}
