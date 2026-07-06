// app/pricing/page.tsx
//
// Public pricing page — the marketing/SEO surface complementing the
// in-app paywall. Renders at https://strainspotter.app/pricing.
//
// Why this exists:
//   • SEO — "strainspotter pricing" was a 404; now ranks
//   • Pre-paywall consideration — prospects research before installing
//   • Shareable URL for marketing channels
//   • Apple lets you link to a pricing page from your App Store listing
//
// Source of truth for the pricing copy is lib/scanGating.ts, so this
// page stays in sync with the paywall by importing the same constants.
//
// This is intentionally a server component — no auth needed, fast TTFB,
// good for crawlers. The CTAs link to the scanner page which triggers
// the auth/paywall flow client-side.

import Link from "next/link";
import type { Metadata } from "next";
import { MEMBERSHIP_TIERS, TOPUP_PACKS } from "@/lib/scanGating";

export const metadata: Metadata = {
  title: "Pricing — StrainSpotter",
  description:
    "Honest pricing for honest AI strain identification. Member $4.99/mo, Pro $9.99/mo. One-time scan top-up packs from $2.99.",
  openGraph: {
    title: "StrainSpotter — Pricing",
    description:
      "Honest AI cannabis identification. Member $4.99/mo, Pro $9.99/mo. Scan top-ups from $2.99.",
    type: "website",
    url: "https://strainspotter.app/pricing",
  },
};

