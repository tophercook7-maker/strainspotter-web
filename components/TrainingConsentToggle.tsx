"use client";

// components/TrainingConsentToggle.tsx
//
// Explicit, revocable opt-in for letting confirmed scans be used as
// training data for future model fine-tunes. Required for GDPR/CCPA
// compliance — the user MUST be able to grant and revoke this freely
// without consequence to their subscription.
//
// Drop this into the settings page. It's intentionally self-contained:
//   • Reads /api/profile/training-consent on mount
//   • POSTs to the same endpoint on toggle
//   • Shows a confirmation when consent changes
//   • Discloses exactly what gets shared and how to revoke
//
// Copy guidelines: plain English, no legalese. The privacy policy can
// reference this UI as the lawful basis under Art. 6(1)(a).

import { useEffect, useState } from "react";

interface ConsentState {
  consent: boolean;
  consentedAt: string | null;
}

interface Props {
  /** Supabase access token (e.g. auth.session?.access_token). */
  accessToken: string | null;
}

export default function TrainingConsentToggle({ accessToken }: Props) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current state
  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/profile/training-consent", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          setError("Couldn't load your data-sharing preferences.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setState({
          consent: data.consent === true,
          consentedAt: data.consentedAt ?? null,
        });
      } catch {
        setError("Couldn't load your data-sharing preferences.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const toggle = async () => {
    if (!accessToken || !state) return;
    const next = !state.consent;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/training-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ consent: next }),
      });
      if (!res.ok) {
        setError("Couldn't save your preference. Try again.");
        setSaving(false);
        return;
      }
      const data = await res.json();
      setState({
        consent: data.consent === true,
        consentedAt: data.consentedAt ?? null,
      });
    } catch {
      setError("Couldn't save your preference. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Unauth state — show nothing (or you could surface "sign in to manage")
  if (!accessToken) return null;

  return (
    <div
      style={{
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        marginBottom: 14,
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            Help improve StrainSpotter
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.55,
            }}
          >
            When you confirm a scan is correct, we can use that photo to
            improve our identification model. Off by default — you choose.
          </div>
        </div>
        <Toggle
          on={!!state?.consent}
          disabled={loading || saving}
          onClick={toggle}
        />
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>
          Loading…
        </div>
      ) : error ? (
        <div style={{ fontSize: 11, color: "#EF9A9A" }}>{error}</div>
      ) : state?.consent ? (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.55,
            padding: "8px 10px",
            background: "rgba(76,175,80,0.10)",
            border: "1px solid rgba(76,175,80,0.25)",
            borderRadius: 8,
          }}
        >
          <strong style={{ color: "#A5D6A7" }}>Sharing is ON</strong>
          {state.consentedAt && (
            <span> · since {new Date(state.consentedAt).toLocaleDateString()}</span>
          )}
          <div style={{ marginTop: 4 }}>
            We use only the scans you confirm. We never sell your photos and
            you can switch this off at any time.
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.55,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}
        >
          <strong style={{ color: "rgba(255,255,255,0.65)" }}>
            Sharing is OFF
          </strong>
          <div style={{ marginTop: 4 }}>
            Your scans stay private. Identification still works exactly the
            same — turning this on just helps us improve over time.
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onClick,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      style={{
        position: "relative",
        width: 48,
        height: 28,
        flexShrink: 0,
        background: on ? "#66BB6A" : "rgba(255,255,255,0.18)",
        border: "none",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 160ms ease",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          width: 22,
          height: 22,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 160ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}
