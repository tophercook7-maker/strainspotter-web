"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

// Initialize from localStorage BEFORE React
let initialEmail = "";
let initialPassword = "";

if (typeof window !== "undefined") {
  try {
    initialEmail = localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    initialPassword = localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
  } catch (e) {
    // Ignore
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mountedRef = useRef(false);

  // Log mount/unmount
  useEffect(() => {
    console.log("[LOGIN] Component mounted");
    mountedRef.current = true;
    return () => {
      console.log("[LOGIN] Component unmounting");
      mountedRef.current = false;
    };
  }, []);

  // Prevent form reset
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleReset = (e: Event) => {
      console.log("[LOGIN] Form reset prevented");
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  // Save to localStorage as user types
  useEffect(() => {
    if (mountedRef.current && email) {
      try {
        localStorage.setItem(STORAGE_KEY_EMAIL, email);
      } catch (e) {
        // Ignore
      }
    }
  }, [email]);

  useEffect(() => {
    if (mountedRef.current && password) {
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
    
    if (loading || !mountedRef.current) {
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("[LOGIN] Email onChange:", newValue.substring(0, 3) + "***");
    setEmail(newValue);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("[LOGIN] Password onChange: ***");
    setPassword(newValue);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black" key="login-page-container">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-6"
        style={{ minWidth: "320px" }}
        noValidate
        onReset={(e) => {
          console.log("[LOGIN] onReset handler called");
          e.preventDefault();
          e.stopPropagation();
        }}
        key="login-form"
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={handleEmailChange}
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          autoComplete="email"
          key="email-input"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
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
