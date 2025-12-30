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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        margin: 0,
        padding: 0,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
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
        }}
        noValidate
        suppressHydrationWarning
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
            backgroundColor: "#171717",
            border: "1px solid #404040",
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
          style={{
            padding: "12px 16px",
            backgroundColor: "#171717",
            border: "1px solid #404040",
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
