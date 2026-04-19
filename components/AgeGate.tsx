"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { isAgeVerified, verifyAge } from "@/lib/ageGate";

const PUBLIC_ROUTES = ["/privacy", "/terms"];

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    setVerified(isAgeVerified());
  }, []);

  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return <>{children}</>;
  }

  if (verified === null) {
    return <div style={{ position: "fixed", inset: 0, background: "#0a0f0c", zIndex: 99999 }} />;
  }

  if (verified) return <>{children}</>;

  const handleSubmit = () => {
    setError("");
    if (!dob) {
      setError("Please enter your date of birth.");
      triggerShake();
      return;
    }
    const result = verifyAge(dob);
    if (result.verified) {
      setVerified(true);
    } else {
      setError("You must be 21 or older to use StrainSpotter.");
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, #0a0f0c 0%, #111a14 50%, #0a0f0c 100%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
        <img src="/brand/cannabis-icon.png" width={88} height={88} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} />
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>
        StrainSpotter
      </h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 48px 0" }}>
        AI Cannabis Identification
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "32px 28px",
          maxWidth: "360px",
          width: "100%",
          backdropFilter: "blur(20px)",
          animation: shaking ? "shake 0.5s ease-in-out" : "none",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "rgba(76,175,80,0.15)", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", fontSize: "22px",
          }}>🔒</div>
          <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 6px 0" }}>
            Age Verification
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
            You must be 21+ to enter. Enter your date of birth.
          </p>
        </div>

        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          style={{
            width: "100%",
            height: "52px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 500,
            textAlign: "center",
            outline: "none",
            padding: "0 12px",
            boxSizing: "border-box",
            colorScheme: "dark",
          }}
        />

        {error && (
          <p style={{ color: "#EF5350", fontSize: "13px", textAlign: "center", margin: "12px 0 0 0" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            height: "48px",
            marginTop: "20px",
            borderRadius: "14px",
            border: "none",
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Enter StrainSpotter
        </button>

        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", textAlign: "center", marginTop: "16px", lineHeight: 1.5 }}>
          By entering, you confirm you are at least 21 years of age and agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px", textAlign: "center", marginTop: "32px", maxWidth: "340px", lineHeight: 1.5 }}>
        StrainSpotter is intended for use only in jurisdictions where cannabis is legal. Always follow your local laws.
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
      `}</style>
    </div>
  );
}
