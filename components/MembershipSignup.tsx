"use client";

import { useState } from "react";

interface MembershipSignupProps {
  onClose: () => void;
  defaultPlan?: "member" | "pro";
}

export default function MembershipSignup({
  onClose,
  defaultPlan = "member",
}: MembershipSignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"member" | "pro">(defaultPlan);
  const [moderatorInterest, setModeratorInterest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setError("");
    setLoading(true);

    // Save signup info for after checkout return
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ss_signup_info",
        JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          plan,
          moderatorInterest,
          ts: Date.now(),
        })
      );
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceKey: plan,
          email: email.trim(),
          name: name.trim(),
          moderatorInterest,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflow: "auto",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #151a16, #1a2120)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "32px 24px",
          maxWidth: 420,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
          <h2
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 6px",
            }}
          >
            Join StrainSpotter
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 13,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Create your account to unlock everything in The Garden
          </p>
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              display: "block",
              marginBottom: 6,
            }}
          >
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "14px 16px",
              color: "#fff",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        {/* Email field */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              display: "block",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "14px 16px",
              color: "#fff",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        {/* Plan selection */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              display: "block",
              marginBottom: 10,
            }}
          >
            Choose Your Plan
          </label>

          {/* Member card */}
          <div
            onClick={() => setPlan("member")}
            style={{
              background:
                plan === "member"
                  ? "rgba(76,175,80,0.12)"
                  : "rgba(255,255,255,0.03)",
              border: `2px solid ${
                plan === "member"
                  ? "rgba(76,175,80,0.5)"
                  : "rgba(255,255,255,0.08)"
              }`,
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 10,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `2px solid ${
                      plan === "member" ? "#66BB6A" : "rgba(255,255,255,0.2)"
                    }`,
                    background:
                      plan === "member" ? "#66BB6A" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {plan === "member" && (
                    <span
                      style={{
                        color: "#000",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{
                    color:
                      plan === "member"
                        ? "#66BB6A"
                        : "rgba(255,255,255,0.6)",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  🌿 Member
                </span>
              </div>
              <span
                style={{
                  color:
                    plan === "member"
                      ? "#66BB6A"
                      : "rgba(255,255,255,0.4)",
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                $4.99/mo
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                margin: "8px 0 0 30px",
                lineHeight: 1.4,
              }}
            >
              100 scans/mo · All features · Grow Coach · Dispensary Finder
            </p>
          </div>

          {/* Pro card */}
          <div
            onClick={() => setPlan("pro")}
            style={{
              background:
                plan === "pro"
                  ? "rgba(255,215,0,0.08)"
                  : "rgba(255,255,255,0.03)",
              border: `2px solid ${
                plan === "pro"
                  ? "rgba(255,215,0,0.4)"
                  : "rgba(255,255,255,0.08)"
              }`,
              borderRadius: 14,
              padding: "14px 16px",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -8,
                right: 14,
                background: "linear-gradient(135deg, #FFD54F, #FF8F00)",
                color: "#000",
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 99,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Best Value
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `2px solid ${
                      plan === "pro" ? "#FFD54F" : "rgba(255,255,255,0.2)"
                    }`,
                    background: plan === "pro" ? "#FFD54F" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {plan === "pro" && (
                    <span
                      style={{
                        color: "#000",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{
                    color:
                      plan === "pro"
                        ? "#FFD54F"
                        : "rgba(255,255,255,0.6)",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  ⭐ Pro
                </span>
              </div>
              <span
                style={{
                  color:
                    plan === "pro" ? "#FFD54F" : "rgba(255,255,255,0.4)",
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                $9.99/mo
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                margin: "8px 0 0 30px",
                lineHeight: 1.4,
              }}
            >
              500 scans/mo · Everything in Member · Analytics · Lab Data ·
              Priority
            </p>
          </div>
        </div>

        {/* Moderator checkbox */}
        <div style={{ marginBottom: 24 }}>
          <div
            onClick={() => setModeratorInterest(!moderatorInterest)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              cursor: "pointer",
              background: moderatorInterest
                ? "rgba(79,195,247,0.06)"
                : "rgba(255,255,255,0.02)",
              border: `1px solid ${
                moderatorInterest
                  ? "rgba(79,195,247,0.2)"
                  : "rgba(255,255,255,0.06)"
              }`,
              borderRadius: 12,
              padding: 14,
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                flexShrink: 0,
                marginTop: 1,
                border: `2px solid ${
                  moderatorInterest
                    ? "#4FC3F7"
                    : "rgba(255,255,255,0.2)"
                }`,
                background: moderatorInterest ? "#4FC3F7" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              {moderatorInterest && (
                <span
                  style={{ color: "#000", fontSize: 12, fontWeight: 900 }}
                >
                  ✓
                </span>
              )}
            </div>
            <div>
              <p
                style={{
                  color: moderatorInterest
                    ? "#4FC3F7"
                    : "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                I&apos;m interested in being a community moderator
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 11,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                We&apos;re building community features where growers and
                dispensaries can connect, share, and advertise on their own
                channels. Help shape the experience — no obligation, just
                letting us know you&apos;re interested.
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: "rgba(244,67,54,0.1)",
              border: "1px solid rgba(244,67,54,0.3)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              color: "#EF5350",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "none",
            background: loading
              ? "#555"
              : plan === "pro"
              ? "linear-gradient(135deg, #FFD54F, #FF8F00)"
              : "linear-gradient(135deg, #43A047, #2E7D32)",
            color: plan === "pro" && !loading ? "#000" : "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
            marginBottom: 12,
          }}
        >
          {loading
            ? "Redirecting to checkout..."
            : `Continue to Payment — ${
                plan === "pro" ? "$9.99/mo" : "$4.99/mo"
              }`}
        </button>

        {/* Back button */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            fontSize: 13,
            cursor: "pointer",
            padding: 8,
          }}
        >
          ← Go back
        </button>
      </div>
    </div>
  );
}
