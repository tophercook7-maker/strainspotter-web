"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // HARD redirect — prevents rerender loop
    window.location.href = "/garden";
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h1 style={{ color: "#E8FFE8", fontSize: "22px" }}>
        Sign In
      </h1>

      <input
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        style={inputStyle}
      />

      <input
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
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
          background: "rgba(0,40,0,0.8)",
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
  background: "rgba(0,0,0,0.6)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#E8FFE8",
  fontSize: "15px",
};
