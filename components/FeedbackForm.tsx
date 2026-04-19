"use client";

import { useState } from "react";

const FEEDBACK_KEY = "ss_feedback_submitted";

interface FeedbackData {
  rating: number;
  role: string;
  ideas: string;
  improvements: string;
  moderatorInterest: boolean;
  submittedAt: string;
}

function hasFeedbackBeenSubmitted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FEEDBACK_KEY) === "true";
}

export default function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [role, setRole] = useState("");
  const [ideas, setIdeas] = useState("");
  const [improvements, setImprovements] = useState("");
  const [moderatorInterest, setModeratorInterest] = useState(false);
  const [submitted, setSubmitted] = useState(hasFeedbackBeenSubmitted());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    const feedback: FeedbackData = {
      rating,
      role,
      ideas,
      improvements,
      moderatorInterest,
      submittedAt: new Date().toISOString(),
    };

    // Store locally (persists until Supabase is wired)
    try {
      const existing = JSON.parse(localStorage.getItem("ss_feedback_log") || "[]");
      existing.push(feedback);
      localStorage.setItem("ss_feedback_log", JSON.stringify(existing));
      localStorage.setItem(FEEDBACK_KEY, "true");
    } catch {
      // Silent fail
    }

    // TODO: POST to /api/feedback → Supabase when wired
    // try {
    //   await fetch("/api/feedback", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(feedback),
    //   });
    // } catch {}

    setSubmitted(true);
    setSubmitting(false);
  };

  // Already submitted — show thank you
  if (submitted) {
    return (
      <div
        style={{
          background: "rgba(76,175,80,0.06)",
          border: "1px solid rgba(76,175,80,0.15)",
          borderRadius: 16,
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>💚</div>
        <p style={{ color: "#66BB6A", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>
          Thanks for your feedback!
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
          Your thoughts help us build a better StrainSpotter for everyone.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#fff",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical" as const,
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: "24px 20px",
      }}
    >
      {/* Friendly header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
        <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
          We&apos;d love your thoughts
        </h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          We&apos;re building this for growers and enthusiasts like you.
          Got 30 seconds? Tell us what would make StrainSpotter better.
        </p>
      </div>

      {/* Star rating */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
          How are you liking StrainSpotter?
        </label>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              style={{
                background: "none",
                border: "none",
                fontSize: 28,
                cursor: "pointer",
                filter: star <= (hoveredStar || rating) ? "none" : "grayscale(1) opacity(0.3)",
                transform: star <= (hoveredStar || rating) ? "scale(1.1)" : "scale(1)",
                transition: "all 0.15s",
                padding: 2,
              }}
            >
              ⭐
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>
            {rating === 5 ? "Awesome!" : rating >= 4 ? "Great!" : rating >= 3 ? "Good so far" : rating >= 2 ? "Room to grow" : "We hear you"}
          </p>
        )}
      </div>

      {/* Role / how they use it */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
          How do you use cannabis?
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Grower", "Consumer", "Dispensary Staff", "Caregiver", "Just Curious"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                background: role === r ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${role === r ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 99,
                padding: "6px 14px",
                color: role === r ? "#66BB6A" : "rgba(255,255,255,0.5)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: role === r ? 700 : 500,
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* What features matter most */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
          What features matter most to you?
        </label>
        <textarea
          placeholder="e.g. Better strain matching, grow tracking, community features..."
          value={ideas}
          onChange={(e) => setIdeas(e.target.value)}
          rows={2}
          style={inputStyle}
        />
      </div>

      {/* Improvements */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
          Any ideas to make this better?
        </label>
        <textarea
          placeholder="We genuinely want to hear from you — every idea counts..."
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          rows={2}
          style={inputStyle}
        />
      </div>

      {/* Moderator interest */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
            padding: "10px 12px",
            background: moderatorInterest ? "rgba(76,175,80,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${moderatorInterest ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 12,
            transition: "all 0.15s",
          }}
        >
          <input
            type="checkbox"
            checked={moderatorInterest}
            onChange={(e) => setModeratorInterest(e.target.checked)}
            style={{ marginTop: 2, accentColor: "#66BB6A" }}
          />
          <div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>
              I&apos;d be interested in being a community moderator
            </span>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>
              We&apos;re building community features where growers and dispensaries can connect.
              Check this if you&apos;d like to help shape that experience.
            </p>
          </div>
        </label>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        style={{
          width: "100%",
          background: rating === 0 ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #43A047, #2E7D32)",
          border: "none",
          borderRadius: 12,
          padding: "14px",
          color: rating === 0 ? "rgba(255,255,255,0.25)" : "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: rating === 0 ? "default" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {submitting ? "Sending..." : "Share Feedback 💚"}
      </button>

      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 8 }}>
        Your feedback is anonymous and helps us improve.
      </p>
    </div>
  );
}
