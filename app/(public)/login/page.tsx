"use client";

import { useRef, useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const supabase = getSupabaseBrowserClient();

  // Debug: Log when component mounts/remounts
  useEffect(() => {
    console.log("[LOGIN] Component mounted");
    return () => {
      console.log("[LOGIN] Component unmounting");
    };
  }, []);

  // Restore values from localStorage on mount
  useEffect(() => {
    mountedRef.current = true;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Restore email
      try {
        const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
        if (savedEmail && emailRef.current) {
          emailRef.current.value = savedEmail;
          console.log("[LOGIN] Restored email from localStorage");
        }
      } catch (e) {
        console.error("[LOGIN] Failed to restore email:", e);
      }

      // Restore password
      try {
        const savedPassword = localStorage.getItem(STORAGE_KEY_PASSWORD);
        if (savedPassword && passwordRef.current) {
          passwordRef.current.value = savedPassword;
          console.log("[LOGIN] Restored password from localStorage");
        }
      } catch (e) {
        console.error("[LOGIN] Failed to restore password:", e);
      }
    }, 0);

    // Save to localStorage as user types (using input events)
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    const handleEmailChange = () => {
      if (emailInput?.value) {
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, emailInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const handlePasswordChange = () => {
      if (passwordInput?.value) {
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, passwordInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    if (emailInput) {
      emailInput.addEventListener("input", handleEmailChange);
    }
    if (passwordInput) {
      passwordInput.addEventListener("input", handlePasswordChange);
    }

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      if (emailInput) {
        emailInput.removeEventListener("input", handleEmailChange);
      }
      if (passwordInput) {
        passwordInput.removeEventListener("input", handlePasswordChange);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    // Triple guard: prevent double submission
    if (loading || submittingRef.current || !mountedRef.current) {
      console.log("[LOGIN] Submit blocked:", { loading, submitting: submittingRef.current, mounted: mountedRef.current });
      return;
    }
    
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    // Get values directly from refs (uncontrolled inputs)
    const currentEmail = emailRef.current?.value || "";
    const currentPassword = passwordRef.current?.value || "";

    console.log("[LOGIN] Submitting:", { email: currentEmail ? "***" : "", password: currentPassword ? "***" : "" });

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
        console.error("[LOGIN] Auth error:", error);
        if (mountedRef.current) {
          setError(error.message);
          setLoading(false);
          submittingRef.current = false;
        }
        return;
      }

      console.log("[LOGIN] Login successful, redirecting...");

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
      console.error("[LOGIN] Exception:", err);
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
