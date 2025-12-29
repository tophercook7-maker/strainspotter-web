"use client";

import { useState, useRef } from "react";
import { supabaseLoginClient } from "@/lib/supabaseLoginClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitting = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;

    submitting.current = true;
    setLoading(true);
    setError(null);

    const { error } =
      await supabaseLoginClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      submitting.current = false;
      setLoading(false);
      setError(error.message);
      return;
    }

    // 🚨 HARD NAVIGATION — NO REACT INVOLVEMENT
    window.location.replace("/garden");
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <h1 style={{ color: "#E8FFE8", fontSize: "22px" }}>
        Sign In
      </h1>

      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Email"
        style={inputStyle}
      />

      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="Password"
        style={inputStyle}
      />

      {error && (
        <div style={{ color: "#FF9A9A", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          height: "52px",
          borderRadius: "14px",
          background: "rgba(0,40,0,0.85)",
          border: "1px solid rgba(0,255,0,0.4)",
          color: "#E8FFE8",
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: "0 0 18px rgba(0,255,0,0.35)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  height: "48px",
  padding: "0 14px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.65)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#E8FFE8",
  fontSize: "15px",
};
