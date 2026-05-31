// app/api/scan/demo/route.ts
//
// Demo scan endpoint — returns a canned, realistic scan result for a
// well-known strain (Blue Dream) without:
//   • calling OpenAI (zero cost)
//   • requiring auth (zero friction)
//   • burning any quota (zero accounting)
//
// Purpose: let cold prospects see what a real scan looks like before
// they hit the paywall. Single biggest conversion lever in the
// monetization audit — "show value before asking for payment" is
// classic foot-in-the-door pricing psychology.
//
// IP / abuse protection:
//   • Rate-limited by IP at 10/hr (no signup means no userId).
//   • Returns a single strain (Blue Dream) — not the full multi-candidate
//     model. Real product is richer; demo is intentionally simplified.
//   • Result is clearly labeled `demoMode: true` so the UI can show a
//     "this is a sample — sign up to scan your own photos" affordance.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";

// Runs on Fluid Compute Node.js so Supabase-backed rate-limit works.

/** Canned result — mirrors what a real Blue Dream scan returns from /api/scan. */
const DEMO_RESULT = {
  schemaVersion: "scan-v2",
  demoMode: true,
  observation: {
    ocrText: "Blue Dream\nSativa-Dominant Hybrid\nTHC 18-24%",
    ocrStrainCandidates: ["Blue Dream"],
    visibleCategory: "hybrid",
    categoryConfidence: 92,
    imageType: "label",
  },
  traits: {
    budStructure: "Medium-dense, conical buds with light foxtailing",
    trichomeCoverage: "high",
    trichomeColor: "cloudy",
    pistilColors: ["orange", "rust"],
    pistilDensity: "moderate",
    coloration: "Bright forest green with rust-orange pistil contrast",
    leafShape: "narrow",
    qualityIndicators: ["good trichome coverage", "well-cured", "clear labeling"],
  },
  likelihood: {
    dominantTerpenes: [
      { name: "myrcene", probability: 0.82 },
      { name: "pinene", probability: 0.71 },
      { name: "caryophyllene", probability: 0.54 },
    ],
    typicalEffectFamily: [
      { name: "relaxation", probability: 0.78 },
      { name: "uplifted", probability: 0.74 },
      { name: "creative", probability: 0.62 },
    ],
  },
  candidates: [
    {
      strainName: "Blue Dream",
      slug: "blue-dream",
      confidence: 88,
      matchReasoning:
        "Strain name visible on label, and visible traits (myrcene/pinene-forward terpene profile, narrow leaves, cloudy trichomes) are consistent with Blue Dream's documented phenotype.",
      matchSignals: {
        nameInImage: true,
        categoryMatches: true,
        visualTraitsMatchPercent: 84,
        terpeneFamilyMatches: true,
      },
    },
    {
      strainName: "Super Silver Haze",
      slug: "super-silver-haze",
      confidence: 22,
      matchReasoning:
        "Alternative match — similar narrow-leaf morphology, but Super Silver Haze typically presents more amber trichomes at harvest.",
      matchSignals: {
        nameInImage: false,
        categoryMatches: true,
        visualTraitsMatchPercent: 52,
        terpeneFamilyMatches: false,
      },
    },
  ],
  summary: {
    primaryCandidateSlug: "blue-dream",
    confidenceTier: "high",
    headline:
      "Label reads 'Blue Dream' — visual traits consistent with that strain.",
    advisoryNote:
      "This is a demo scan using a sample image. Sign up to scan your own photos.",
  },
  claimValidation: null,
};

export async function POST(req: NextRequest) {
  // Per-IP rate limit — 10 demos/hr is enough for a curious user; blocks
  // anyone scripting the endpoint for free recognition.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rl = await checkRateLimit(ip, 10, 3_600, "demo_scan");
  if (rl.ok === false) {
    return NextResponse.json(
      {
        error:
          "Demo limit reached. Sign up for an account to keep scanning.",
        code: "demo_limit",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // Simulate a realistic scan latency (1.5–2.5s). Without this the demo
  // feels too instant to be "real" and users assume it's fake. Actual scans
  // take 5–15s; this just keeps the flow honest about what's coming.
  const delayMs = 1_500 + Math.floor(Math.random() * 1_000);
  await new Promise((res) => setTimeout(res, delayMs));

  return NextResponse.json({
    ok: true,
    model: "demo",
    result: DEMO_RESULT,
    usage: null,
    demoMode: true,
  });
}

// Some clients (Capacitor WebView) preflight with OPTIONS. Make sure we
// don't 405; CORS is otherwise inherited from next.config.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
