"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

export default function LoginPage() {
  // Use controlled inputs with localStorage sync
  const [email, setEmail] = useState(() => {
    // Initialize from localStorage immediately
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY_EMAIL) || "";
      } catch (e) {
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
      } catch (e) {
        return "";
      }
    }
    return "";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Prevent form reset
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleReset = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[LOGIN] Form reset prevented");
      return false;
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  // Save to localStorage as user types (debounced)
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

  const supabase = getSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) {
      return;
    }
    
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // SUCCESS — clear storage and redirect
      try {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
        localStorage.removeItem(STORAGE_KEY_PASSWORD);
      } catch (e) {
        // Ignore
      }

      window.location.replace("/garden");
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-6"
        style={{ minWidth: "320px" }}
        noValidate
        onReset={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          ref={emailInputRef}
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEmail(e.target.value);
          }}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="email"
        />

        <input
          ref={passwordInputRef}
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPassword(e.target.value);
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
