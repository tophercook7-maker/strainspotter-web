"use client";

import { useState, useEffect } from "react";
import ScannerResult from "./ScannerResult";

export default function ScannerDemo() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!scanning) return;

    setProgress(0);
    let t = 0;

    const interval = setInterval(() => {
      t += Math.random() * 18;
      if (t >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => setDone(true), 600);
      } else {
        setProgress(Math.min(t, 100));
      }
    }, 380);

    return () => clearInterval(interval);
  }, [scanning]);

  return (
    <>
      {!done && (
        <div className="scanner-container">
          {/* 3D Nug */}
          <div className={`scanner-nug ${scanning ? "spin" : ""}`}>
            <div className="scanner-nug-img" style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,255,180,0.3), rgba(0,0,0,0.8))',
              border: '2px solid rgba(16,255,180,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              filter: 'drop-shadow(0 0 18px rgba(0,255,160,0.7))'
            }}>
              🌿
            </div>
          </div>

          {/* Scan ring */}
          <div className={`scanner-ring ${scanning ? "pulse" : ""}`} />

          {/* Laser sweep */}
          {scanning && <div className="scanner-sweep" />}

          {/* Progress */}
          {scanning && (
            <div className="scanner-progress">
              SCANNING… {progress.toFixed(0)}%
            </div>
          )}

          {/* Buttons */}
          {!scanning && (
            <button
              onClick={() => {
                setDone(false);
                setScanning(true);
              }}
              className="scanner-start-btn"
            >
              Start Scan Demo
            </button>
          )}
        </div>
      )}

      {done && <ScannerResult onRestart={() => {
        setDone(false);
        setScanning(false);
      }} />}
    </>
  );
}
