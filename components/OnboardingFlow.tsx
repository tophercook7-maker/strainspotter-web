"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

const USER_TYPES = [
  { id: "grower", emoji: "🌱", label: "Grower", desc: "I grow cannabis" },
  {
    id: "consumer",
    emoji: "💨",
    label: "Consumer",
    desc: "I use cannabis recreationally",
  },
  {
    id: "medical",
    emoji: "🏥",
    label: "Medical Patient",
    desc: "I use cannabis medicinally",
  },
  {
    id: "dispensary",
    emoji: "🏪",
    label: "Dispensary Staff",
    desc: "I work at a dispensary",
  },
  {
    id: "curious",
    emoji: "🔍",
    label: "Just Curious",
    desc: "I want to learn more",
  },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "New to cannabis" },
  {
    id: "intermediate",
    label: "Intermediate",
    desc: "Some experience",
  },
  { id: "advanced", label: "Advanced", desc: "Very experienced" },
  { id: "expert", label: "Expert", desc: "Years of deep knowledge" },
];

const INTERESTS = [
  { id: "scanning", emoji: "📸", label: "Strain identification" },
  { id: "growing", emoji: "🌿", label: "Growing cannabis" },
  { id: "dispensaries", emoji: "📍", label: "Finding dispensaries" },
  { id: "strains", emoji: "🧬", label: "Exploring strains" },
  { id: "terpenes", emoji: "🍋", label: "Terpene profiles" },
  { id: "seeds", emoji: "🌰", label: "Finding seeds" },
  { id: "community", emoji: "👥", label: "Community & chat" },
  { id: "news", emoji: "📰", label: "Cannabis news" },
];

export default function OnboardingFlow({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [moderator, setModerator] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = getSupabase();

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        user_type: userType,
        experience_level: experience,
        interests: selectedInterests,
        location_text: location || null,
        moderator_interest: moderator,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    await refreshProfile();
    setSaving(false);
    onComplete();
  };

  const canProceed = () => {
    if (step === 0) return !!userType;
    if (step === 1) return !!experience;
    if (step === 2) return selectedInterests.length > 0;
    return true;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #151a16, #1a2120)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "32px 24px",
          maxWidth: 440,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 28,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  i === step
                    ? "#43A047"
                    : i < step
                    ? "rgba(67,160,71,0.4)"
                    : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Step 0: User type */}
        {step === 0 && (
          <>
            <h2 style={headingStyle}>What brings you to StrainSpotter?</h2>
            <p style={subStyle}>
              This helps us personalize your experience
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 20,
              }}
            >
              {USER_TYPES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setUserType(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 14,
                    cursor: "pointer",
                    background:
                      userType === t.id
                        ? "rgba(76,175,80,0.12)"
                        : "rgba(255,255,255,0.03)",
                    border: `2px solid ${
                      userType === t.id
                        ? "rgba(76,175,80,0.5)"
                        : "rgba(255,255,255,0.06)"
                    }`,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{t.emoji}</span>
                  <div>
                    <p
                      style={{
                        color:
                          userType === t.id
                            ? "#66BB6A"
                            : "rgba(255,255,255,0.7)",
                        fontSize: 15,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {t.label}
                    </p>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 12,
                        margin: "2px 0 0",
                      }}
                    >
                      {t.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 1: Experience */}
        {step === 1 && (
          <>
            <h2 style={headingStyle}>How experienced are you?</h2>
            <p style={subStyle}>No wrong answer — this helps us calibrate</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 20,
              }}
            >
              {EXPERIENCE_LEVELS.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setExperience(lvl.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    cursor: "pointer",
                    background:
                      experience === lvl.id
                        ? "rgba(76,175,80,0.12)"
                        : "rgba(255,255,255,0.03)",
                    border: `2px solid ${
                      experience === lvl.id
                        ? "rgba(76,175,80,0.5)"
                        : "rgba(255,255,255,0.06)"
                    }`,
                    transition: "all 0.2s",
                  }}
                >
                  <p
                    style={{
                      color:
                        experience === lvl.id
                          ? "#66BB6A"
                          : "rgba(255,255,255,0.7)",
                      fontSize: 15,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {lvl.label}
                  </p>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 12,
                      margin: "2px 0 0",
                    }}
                  >
                    {lvl.desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <>
            <h2 style={headingStyle}>What are you into?</h2>
            <p style={subStyle}>Pick all that interest you</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 20,
              }}
            >
              {INTERESTS.map((int) => {
                const selected = selectedInterests.includes(int.id);
                return (
                  <div
                    key={int.id}
                    onClick={() => toggleInterest(int.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "center",
                      background: selected
                        ? "rgba(76,175,80,0.12)"
                        : "rgba(255,255,255,0.03)",
                      border: `2px solid ${
                        selected
                          ? "rgba(76,175,80,0.5)"
                          : "rgba(255,255,255,0.06)"
                      }`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>
                      {int.emoji}
                    </div>
                    <p
                      style={{
                        color: selected
                          ? "#66BB6A"
                          : "rgba(255,255,255,0.6)",
                        fontSize: 12,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {int.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 3: Location + Moderator */}
        {step === 3 && (
          <>
            <h2 style={headingStyle}>Almost done!</h2>
            <p style={subStyle}>
              Optional info to make the app work better for you
            </p>

            <div style={{ marginTop: 20, marginBottom: 16 }}>
              <label style={labelStyle}>Your Location (optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State (for dispensary finder)"
                style={inputStyle}
              />
            </div>

            <div
              onClick={() => setModerator(!moderator)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                background: moderator
                  ? "rgba(79,195,247,0.06)"
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  moderator
                    ? "rgba(79,195,247,0.2)"
                    : "rgba(255,255,255,0.06)"
                }`,
                borderRadius: 12,
                padding: 14,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                  marginTop: 1,
                  border: `2px solid ${
                    moderator ? "#4FC3F7" : "rgba(255,255,255,0.2)"
                  }`,
                  background: moderator ? "#4FC3F7" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {moderator && (
                  <span
                    style={{ color: "#000", fontSize: 12, fontWeight: 900 }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <div>
                <p
                  style={{
                    color: moderator
                      ? "#4FC3F7"
                      : "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontWeight: 600,
                    margin: "0 0 4px",
                  }}
                >
                  I&apos;d like to help moderate the community
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  We&apos;re building chat and community features for growers
                  and dispensaries. No obligation — just letting us know.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
          }}
        >
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "none",
                color: "rgba(255,255,255,0.5)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={step < 3 ? () => setStep(step + 1) : handleComplete}
            disabled={!canProceed() || saving}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              border: "none",
              background:
                !canProceed() || saving
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #43A047, #2E7D32)",
              color:
                !canProceed() || saving ? "rgba(255,255,255,0.3)" : "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor:
                !canProceed() || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : step < 3
              ? "Next"
              : "Let\u2019s Go \ud83c\udf31"}
          </button>
        </div>

        {/* Skip on last step */}
        {step === 3 && (
          <button
            onClick={handleComplete}
            disabled={saving}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.25)",
              fontSize: 13,
              cursor: "pointer",
              padding: "12px 8px 0",
              textAlign: "center",
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 22,
  fontWeight: 800,
  margin: 0,
  textAlign: "center",
};

const subStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: 13,
  margin: "6px 0 0",
  textAlign: "center",
  lineHeight: 1.5,
};

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