const bg = "linear-gradient(180deg, #0a0f0a 0%, #0d1a0d 40%, #0a0f0a 100%)";
const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function PricingPage() {
  const member = MEMBERSHIP_TIERS.member;
  const pro = MEMBERSHIP_TIERS.pro;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: bg,
        color: "#fff",
        padding: "32px 20px 80px",
        fontFamily: sans,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* ─── Top nav ─── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <Link
            href="/"
            style={{
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🌿 StrainSpotter
          </Link>
          <Link
            href="/garden/scanner"
            style={{
              padding: "10px 18px",
              borderRadius: 99,
              background: "linear-gradient(135deg, #34d399, #34d399)",
              color: "#0a0f0a",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Open the app →
          </Link>
        </div>

        {/* ─── Hero ─── */}
        <section style={{ textAlign: "center", marginBottom: 56 }}>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              margin: "0 0 16px",
              letterSpacing: -0.5,
              lineHeight: 1.1,
            }}
          >
            Honest pricing for
            <br />
            honest AI strain ID.
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.65)",
              maxWidth: 560,
              margin: "0 auto 16px",
              lineHeight: 1.6,
            }}
          >
            Every plan unlocks the full StrainSpotter Garden — scanner,
            Grow Doctor, the 35,000+ strain library, scan history, journal,
            and the nearby dispensary directory. The difference is how
            many scans you get and how much you want to pay.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "rgba(110,231,183,0.85)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            1 free scan on signup · No ads · No data resale · Cancel anytime
          </p>
        </section>

        {/* ─── Main plans grid ─── */}
        <section style={{ marginBottom: 64 }}>
          <div
            className="ss-stagger"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {/* Member */}
            <PlanColumn
              accent="#34d399"
              badge="🌿 Member"
              monthlyPrice={member.price}
              tagline={member.tagline}
              features={[...member.features]}
            />

            {/* Pro — highlighted */}
            <PlanColumn
              accent="#FFB74D"
              badge="⭐ Pro"
              monthlyPrice={pro.price}
              tagline={pro.tagline}
              features={[...pro.features]}
              footnote={pro.footnote}
              highlighted
            />
          </div>

        </section>

        {/* ─── Top-ups ─── */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            Not ready for a subscription?
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.60)",
              textAlign: "center",
              margin: "0 auto 24px",
              maxWidth: 540,
              lineHeight: 1.6,
            }}
          >
            Buy scan credits one pack at a time. Credits never expire and
            stack with any subscription you start later.
          </p>
          <div
            className="ss-stagger"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {TOPUP_PACKS.map((p) => {
              const isBest = "badge" in p && p.badge;
              return (
                <div
                  key={p.id}
                  className="ss-lift"
                  style={{
                    padding: "18px 18px",
                    background: isBest
                      ? "rgba(52,211,153,0.10)"
                      : "rgba(255,255,255,0.04)",
                    border: isBest
                      ? "1px solid rgba(52,211,153,0.30)"
                      : "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                    position: "relative",
                  }}
                >
                  {isBest && (
                    <div
                      style={{
                        position: "absolute",
                        top: -9,
                        right: 14,
                        padding: "3px 10px",
                        background: "#34d399",
                        color: "#0a0f0a",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {p.badge}
                    </div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                    {p.label}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#fff",
                      marginBottom: 6,
                    }}
                  >
                    {p.price}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                    {p.sublabel}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section style={{ marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 24px",
              textAlign: "center",
            }}
          >
            Common questions
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <Faq
              q="What counts as a scan?"
              a="One scan = one AI analysis of one or more photos for a single strain identification. You can upload up to 5 photos in a single scan and it still counts as one."
            />
            <Faq
              q="Do scans roll over?"
              a="Subscription scans reset monthly. Top-up scans never expire — they stack with your subscription allocation and get used last."
            />
            <Faq
              q="How many scans does Pro include?"
              a="Pro includes 300 scans per month — plenty for scanning every harvest. If you ever need more in a single month, one-time top-up packs stack on top and never expire."
            />
            <Faq
              q="Can I cancel?"
              a="Anytime. Cancel in the App Store on iOS or via the customer portal on web. You keep access until the end of your current billing period."
            />
            <Faq
              q="What if AI gets it wrong?"
              a="It will sometimes — visual strain ID from an unlabeled bud photo is genuinely hard. We calibrate confidence honestly and rank multiple candidates rather than picking one with fake certainty."
            />
            <Faq
              q="Is my data shared?"
              a="No. Photos are sent to our AI provider for analysis and then discarded — never retained unless you explicitly opt in to help us improve. We don't sell user data."
            />
            <Faq
              q="Apple In-App Purchase or Stripe?"
              a="iOS app: Apple IAP, managed in your Apple ID settings. Web app: Stripe, managed via the customer portal. Both end up in the same account."
            />
          </div>
        </section>

        {/* ─── Bottom CTA ─── */}
        <section
          style={{
            textAlign: "center",
            padding: "32px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 900,
              margin: "0 0 12px",
            }}
          >
            See what StrainSpotter actually does before you pay.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.65)",
              margin: "0 auto 20px",
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            Tap below to try a demo scan — no signup, no card, no email.
          </p>
          <Link
            href="/garden/scanner"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              borderRadius: 99,
              background: "linear-gradient(135deg, #34d399, #34d399)",
              color: "#0a0f0a",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: 0.3,
            }}
          >
            Try the demo scan →
          </Link>
        </section>

        {/* ─── Footer ─── */}
        <footer
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.50)",
            fontSize: 12,
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/privacy"
              style={{ color: "rgba(255,255,255,0.65)", marginRight: 16 }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              style={{ color: "rgba(255,255,255,0.65)", marginRight: 16 }}
            >
              Terms
            </Link>
            <Link
              href="/garden/scanner"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Open app
            </Link>
          </div>
          <div>
            StrainSpotter is for adults 18+. Not medical advice. Always
            follow the law where you live.
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ─── components ─── */

function PlanColumn({
  accent,
  badge,
  monthlyPrice,
  tagline,
  features,
  footnote,
  highlighted = false,
}: {
  accent: string;
  badge: string;
  monthlyPrice: string;
  tagline: string;
  features: string[];
  footnote?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className="ss-lift"
      style={{
        background: highlighted ? `${accent}14` : "rgba(255,255,255,0.04)",
        border: highlighted
          ? `2px solid ${accent}55`
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 22,
        position: "relative",
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            top: -11,
            right: 16,
            padding: "3px 10px",
            background: accent,
            color: "#0a0f0a",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Most popular
        </div>
      )}

      <div
        style={{
          color: accent,
          fontSize: 18,
          fontWeight: 900,
          marginBottom: 14,
        }}
      >
        {badge}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            color: accent,
            fontSize: 30,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {monthlyPrice}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.72)",
          fontStyle: "italic",
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        {tagline}
      </div>

      <ul
        style={{
          margin: 0,
          padding: "0 0 0 20px",
          fontSize: 13,
          color: "rgba(255,255,255,0.78)",
          lineHeight: 1.7,
        }}
      >
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>

      {footnote && (
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.42)",
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 8,
          color: "#fff",
        }}
      >
        {q}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.65,
        }}
      >
        {a}
      </div>
    </div>
  );
}
