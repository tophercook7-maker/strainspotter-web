"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { upsertProfile } from "@/lib/auth/onAuth";

const REMEMBER_ME_KEY = "strainspotter_remember_email";
const REMEMBER_ME_ENABLED_KEY = "strainspotter_remember_enabled";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem(REMEMBER_ME_KEY);
      const rememberEnabled = localStorage.getItem(REMEMBER_ME_ENABLED_KEY) === "true";
      if (savedEmail && rememberEnabled) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    // Use browser client directly to avoid Proxy issues
    const supabase = getSupabaseBrowserClient();
    
    // Force sign out to clear any corrupted in-memory session before login
    // This prevents Headers() construction failure from invalid tokens
    await supabase.auth.signOut({ scope: "local" });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Save email if "Remember me" is checked
    if (typeof window !== "undefined") {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, email.trim());
        localStorage.setItem(REMEMBER_ME_ENABLED_KEY, "true");
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(REMEMBER_ME_ENABLED_KEY);
      }
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
          autoComplete="current-password"
          className="w-full p-2 rounded bg-neutral-800 text-white"
        />

        <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Remember me</span>
        </label>

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
