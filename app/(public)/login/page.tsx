"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Restore values ONCE after mount using requestAnimationFrame to ensure DOM is ready
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restore = () => {
      if (emailRef.current && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_EMAIL);
          if (saved && !emailRef.current.value) {
            emailRef.current.value = saved;
          }
        } catch (e) {
          // Ignore
        }
      }

      if (passwordRef.current && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_PASSWORD);
          if (saved && !passwordRef.current.value) {
            passwordRef.current.value = saved;
          }
        } catch (e) {
          // Ignore
        }
      }
    };

    // Try immediately
    restore();
    // Also try in next frame to ensure DOM is ready
    requestAnimationFrame(restore);
  }, []);

  const supabase = getSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);
    setError(null);

    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    // Save before submit
    try {
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
      localStorage.setItem(STORAGE_KEY_PASSWORD, password);
    } catch (e) {
      // Ignore
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY_EMAIL, value);
      } else {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY_PASSWORD, value);
      } else {
        localStorage.removeItem(STORAGE_KEY_PASSWORD);
      }
    } catch (e) {
      // Ignore
    }
  };

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
          ref={emailRef}
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleEmailChange}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="email"
        />

        <input
          ref={passwordRef}
          type="password"
          name="password"
          placeholder="Password"
          onChange={handlePasswordChange}
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
