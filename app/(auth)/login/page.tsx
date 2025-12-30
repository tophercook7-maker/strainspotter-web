"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #062B18, #020B05)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "420px",
          width: "100%",
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
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
          style={{
            height: "48px",
            padding: "0 14px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#E8FFE8",
            fontSize: "15px",
          }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
          style={{
            height: "48px",
            padding: "0 14px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#E8FFE8",
            fontSize: "15px",
          }}
        />

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
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {error && (
          <p style={{ color: "#FF9A9A", marginTop: 12, fontSize: "14px" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
