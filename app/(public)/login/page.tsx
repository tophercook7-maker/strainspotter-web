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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const res = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    // HARD redirect — no router state
    window.location.href = "/garden";
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">
        {loading ? "Signing in…" : "Sign In"}
      </button>

      {error && <p>{error}</p>}
    </form>
  );
}
