"use client";

import { useRef, useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

// Global storage outside React to survive any remounts
let globalEmail = "";
let globalPassword = "";

// Restore from localStorage immediately (before React)
if (typeof window !== "undefined") {
  try {
    globalEmail = localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    globalPassword = localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
  } catch (e) {
    // Ignore
  }
}

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const restoreAttemptedRef = useRef(false);

  // Get Supabase client directly (no memoization to avoid hook issues)
  const supabase = getSupabaseBrowserClient();

  // AGGRESSIVE RESTORATION: Restore values synchronously on every render
  // This ensures values persist even if component remounts
  if (emailRef.current && !restoreAttemptedRef.current) {
    const emailValue = globalEmail || localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    if (emailValue && emailRef.current.value !== emailValue) {
      emailRef.current.value = emailValue;
      globalEmail = emailValue;
    }
  }

  if (passwordRef.current && !restoreAttemptedRef.current) {
    const passwordValue = globalPassword || localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
    if (passwordValue && passwordRef.current.value !== passwordValue) {
      passwordRef.current.value = passwordValue;
      globalPassword = passwordValue;
    }
  }

  // Restore values from global storage and localStorage on mount
  useEffect(() => {
    mountedRef.current = true;
    restoreAttemptedRef.current = true;

    // Immediate synchronous restoration
    if (emailRef.current) {
      const value = globalEmail || localStorage.getItem(STORAGE_KEY_EMAIL) || "";
      if (value) {
        emailRef.current.value = value;
        globalEmail = value;
      }
    }

    if (passwordRef.current) {
      const value = globalPassword || localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
      if (value) {
        passwordRef.current.value = value;
        globalPassword = value;
      }
    }

    // Also use requestAnimationFrame as backup
    requestAnimationFrame(() => {
      if (emailRef.current) {
        const value = globalEmail || localStorage.getItem(STORAGE_KEY_EMAIL) || "";
        if (value && emailRef.current.value !== value) {
          emailRef.current.value = value;
          globalEmail = value;
        }
      }

      if (passwordRef.current) {
        const value = globalPassword || localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
        if (value && passwordRef.current.value !== value) {
          passwordRef.current.value = value;
          globalPassword = value;
        }
      }
    });

    // Save to localStorage and global storage as user types
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    const handleEmailChange = () => {
      if (emailInput?.value) {
        globalEmail = emailInput.value;
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, emailInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const handlePasswordChange = () => {
      if (passwordInput?.value) {
        globalPassword = passwordInput.value;
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, passwordInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    if (emailInput) {
      emailInput.addEventListener("input", handleEmailChange);
      emailInput.addEventListener("change", handleEmailChange);
      // Also listen to keyup as backup
      emailInput.addEventListener("keyup", handleEmailChange);
    }
    if (passwordInput) {
      passwordInput.addEventListener("input", handlePasswordChange);
      passwordInput.addEventListener("change", handlePasswordChange);
      // Also listen to keyup as backup
      passwordInput.addEventListener("keyup", handlePasswordChange);
    }

    return () => {
      mountedRef.current = false;
      restoreAttemptedRef.current = false;
      if (emailInput) {
        emailInput.removeEventListener("input", handleEmailChange);
        emailInput.removeEventListener("change", handleEmailChange);
        emailInput.removeEventListener("keyup", handleEmailChange);
      }
      if (passwordInput) {
        passwordInput.removeEventListener("input", handlePasswordChange);
        passwordInput.removeEventListener("change", handlePasswordChange);
        passwordInput.removeEventListener("keyup", handlePasswordChange);
      }
    };
  }, []);

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

    // Get values from refs, global storage, or localStorage (in that order)
    const currentEmail = emailRef.current?.value || globalEmail || localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    const currentPassword = passwordRef.current?.value || globalPassword || localStorage.getItem(STORAGE_KEY_PASSWORD) || "";

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

      // SUCCESS — clear storage and redirect
      try {
        globalEmail = "";
        globalPassword = "";
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
          ref={emailRef}
          type="email"
          name="email"
          placeholder="Email"
          defaultValue={globalEmail}
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
          defaultValue={globalPassword}
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
