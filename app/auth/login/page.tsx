"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { upsertProfile } from "@/lib/auth/onAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Upsert profile (non-blocking)
    if (data.user) {
      upsertProfile(data.user).catch((err) => {
        console.error("[onAuth] Profile upsert failed (non-blocking):", err);
      });
    }

    // Redirect immediately after sign-in
    router.replace("/garden");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm space-y-4 p-6 bg-neutral-900 rounded"
      >
        <h1 className="text-2xl font-semibold text-center">
          Sign in to StrainSpotter
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 rounded bg-neutral-800 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 rounded bg-neutral-800 text-white"
        />

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 rounded bg-emerald-600 text-black font-medium disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <p className="text-sm text-center text-neutral-400">
          Don't have an account?{" "}
          <a href="/auth/signup" className="underline">
            Create one
          </a>
        </p>
      </form>
    </div>
  );
}
