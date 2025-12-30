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
  const isRestoringRef = useRef(false);

  // Restore values ONCE - prevent any interference
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    isRestoringRef.current = true;

    const restoreValues = () => {
      if (valuesRestoredRef.current || isRestoringRef.current === false) return;
      
      const emailInput = emailRef.current;
      const passwordInput = passwordRef.current;

      if (!emailInput || !passwordInput) {
        // Retry if inputs aren't ready
        setTimeout(restoreValues, 10);
        return;
      }

      try {
        const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
        const savedPassword = localStorage.getItem(STORAGE_KEY_PASSWORD);

        // Only restore if input is empty AND we have saved value
        if (savedEmail && emailInput.value === "") {
          emailInput.value = savedEmail;
        }
        if (savedPassword && passwordInput.value === "") {
          passwordInput.value = savedPassword;
        }

        valuesRestoredRef.current = true;
        isRestoringRef.current = false;
      } catch (e) {
        isRestoringRef.current = false;
      }
    };

    // Try multiple times to ensure inputs are ready
    restoreValues();
    requestAnimationFrame(restoreValues);
    setTimeout(restoreValues, 50);
  }, []);

  // Save as user types - NEVER restore during this
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    if (!emailInput || !passwordInput) return;

    const saveEmail = () => {
      // Don't save if we're currently restoring
      if (isRestoringRef.current) return;
      
      if (emailInput.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_EMAIL, emailInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    const savePassword = () => {
      // Don't save if we're currently restoring
      if (isRestoringRef.current) return;
      
      if (passwordInput.value && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_PASSWORD, passwordInput.value);
        } catch (e) {
          // Ignore
        }
      }
    };

    // Use capture phase to save before any other handlers
    emailInput.addEventListener("input", saveEmail, { passive: true, capture: true });
    emailInput.addEventListener("change", saveEmail, { passive: true, capture: true });
    passwordInput.addEventListener("input", savePassword, { passive: true, capture: true });
    passwordInput.addEventListener("change", savePassword, { passive: true, capture: true });

    return () => {
      emailInput.removeEventListener("input", saveEmail, { capture: true });
      emailInput.removeEventListener("change", saveEmail, { capture: true });
      passwordInput.removeEventListener("input", savePassword, { capture: true });
      passwordInput.removeEventListener("change", savePassword, { capture: true });
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
          key="email-input"
        />

        <input
          ref={passwordRef}
          type="password"
          name="password"
          placeholder="Password"
          required
          disabled={loading}
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
          key="password-input"
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
