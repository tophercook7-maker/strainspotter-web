"use client";

// app/garden/community/page.tsx
//
// Placeholder for v2.0 Community / messaging features. The route exists
// in v1.0 so the Garden landing's "Coming v2.0" tile resolves to a real
// page (Apple-friendly: clearly labeled "coming soon" rather than a
// dead link or 404). When v2.0 development starts, this page is
// replaced with the real chat/threads UI.

import Link from "next/link";
import TopNav from "../_components/TopNav";

export default function CommunityComingSoonPage() {
  return (
    <>
      <TopNav title="Community" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[640px] px-4 py-8">
          {/* Hero */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(102,187,106,0.20), rgba(46,125,50,0.10))",
              border: "1px solid rgba(102,187,106,0.40)",
              borderRadius: 18,
              padding: "32px 24px",
              textAlign: "center" as const,
              marginBottom: 22,
              backdropFilter: "blur(18px) saturate(1.4)",
              WebkitBackdropFilter: "blur(18px) saturate(1.4)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                margin: "0 0 8px",
                letterSpacing: -0.4,
              }}
            >
              Community
            </h1>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(102,187,106,0.15)",
                border: "1px solid rgba(102,187,106,0.30)",
                color: "#81C784",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: "uppercase" as const,
              }}
            >
              Coming v2.0
            </span>
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 14,
                lineHeight: 1.7,
                margin: "16px 0 0",
              }}
            >
              StrainSpotter is built to grow into a connected cannabis
              community. Soon you&rsquo;ll be able to follow growers,
              message dispensaries, and learn from other consumers
              directly inside the app.
            </p>
          </div>

          {/* What's coming */}
          <div
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderRadius: 16,
              padding: 22,
              marginBottom: 16,
              backdropFilter: "blur(18px) saturate(1.4)",
              WebkitBackdropFilter: "blur(18px) saturate(1.4)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase" as const,
                color: "rgba(255,255,255,0.75)",
                margin: "0 0 14px",
              }}
            >
              What&rsquo;s coming
            </h2>

            <FeatureRow
              icon="🌱"
              title="Grower profiles"
              body="Verified cultivators showcase their strains, growing technique, and journals. Follow their work; learn from their wins."
            />
            <FeatureRow
              icon="🏪"
              title="Dispensary profiles"
              body="Local dispensaries post hours, what's currently in stock, and connect with their regulars. Direct conversation for questions, recommendations, special drops."
            />
            <FeatureRow
              icon="💬"
              title="Direct messages & group threads"
              body="Talk grower-to-grower, grower-to-dispensary, or consumer-to-either. Real conversations, not comments-on-a-feed."
            />
            <FeatureRow
              icon="📢"
              title="Broadcast updates"
              body="Subscribe to your favorite growers and dispensaries. They post once; everyone who follows them gets notified."
            />
            <FeatureRow
              icon="🛡"
              title="Verified identities"
              body="Growers and dispensary owners verify with a license check before claiming a profile. Real people, real businesses."
            />
            <FeatureRow
              icon="✨"
              title="Trust-weighted strain submissions"
              body="When you scan a new strain we don't have, your submission goes into a community-vetted catalog with photo evidence required."
              note="Already live in v1.0 — try it from the scanner"
            />
          </div>

          {/* Honesty note */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "rgba(255,255,255,0.78)",
              fontSize: 13,
              lineHeight: 1.6,
              backdropFilter: "blur(18px) saturate(1.4)",
              WebkitBackdropFilter: "blur(18px) saturate(1.4)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
            }}
          >
            <strong style={{ color: "#fff" }}>An honest note:</strong>{" "}
            StrainSpotter is not a marketplace. We will never facilitate
            the sale, transfer, or delivery of cannabis through the app.
            Community is about connection and conversation — actual
            commerce happens between you and the businesses you trust,
            outside StrainSpotter.
          </div>

          {/* Back to garden */}
          <div style={{ marginTop: 22, textAlign: "center" as const }}>
            <Link
              href="/garden"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.20)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                backdropFilter: "blur(18px) saturate(1.4)",
                WebkitBackdropFilter: "blur(18px) saturate(1.4)",
              }}
            >
              ← Back to Garden
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function FeatureRow({
  icon,
  title,
  body,
  note,
}: {
  icon: string;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        marginBottom: 14,
        paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 24,
          flexShrink: 0,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.55,
          }}
        >
          {body}
        </div>
        {note && (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#81C784",
              fontWeight: 600,
            }}
          >
            ✓ {note}
          </div>
        )}
      </div>
    </div>
  );
}
