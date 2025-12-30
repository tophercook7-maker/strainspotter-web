"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const STORAGE_KEY_EMAIL = "ss_login_email";
const STORAGE_KEY_PASSWORD = "ss_login_password";

// Global state outside React to survive remounts
let globalEmail = "";
let globalPassword = "";
let isInitialized = false;

// Initialize from localStorage immediately (before React)
if (typeof window !== "undefined" && !isInitialized) {
  try {
    globalEmail = localStorage.getItem(STORAGE_KEY_EMAIL) || "";
    globalPassword = localStorage.getItem(STORAGE_KEY_PASSWORD) || "";
    isInitialized = true;
  } catch (e) {
    // Ignore
  }
}

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Restore values ONCE - use global state
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const restoreValues = () => {
      const emailInput = emailRef.current;
      const passwordInput = passwordRef.current;

      if (!emailInput || !passwordInput) {
        setTimeout(restoreValues, 10);
        return;
      }

      // Get from global state or localStorage
      const email = globalEmail || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_EMAIL) : "") || "";
      const password = globalPassword || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PASSWORD) : "") || "";

      // Only set if input is empty and we have a value
      if (email && emailInput.value === "") {
        emailInput.value = email;
        globalEmail = email;
      }
      if (password && passwordInput.value === "") {
        passwordInput.value = password;
        globalPassword = password;
      }
    };

    restoreValues();
    requestAnimationFrame(restoreValues);
  }, []);

  // Save as user types - update global state immediately
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    if (!emailInput || !passwordInput) return;

    const saveEmail = (e?: Event) => {
      const value = emailInput.value;
      globalEmail = value; // Update global immediately
      if (value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const savePassword = (e?: Event) => {
      const value = passwordInput.value;
      globalPassword = value; // Update global immediately
      if (value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, value);
        } catch (e) {
          // Ignore
        }
      }
    };

    // Use capture phase and multiple event types
    emailInput.addEventListener("input", saveEmail, { passive: true, capture: true });
    emailInput.addEventListener("change", saveEmail, { passive: true, capture: true });
    emailInput.addEventListener("keyup", saveEmail, { passive: true, capture: true });
    passwordInput.addEventListener("input", savePassword, { passive: true, capture: true });
    passwordInput.addEventListener("change", savePassword, { passive: true, capture: true });
    passwordInput.addEventListener("keyup", savePassword, { passive: true, capture: true });

    return () => {
      emailInput.removeEventListener("input", saveEmail, { capture: true });
      emailInput.removeEventListener("change", saveEmail, { capture: true });
      emailInput.removeEventListener("keyup", saveEmail, { capture: true });
      passwordInput.removeEventListener("input", savePassword, { capture: true });
      passwordInput.removeEventListener("change", savePassword, { capture: true });
      passwordInput.removeEventListener("keyup", savePassword, { capture: true });
    };
  }, []);

  // Restore from global state if component remounts
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    if (!emailInput || !passwordInput) return;

    // If inputs are empty but we have global state, restore it
    if (globalEmail && emailInput.value === "") {
      emailInput.value = globalEmail;
    }
    if (globalPassword && passwordInput.value === "") {
      passwordInput.value = globalPassword;
    }
  });

  const supabase = getSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);
    setError(null);

    // Get from refs, global state, or localStorage (in that order)
    const email = emailRef.current?.value || globalEmail || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_EMAIL) : "") || "";
    const password = passwordRef.current?.value || globalPassword || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PASSWORD) : "") || "";

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
      localStorage.setItem(STORAGE_KEY_PASSWORD, password);
      globalEmail = email;
      globalPassword = password;
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
        globalEmail = "";
        globalPassword = "";
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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        margin: 0,
        padding: 0,
      }}
      suppressHydrationWarning
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          maxWidth: "384px",
          padding: "24px",
          minWidth: "320px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        noValidate
        suppressHydrationWarning
        onReset={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff", marginBottom: "16px", margin: 0 }}>
          Sign In
        </h1>
        
        <input
          ref={emailRef}
          type="email"
          name="email"
          placeholder="Email"
          required
          disabled={loading}
          defaultValue={globalEmail}
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(23, 23, 23, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "16px",
            outline: "none",
            opacity: loading ? 0.5 : 1,
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
          defaultValue={globalPassword}
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(23, 23, 23, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "16px",
            outline: "none",
            opacity: loading ? 0.5 : 1,
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
          style={{
            padding: "12px 16px",
            backgroundColor: "#16a34a",
            color: "#000000",
            fontWeight: "600",
            borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "none",
            WebkitTransition: "none",
            MozTransition: "none",
            OTransition: "none",
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && (
          <p style={{ color: "#f87171", fontSize: "14px", marginTop: "8px", margin: 0 }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
