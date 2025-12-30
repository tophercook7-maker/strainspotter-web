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
  const mountedRef = useRef(false);
  const valuesRestoredRef = useRef(false);

  // Restore values ONCE - use multiple strategies to ensure it works
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const restoreValues = () => {
      if (valuesRestoredRef.current) return;
      
      const emailInput = emailRef.current;
      const passwordInput = passwordRef.current;

      if (!emailInput || !passwordInput) return;

      try {
        const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
        const savedPassword = localStorage.getItem(STORAGE_KEY_PASSWORD);

        // Only restore if inputs are empty (don't overwrite user typing)
        if (savedEmail && !emailInput.value) {
          emailInput.value = savedEmail;
        }
        if (savedPassword && !passwordInput.value) {
          passwordInput.value = savedPassword;
        }

        valuesRestoredRef.current = true;
      } catch (e) {
        // Ignore
      }
    };

    // Try immediately
    restoreValues();
    
    // Try in next frame
    requestAnimationFrame(() => {
      restoreValues();
      // Try again after a tiny delay
      setTimeout(restoreValues, 10);
    });
  }, []);

  // Save as user types - use direct event listeners to avoid React re-renders
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    if (!emailInput || !passwordInput) return;

    const saveEmail = () => {
      if (emailInput.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, emailInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const savePassword = () => {
      if (passwordInput.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, passwordInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    emailInput.addEventListener("input", saveEmail, { passive: true });
    emailInput.addEventListener("change", saveEmail, { passive: true });
    passwordInput.addEventListener("input", savePassword, { passive: true });
    passwordInput.addEventListener("change", savePassword, { passive: true });

    return () => {
      emailInput.removeEventListener("input", saveEmail);
      emailInput.removeEventListener("change", saveEmail);
      passwordInput.removeEventListener("input", savePassword);
      passwordInput.removeEventListener("change", savePassword);
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
    <div 
      className="min-h-screen flex items-center justify-center bg-black"
      suppressHydrationWarning
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-6"
        style={{ minWidth: "320px" }}
        noValidate
        suppressHydrationWarning
      >
        <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
        
        <input
          ref={emailRef}
          type="email"
          name="email"
          placeholder="Email"
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          style={{ 
            transition: "none",
            WebkitTransition: "none",
            MozTransition: "none",
            OTransition: "none",
          }}
          autoComplete="email"
          suppressHydrationWarning
        />

        <input
          ref={passwordRef}
          type="password"
          name="password"
          placeholder="Password"
          required
          disabled={loading}
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          style={{ 
            transition: "none",
            WebkitTransition: "none",
            MozTransition: "none",
            OTransition: "none",
          }}
          autoComplete="current-password"
          suppressHydrationWarning
        />

        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            transition: "none",
            WebkitTransition: "none",
            MozTransition: "none",
            OTransition: "none",
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
}
