"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

// Get initial values at module level (before React)
function getInitialEmail() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY_EMAIL) || "";
  } catch {
    return "";
  }
}

function getInitialPassword() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
  } catch {
    return "";
  }
}

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialEmailRef = useRef(getInitialEmail());
  const initialPasswordRef = useRef(getInitialPassword());

  // Save as user types
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    const saveEmail = () => {
      if (emailInput?.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, emailInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const savePassword = () => {
      if (passwordInput?.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, passwordInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    if (emailInput) {
      emailInput.addEventListener("input", saveEmail);
      emailInput.addEventListener("change", saveEmail);
    }
    if (passwordInput) {
      passwordInput.addEventListener("input", savePassword);
      passwordInput.addEventListener("change", savePassword);
    }

    return () => {
      if (emailInput) {
        emailInput.removeEventListener("input", saveEmail);
        emailInput.removeEventListener("change", saveEmail);
      }
      if (passwordInput) {
        passwordInput.removeEventListener("input", savePassword);
        passwordInput.removeEventListener("change", savePassword);
      }
    };
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
    <div className="min-h-screen flex items-center justify-center bg-black" key="login-page">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-6"
        style={{ minWidth: "320px" }}
        noValidate
        key="login-form"
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          ref={emailRef}
          type="email"
          name="email"
          placeholder="Email"
          defaultValue={initialEmailRef.current}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="email"
          key="email-input"
        />

        <input
          ref={passwordRef}
          type="password"
          name="password"
          placeholder="Password"
          defaultValue={initialPasswordRef.current}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="current-password"
          key="password-input"
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
