"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const initializedRef = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
      const savedPassword = localStorage.getItem(STORAGE_KEY_PASSWORD);
      
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedPassword) {
        setPassword(savedPassword);
      }
    } catch (e) {
      // localStorage might not be available
    }

    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (email) {
      try {
        localStorage.setItem(STORAGE_KEY_EMAIL, email);
      } catch (e) {
        // Ignore
      }
    }
  }, [email]);

  useEffect(() => {
    if (password) {
      try {
        localStorage.setItem(STORAGE_KEY_PASSWORD, password);
      } catch (e) {
        // Ignore
      }
    }
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Triple guard: prevent double submission
    if (loading || submittingRef.current || !mountedRef.current) {
      return;
    }
    
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    // Get values from state (they should be synced with localStorage)
    const currentEmail = email || localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    const currentPassword = password || localStorage.getItem(STORAGE_KEY_PASSWORD) || "";

    if (!currentEmail || !currentPassword) {
      setError("Please enter both email and password");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (error) {
        if (mountedRef.current) {
          setError(error.message);
          setLoading(false);
          submittingRef.current = false;
        }
        return;
      }

      // SUCCESS — clear localStorage and redirect
      try {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
        localStorage.removeItem(STORAGE_KEY_PASSWORD);
      } catch (e) {
        // Ignore
      }

      if (mountedRef.current) {
        window.location.href = "/garden";
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Login failed");
        setLoading(false);
        submittingRef.current = false;
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-6"
        style={{ minWidth: "320px" }}
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            const value = e.target.value;
            if (mountedRef.current) {
              setEmail(value);
            }
          }}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="email"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            const value = e.target.value;
            if (mountedRef.current) {
              setPassword(value);
            }
          }}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="current-password"
        />

        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
}
