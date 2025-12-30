"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

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

    // ✅ DO NOT check auth here
    // ✅ DO NOT redirect early
    // ✅ Let Garden resolve auth
    router.replace("/garden");
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        maxWidth: 360,
        margin: "80px auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <input
        id="email"
        name="email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        id="password"
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {error && (
        <div style={{ color: "red", fontSize: 13 }}>{error}</div>
      )}
    </form>
  );
}
