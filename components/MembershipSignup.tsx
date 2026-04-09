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
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"member" | "pro">(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setError("");
    setLoading(true);

    try {
      // Save credentials locally — account will be created server-side after payment
      if (typeof window !== "undefined") {
        localStorage.setItem("ss_signup_info", JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          plan,
          ts: Date.now(),
        }));
      }

      // Go straight to Stripe checkout
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceKey: plan,
          email: email.trim(),
          name: name.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Server error (${res.status})`);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Couldn't start checkout. Please try again.");
        setLoading(false);
      }
    } catch (e) {
      console.error("Checkout error:", e);
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #151a16, #1a2120)",
          borderRadius: 24,
          padding: "32px 24px",
          maxWidth: 420,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
            <img src="/brand/cannabis-icon.png" width={44} height={44} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} />
          </div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
            Join StrainSpotter
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
            Unlock The Garden and all features
          </p>
        </div>

        {/* Plan Toggle */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          padding: 4,
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
        }}>
          {(["member", "pro"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 12,
                border: "none",
                background: plan === p ? "linear-gradient(135deg, #43A047, #2E7D32)" : "transparent",
                color: plan === p ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div>{p === "member" ? "Member" : "Pro"}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.8 }}>
                {p === "member" ? "$4.99/mo" : "$9.99/mo"}
              </div>
            </button>
          ))}
        </div>

        {/* Plan Details */}
        <div style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(76,175,80,0.06)",
          marginBottom: 20,
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.8,
        }}>
          {plan === "member" ? (
            <>✅ 100 scans/mo &nbsp; ✅ All features &nbsp; ✅ Strain browser &nbsp; ✅ Grow coach</>
          ) : (
            <>✅ 500 scans/mo &nbsp; ✅ Everything in Member &nbsp; ✅ Analytics &nbsp; ✅ Lab data</>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Create password (for your account)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,83,80,0.1)",
            color: "#EF5350",
            fontSize: 13,
            marginBottom: 16,
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: loading
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #43A047, #2E7D32)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Redirecting to checkout..." : "Continue to Payment"}
        </button>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 12,
            border: "none",
            background: "none",
            color: "rgba(255,255,255,0.3)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};
