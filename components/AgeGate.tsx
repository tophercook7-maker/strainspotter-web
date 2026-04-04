"use client";

import { useState, useEffect } from "react";
import { isAgeVerified, verifyAge } from "@/lib/ageGate";

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    setVerified(isAgeVerified());
  }, []);

  // Still loading from localStorage
  if (verified === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0a0f0c",
          zIndex: 99999,
        }}
      />
    );
  }

  if (verified) return <>{children}</>;

  const handleSubmit = () => {
    setError("");
    const m = parseInt(month);
    const d = parseInt(day);
    const y = parseInt(year);

    if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2025) {
      setError("Please enter a valid date of birth.");
      triggerShake();
      return;
    }

    const dob = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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

  const inputStyle: React.CSSProperties = {
    width: "72px",
    height: "52px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "18px",
    fontWeight: 600,
    textAlign: "center",
    outline: "none",
    transition: "border-color 0.2s",
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
        overflow: "auto",
      }}
    >
      {/* Logo/Brand */}
      <div style={{ fontSize: "56px", marginBottom: "8px" }}>🍃</div>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 4px 0",
          letterSpacing: "-0.5px",
        }}
      >
        StrainSpotter
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "11px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          margin: "0 0 48px 0",
        }}
      >
        AI Cannabis Identification
      </p>

      {/* Age Gate Card */}
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
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(76,175,80,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "22px",
            }}
          >
            🔒
          </div>
          <h2
            style={{
              color: "#fff",
              fontSize: "18px",
              fontWeight: 700,
              margin: "0 0 6px 0",
            }}
          >
            Age Verification Required
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "13px",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            You must be 21 years or older to access this app. Please enter your
            date of birth.
          </p>
        </div>

        {/* Date inputs */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.35)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "6px",
              }}
            >
              Month
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="MM"
              value={month}
              onChange={(e) => setMonth(e.target.value.replace(/\D/g, ""))}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(76,175,80,0.5)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.15)")
              }
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.35)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "6px",
              }}
            >
              Day
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="DD"
              value={day}
              onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(76,175,80,0.5)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.15)")
              }
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.35)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "6px",
              }}
            >
              Year
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="YYYY"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
              style={{ ...inputStyle, width: "88px" }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(76,175,80,0.5)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.15)")
              }
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              color: "#EF5350",
              fontSize: "13px",
              textAlign: "center",
              margin: "12px 0 0 0",
            }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
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
            transition: "opacity 0.2s, transform 0.1s",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Enter StrainSpotter
        </button>

        <p
          style={{
            color: "rgba(255,255,255,0.25)",
            fontSize: "10px",
            textAlign: "center",
            marginTop: "16px",
            lineHeight: 1.5,
          }}
        >
          By entering, you confirm you are at least 21 years of age and agree to
          our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Legal disclaimer */}
      <p
        style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: "10px",
          textAlign: "center",
          marginTop: "32px",
          maxWidth: "340px",
          lineHeight: 1.5,
        }}
      >
        StrainSpotter is intended for use only in jurisdictions where cannabis is
        legal. This app does not sell, distribute, or promote the sale of cannabis.
        Always follow your local laws.
      </p>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
