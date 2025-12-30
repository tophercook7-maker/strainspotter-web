"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Success - redirect
    window.location.replace("/garden");
  };

  return (
    <div
      id="login"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        margin: 0,
        padding: 0,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          maxWidth: "384px",
          padding: "24px",
          minWidth: "320px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        noValidate
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#ffffff",
            marginBottom: "16px",
            margin: 0,
          }}
        >
          Sign In
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(23, 23, 23, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "16px",
            outline: "none",
            opacity: loading ? 0.5 : 1,
          }}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(23, 23, 23, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "16px",
            outline: "none",
            opacity: loading ? 0.5 : 1,
          }}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            backgroundColor: "#16a34a",
            color: "#000000",
            fontWeight: "600",
            borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && (
          <p style={{ color: "#f87171", fontSize: "14px", marginTop: "8px", margin: 0 }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
