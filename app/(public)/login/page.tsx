"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

// Memoize the Supabase client to prevent recreation
const getClient = () => getSupabaseBrowserClient();

export default function LoginPage() {
  const [email, setEmail] = useState(() => {
    // Initialize from localStorage immediately
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY_EMAIL) || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [password, setPassword] = useState(() => {
    // Initialize from localStorage immediately
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  // Memoize the Supabase client instance
  const supabase = useMemo(() => getClient(), []);

  // Mark as mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save to localStorage on change (debounced)
  useEffect(() => {
    if (!email) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_EMAIL, email);
      } catch (e) {
        // Ignore
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!password) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_PASSWORD, password);
      } catch (e) {
        // Ignore
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
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
        // Use replace to prevent back button issues
        window.location.replace("/garden");
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
        noValidate
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          key="email-input"
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
          key="password-input"
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
