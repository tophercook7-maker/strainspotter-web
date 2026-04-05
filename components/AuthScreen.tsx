"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

interface AuthScreenProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultMode?: "signin" | "signup";
  /** If true, shows as inline instead of overlay */
  inline?: boolean;
}

export default function AuthScreen({
  onClose,
  onSuccess,
  defaultMode = "signup",
  inline = false,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    defaultMode
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = getSupabase();

  const handleSignUp = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Update profile display name
    if (data.user) {
      setTimeout(async () => {
        await supabase
          .from("profiles")
          .update({ display_name: name.trim() })
          .eq("id", data.user!.id);
      }, 1000);
    }

    setLoading(false);
    onSuccess?.();
  };

  const handleSignIn = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess?.();
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/garden/scanner`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Check your email for a password reset link!");
    }
    setLoading(false);
  };

  const content = (
    <div
      style={{
        background: "linear-gradient(160deg, #151a16, #1a2120)",
        border: inline ? "none" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "32px 24px",
        maxWidth: 420,
        width: "100%",
        maxHeight: inline ? undefined : "90vh",
        overflow: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
        <h2
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 6px",
          }}
        >
          {mode === "signup"
            ? "Create Your Account"
            : mode === "signin"
            ? "Welcome Back"
            : "Reset Password"}
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {mode === "signup"
            ? "Join StrainSpotter — your AI cannabis companion"
            : mode === "signin"
            ? "Sign in to access your garden"
            : "We'll send you a reset link"}
        </p>
      </div>

      {/* Name field (signup only) */}
      {mode === "signup" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            style={inputStyle}
          />
        </div>
      )}

      {/* Email */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (mode === "signup") handleSignUp();
              else if (mode === "signin") handleSignIn();
              else handleForgotPassword();
            }
          }}
        />
      </div>

      {/* Password (not for forgot) */}
      {mode !== "forgot" && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signup" ? "At least 6 characters" : "Your password"
            }
            style={inputStyle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (mode === "signup") handleSignUp();
                else handleSignIn();
              }
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(244,67,54,0.1)",
            border: "1px solid rgba(244,67,54,0.3)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            color: "#EF5350",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {message && (
        <div
          style={{
            background: "rgba(76,175,80,0.1)",
            border: "1px solid rgba(76,175,80,0.3)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            color: "#66BB6A",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={
          mode === "signup"
            ? handleSignUp
            : mode === "signin"
            ? handleSignIn
            : handleForgotPassword
        }
        disabled={loading}
        style={{
          width: "100%",
          padding: 16,
          borderRadius: 14,
          border: "none",
          background: loading
            ? "#555"
            : "linear-gradient(135deg, #43A047, #2E7D32)",
          color: "#fff",
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? "wait" : "pointer",
          marginBottom: 14,
        }}
      >
        {loading
          ? "One moment..."
          : mode === "signup"
          ? "Create Account"
          : mode === "signin"
          ? "Sign In"
          : "Send Reset Link"}
      </button>

      {/* Toggle links */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {mode === "signup" && (
          <button onClick={() => setMode("signin")} style={linkStyle}>
            Already have an account? <strong>Sign in</strong>
          </button>
        )}
        {mode === "signin" && (
          <>
            <button onClick={() => setMode("forgot")} style={linkStyle}>
              Forgot password?
            </button>
            <button onClick={() => setMode("signup")} style={linkStyle}>
              Don&apos;t have an account? <strong>Sign up</strong>
            </button>
          </>
        )}
        {mode === "forgot" && (
          <button onClick={() => setMode("signin")} style={linkStyle}>
            ← Back to sign in
          </button>
        )}
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            ...linkStyle,
            marginTop: 12,
            width: "100%",
            textAlign: "center",
          }}
        >
          ← Go back
        </button>
      )}
    </div>
  );

  if (inline) return content;

  // Overlay mode
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
      onClick={onClose}
    >
      {content}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "1.5px",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "14px 16px",
  color: "#fff",
  fontSize: 15,
  outline: "none",
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.35)",
  fontSize: 13,
  cursor: "pointer",
  padding: "4px 8px",
};
