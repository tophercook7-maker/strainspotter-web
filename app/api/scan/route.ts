// app/api/scan/route.ts
// StrainSpotter AI Scanner — Phase 2: OCR-first, trait-based, multi-candidate
//
// Architecture (post-pivot, May 2026):
//   1. Single GPT-4o Vision call analyzes the image(s) and returns:
//      - OCR text (every readable word — most reliable signal when present)
//      - Visual traits (factual observations)
//      - Likelihood (probabilistic terpene/effect family)
//      - Candidates (top 5 strains from catalog, honest confidence 0-100)
//      - Summary (top-line headline, confidence tier, advisory note)
//      - Optional claimValidation (when the caller passes sellersClaim)
//   2. No artificial confidence floor. 0-100 range.
//   3. No medical claims. "Users commonly report …" framing, not "treats X".
//   4. The catalog is just a guide — the model is allowed to say "uncertain".
//
// Runs on Fluid Compute Node.js (not Edge): the in-memory rate-limit
// fallback was bypassable across regions, so we now hit Supabase for
// rate-limit + quota — and supabase-js needs Node. maxDuration:60 (set
// in vercel.json) actually applies here, where it was silently ignored
// on Edge's 25s cap.

import { NextRequest, NextResponse } from "next/server";
import strainDb from "@/lib/data/strains.json";
import { requireSubscription } from "@/lib/auth/serverGate";
import { logger } from "@/lib/observability/log";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { runIdempotent } from "@/lib/observability/idempotency";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/* ─────────────────────────────────────────────────────────────────
 *  Catalog → compact textual reference for the system prompt
 * ───────────────────────────────────────────────────────────────── */

interface StrainEntry {
  name: string;
  type?: string;
  visualProfile?: {
    trichomeDensity?: string;
    pistilColor?: string[];
    budStructure?: string;
    leafShape?: string;
    colorProfile?: string;
  };
  terpeneProfile?: string[];
  effects?: string[];
  indicaSativaRatio?: { indica?: number; sativa?: number };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildStrainCatalog(): string {
  const strains = strainDb as StrainEntry[];
  const lines = strains.map((s) => {
    const parts: string[] = [s.name];
    if (s.type) parts.push(s.type);
    const vp = s.visualProfile;
    if (vp) {
      const vis: string[] = [];
      if (vp.budStructure) vis.push(`bud:${vp.budStructure}`);
      if (vp.trichomeDensity) vis.push(`trich:${vp.trichomeDensity}`);
      if (vp.pistilColor?.length) vis.push(`pistil:${vp.pistilColor.join("/")}`);
      if (vp.leafShape) vis.push(`leaf:${vp.leafShape}`);
      if (vp.colorProfile) vis.push(vp.colorProfile);
      if (vis.length) parts.push(vis.join(", "));
    }
    if (s.terpeneProfile?.length) parts.push(`[${s.terpeneProfile.slice(0, 3).join(",")}]`);
    return parts.join(" | ");
  });
  return lines.join("\n");
}

const STRAIN_CATALOG = buildStrainCatalog();
const STRAIN_COUNT = (strainDb as StrainEntry[]).length;

/* ─────────────────────────────────────────────────────────────────
 *  System prompt — honest, OCR-first, multi-candidate
 * ───────────────────────────────────────────────────────────────── */

export const SYSTEM_PROMPT = `You are StrainSpotter's cannabis identification assistant.

Your job is to analyze cannabis flower or packaging images and return a structured, HONEST identification. You have access to a catalog of ${STRAIN_COUNT} cultivars; use it as a reference guide, not a constraint.

═══ STRAINSPOTTER CATALOG (${STRAIN_COUNT} cultivars) ═══
Format per line: name | type | visual cues | [common terpenes]

${STRAIN_CATALOG}

═══ END CATALOG ═══

═══ ANALYSIS PROTOCOL ═══

Step 1 — READ EVERY VISIBLE WORD.
Cannabis sold in dispensaries or by reputable seed banks is almost always labelled. If the image contains packaging, a jar label, a menu board, a seed packet, or any other visible text, transcribe it COMPLETELY and identify any cannabis strain names within. Strain names visible in text are your single most reliable signal — far more reliable than guessing from bud appearance.

Step 2 — OBSERVE VISUAL TRAITS.
Examine bud structure (dense / airy / popcorn / chunky), trichome coverage and color (clear / cloudy / amber / mixed), pistil color and density, base coloration, leaf shape (narrow vs broad), and overall morphotype. Report what you actually see, not what you think the answer "should" be.

Step 3 — INFER LIKELIHOOD CAREFULLY.
You may infer typical terpene families and typical effect categories from visual cues, but always with calibrated probability. Dense trichome coverage + rich coloration suggests high-quality flower; visible amber trichomes suggest later harvest with more sedating effects. Do not invent specific cannabinoid percentages — say "typical range" if asked.

Step 4 — RANK CANDIDATES.
Produce 1–5 candidate strains from the catalog (or "Unknown") ranked by how well visual + textual evidence matches. Confidence is bounded 0–100 and must be honestly calibrated:
  • 80–100 — Strain name visible in image AND visual traits consistent. (Rare; reserved for clearly-labelled dispensary product.)
  •  60–79 — Strain name visible in text but traits ambiguous, OR visual traits strongly distinctive AND match a single catalog cultivar.
  •  40–59 — Multiple plausible candidates; visual traits broadly match a small group.
  •  20–39 — General category clear (indica/sativa/hybrid) but specific strain genuinely uncertain.
  •   0–19 — Insufficient evidence. Image may not even be cannabis flower, or quality is too low.

DO NOT inflate confidence. If you genuinely don't know, say so. Returning multiple plausible candidates with honest 30–50% confidence is BETTER than picking one with fake 85%.

Step 5 — SUMMARY.
Produce a one-sentence headline that states what you actually concluded. Examples:
  • "Label reads 'Blue Dream' — visual traits consistent with that strain."
  • "No readable text. Visual traits suggest an indica-leaning hybrid; top candidates: Granddaddy Purple, Purple Punch, Grape Ape."
  • "Image quality too low for confident identification."

═══ APPLE / HEALTH-CLAIM SAFETY ═══
You are NOT a medical authority. NEVER claim a strain treats, cures, prevents, or alleviates any medical condition. When describing effects, use language like "users commonly report" or "typically associated with". Do not list "medical conditions" — that field has been removed. Frame effects as experiential, not therapeutic.

═══ OUTPUT FORMAT ═══
Return ONE valid JSON object, no markdown, no commentary, no code fences.

{
  "observation": {
    "ocrText": "every readable word from the image, joined with newlines, or empty string",
    "ocrStrainCandidates": ["strain name extracted from text", "..."],
    "visibleCategory": "indica" | "sativa" | "hybrid" | "unknown",
    "categoryConfidence": 0-100,
    "imageType": "flower" | "packaging" | "label" | "plant" | "other" | "unclear"
  },
  "traits": {
    "budStructure": "string — dense/airy/chunky/popcorn/etc",
    "trichomeCoverage": "low" | "medium" | "high" | "very-high" | "unknown",
    "trichomeColor": "clear" | "cloudy" | "amber" | "mixed" | "unknown",
    "pistilColors": ["orange", "rust", ...],
    "pistilDensity": "sparse" | "moderate" | "dense" | "unknown",
    "coloration": "string — overall color description",
    "leafShape": "narrow" | "broad" | "mixed" | "unknown",
    "qualityIndicators": ["well-cured", "good trichome coverage", ...]
  },
  "likelihood": {
    "dominantTerpenes": [
      { "name": "myrcene", "probability": 0.0-1.0 }
    ],
    "typicalEffectFamily": [
      { "name": "relaxation", "probability": 0.0-1.0 }
    ]
  },
  "candidates": [
    {
      "strainName": "string — from catalog when possible",
      "slug": "lowercase-hyphenated",
      "confidence": 0-100,
      "matchReasoning": "one sentence explaining what supports this match",
      "matchSignals": {
        "nameInImage": true | false,
        "categoryMatches": true | false,
        "visualTraitsMatchPercent": 0-100,
        "terpeneFamilyMatches": true | false
      }
    }
  ],
  "summary": {
    "primaryCandidateSlug": "slug of candidates[0] when confidence >= 60, else null",
    "confidenceTier": "high" | "moderate" | "low" | "uncertain",
    "headline": "one sentence — honest top-line conclusion",
    "advisoryNote": "string | null — caveat the user should know about"
  },
  "claimValidation": null
}

When the user supplies a "sellersClaim" string in their request, additionally fill claimValidation:

  "claimValidation": {
    "sellersClaim": "Blue Dream",
    "consistent": "yes" | "ambiguous" | "no",
    "reasoning": "one sentence",
    "expectedTraits": ["traits we'd expect for the claimed strain"],
    "discrepancies": ["traits that DON'T match the claimed strain"]
  }

`;

/* ─────────────────────────────────────────────────────────────────
 *  User-prompt builder
 * ───────────────────────────────────────────────────────────────── */

export function buildUserPrompt(imageCount: number, sellersClaim?: string): string {
  const claim = sellersClaim?.trim();
  const lines: string[] = [];
  lines.push(
    `Analyze ${
      imageCount > 1
        ? `these ${imageCount} cannabis-related images`
        : "this cannabis-related image"
    } and return the JSON described in the system prompt.`
  );
  if (claim) {
    lines.push("");
    lines.push(
      `The seller / source claims this is: "${claim.replace(/"/g, '\\"')}". ` +
        `Fill claimValidation with your assessment of whether the visible evidence ` +
        `is consistent with that claim. Do not let the claim bias your candidates list — ` +
        `evaluate the image on its own merits, then judge consistency separately.`
    );
  }
  lines.push("");
  lines.push("Return ONLY valid JSON. No markdown, no commentary, no code fences.");
  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────────────
 *  Response normalization (defensive — model can drift from schema)
 * ───────────────────────────────────────────────────────────────── */

const VALID_CATEGORIES = ["indica", "sativa", "hybrid", "unknown"] as const;
const VALID_TIERS = ["high", "moderate", "low", "uncertain"] as const;
const VALID_TRICH_COVER = [
  "low",
  "medium",
  "high",
  "very-high",
  "unknown",
] as const;
const VALID_TRICH_COLOR = [
  "clear",
  "cloudy",
  "amber",
  "mixed",
  "unknown",
] as const;
const VALID_PISTIL_DENSITY = [
  "sparse",
  "moderate",
  "dense",
  "unknown",
] as const;
const VALID_LEAF_SHAPE = ["narrow", "broad", "mixed", "unknown"] as const;
const VALID_IMAGE_TYPE = [
  "flower",
  "packaging",
  "label",
  "plant",
  "other",
  "unclear",
] as const;
const VALID_CONSISTENT = ["yes", "ambiguous", "no"] as const;

function pickEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampFloat(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

export function normalizeAnalysis(
  raw: Record<string, unknown>,
  sellersClaim: string | undefined
): Record<string, unknown> {
  const obs = (raw.observation as Record<string, unknown>) || {};
  const traits = (raw.traits as Record<string, unknown>) || {};
  const likelihood = (raw.likelihood as Record<string, unknown>) || {};
  const summary = (raw.summary as Record<string, unknown>) || {};
  const candidatesRaw = Array.isArray(raw.candidates) ? raw.candidates : [];

  // Candidates
  const candidates = candidatesRaw
    .slice(0, 5)
    .map((c: unknown) => {
      const cc = (c as Record<string, unknown>) || {};
      const ms = (cc.matchSignals as Record<string, unknown>) || {};
      const name =
        typeof cc.strainName === "string" ? cc.strainName.trim() : "Unknown";
      const slug =
        typeof cc.slug === "string" && cc.slug.trim()
          ? cc.slug.trim().toLowerCase()
          : slugify(name);
      return {
        strainName: name,
        slug,
        confidence: clampInt(cc.confidence, 0, 100, 0),
        matchReasoning:
          typeof cc.matchReasoning === "string"
            ? cc.matchReasoning.trim()
            : "Visual analysis of the uploaded image.",
        matchSignals: {
          nameInImage: ms.nameInImage === true,
          categoryMatches: ms.categoryMatches === true,
          visualTraitsMatchPercent: clampInt(
            ms.visualTraitsMatchPercent,
            0,
            100,
            0
          ),
          terpeneFamilyMatches: ms.terpeneFamilyMatches === true,
        },
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  // Likelihoods
  const dominantTerpenesRaw = Array.isArray(likelihood.dominantTerpenes)
    ? likelihood.dominantTerpenes
    : [];
  const dominantTerpenes = dominantTerpenesRaw
    .slice(0, 6)
    .map((t: unknown) => {
      const tt = (t as Record<string, unknown>) || {};
      return {
        name:
          typeof tt.name === "string" ? tt.name.trim().toLowerCase() : "unknown",
        probability: clampFloat(tt.probability, 0, 1, 0),
      };
    })
    .filter((t) => t.name !== "unknown");

  const effectFamilyRaw = Array.isArray(likelihood.typicalEffectFamily)
    ? likelihood.typicalEffectFamily
    : [];
  const typicalEffectFamily = effectFamilyRaw
    .slice(0, 6)
    .map((t: unknown) => {
      const tt = (t as Record<string, unknown>) || {};
      return {
        name:
          typeof tt.name === "string" ? tt.name.trim().toLowerCase() : "unknown",
        probability: clampFloat(tt.probability, 0, 1, 0),
      };
    })
    .filter((t) => t.name !== "unknown");

  // Summary
  const topConfidence = candidates[0]?.confidence ?? 0;
  const computedTier =
    topConfidence >= 80
      ? "high"
      : topConfidence >= 60
        ? "moderate"
        : topConfidence >= 30
          ? "low"
          : "uncertain";
  const tier = pickEnum(summary.confidenceTier, VALID_TIERS, computedTier);

  const primarySlug =
    typeof summary.primaryCandidateSlug === "string" &&
    summary.primaryCandidateSlug.trim()
      ? summary.primaryCandidateSlug.trim().toLowerCase()
      : topConfidence >= 60 && candidates[0]
        ? candidates[0].slug
        : null;

  const headline =
    typeof summary.headline === "string" && summary.headline.trim()
      ? summary.headline.trim()
      : candidates[0]
        ? `Top candidate: ${candidates[0].strainName} (${candidates[0].confidence}% confidence).`
        : "Insufficient evidence to identify this image.";

  const advisoryNote =
    typeof summary.advisoryNote === "string" && summary.advisoryNote.trim()
      ? summary.advisoryNote.trim()
      : null;

  // Claim validation
  let claimValidation: Record<string, unknown> | null = null;
  const cv = raw.claimValidation as Record<string, unknown> | null;
  if (sellersClaim && cv && typeof cv === "object") {
    claimValidation = {
      sellersClaim,
      consistent: pickEnum(cv.consistent, VALID_CONSISTENT, "ambiguous"),
      reasoning:
        typeof cv.reasoning === "string"
          ? cv.reasoning.trim()
          : "Insufficient evidence to confirm or deny the seller's claim.",
      expectedTraits: asStringArray(cv.expectedTraits, 8),
      discrepancies: asStringArray(cv.discrepancies, 8),
    };
  }

  return {
    schemaVersion: "scan-v2",
    observation: {
      ocrText: typeof obs.ocrText === "string" ? obs.ocrText : "",
      ocrStrainCandidates: asStringArray(obs.ocrStrainCandidates, 6),
      visibleCategory: pickEnum(obs.visibleCategory, VALID_CATEGORIES, "unknown"),
      categoryConfidence: clampInt(obs.categoryConfidence, 0, 100, 0),
      imageType: pickEnum(obs.imageType, VALID_IMAGE_TYPE, "unclear"),
    },
    traits: {
      budStructure:
        typeof traits.budStructure === "string"
          ? traits.budStructure.trim()
          : "Not assessable from image.",
      trichomeCoverage: pickEnum(
        traits.trichomeCoverage,
        VALID_TRICH_COVER,
        "unknown"
      ),
      trichomeColor: pickEnum(
        traits.trichomeColor,
        VALID_TRICH_COLOR,
        "unknown"
      ),
      pistilColors: asStringArray(traits.pistilColors, 6),
      pistilDensity: pickEnum(
        traits.pistilDensity,
        VALID_PISTIL_DENSITY,
        "unknown"
      ),
      coloration:
        typeof traits.coloration === "string"
          ? traits.coloration.trim()
          : "Not assessable from image.",
      leafShape: pickEnum(traits.leafShape, VALID_LEAF_SHAPE, "unknown"),
      qualityIndicators: asStringArray(traits.qualityIndicators, 8),
    },
    likelihood: {
      dominantTerpenes,
      typicalEffectFamily,
    },
    candidates,
    summary: {
      primaryCandidateSlug: primarySlug,
      confidenceTier: tier,
      headline,
      advisoryNote,
    },
    claimValidation,
  };
}

/* ─────────────────────────────────────────────────────────────────
 *  POST handler
 * ───────────────────────────────────────────────────────────────── */

type ScanRequestBody = {
  images: string[];
  sellersClaim?: string;
  /**
   * Optional client-generated UUID. When provided, a duplicate request
   * (same userId + requestId) within ~60s is served from a cached result
   * rather than re-billing the OpenAI call. Protects against double-tap
   * on flaky mobile networks.
   */
  requestId?: string;
};

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/scan" });
  const reqId = log.requestId();
  const t0 = Date.now();

  // Refund bookkeeping. Set inside the try block once consume_scan
  // succeeds; the outer catch reads these to refund on unhandled errors
  // so the user doesn't lose a scan slot to an OpenAI / network failure.
  let needsRefund = false;
  let refundUserId: string | null = null;
  let refundFromTopup = false;

  try {
    // ── Subscription gate (Apple-safe, money-protection layer) ──
    // Anyone hitting this endpoint must have a valid Supabase session AND
    // an active 'member' or 'pro' membership. Free tier was retired May 2026.
    const gate = await requireSubscription(req);
    if (gate.ok === false) {
      log.warn("scan_gate_blocked", { req: reqId });
      return gate.response;
    }
    // Per-user burst rate limit — Pro: 30/min, Member: 10/min. Backed
    // by Supabase (public.check_rate_limit) so it works across all
    // regions and cold starts. consume_scan() below is the authoritative
    // monthly-cap enforcer; this is the abuse smoother.
    const rl = await checkRateLimit(
      gate.userId,
      gate.tier === "pro" ? 30 : 10,
      60,
      "scan:1m"
    );
    if (rl.ok === false) {
      log.warn("scan_rate_limited", {
        req: reqId,
        user: gate.userId,
        tier: gate.tier,
        retryAfter: rl.retryAfterSec,
      });
      return NextResponse.json(
        { error: "Slow down a moment, then try again.", code: "rate_limited" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    // Pro/Elite "unlimited" fair-use ceilings — protects against scripted
    // abuse without affecting any realistic human usage pattern.
    //   - Daily:    500 / day  (no human scans 500 plants a day)
    //   - Monthly:  5,000 / mo (catches sustained automation)
    // Member tier monthly cap is enforced by consume_scan() — see below.
    if (gate.tier === "pro") {
      const rlDay = await checkRateLimit(
        gate.userId,
        500,
        86_400,
        "scan:1d_pro"
      );
      if (rlDay.ok === false) {
        log.warn("scan_pro_daily_cap", {
          req: reqId,
          user: gate.userId,
          retryAfter: rlDay.retryAfterSec,
        });
        return NextResponse.json(
          {
            error:
              "You've hit today's fair-use scan limit (500/day). " +
              "Plenty of capacity tomorrow. If this is a real workflow that needs more, email support@strainspotter.app.",
            code: "fair_use_daily",
          },
          {
            status: 429,
            headers: { "Retry-After": String(rlDay.retryAfterSec) },
          }
        );
      }
      const rlMonth = await checkRateLimit(
        gate.userId,
        5_000,
        2_592_000,
        "scan:1mo_pro"
      );
      if (rlMonth.ok === false) {
        log.warn("scan_pro_monthly_cap", {
          req: reqId,
          user: gate.userId,
          retryAfter: rlMonth.retryAfterSec,
        });
        return NextResponse.json(
          {
            error:
              "You've hit this month's fair-use scan limit (5,000/mo). " +
              "Email support@strainspotter.app if you have a real workflow that needs more.",
            code: "fair_use_monthly",
          },
          {
            status: 429,
            headers: { "Retry-After": String(rlMonth.retryAfterSec) },
          }
        );
      }
    }

    // ── Body parse + payload validation BEFORE consume_scan ──
    // Reject bad payloads early so they don't burn a quota slot.

    // 1. Content-Length pre-check. Each base64 image inflates ~33%, so
    //    6 images × ~2 MB raw = ~16 MB encoded. We cap at 10 MB total to
    //    block someone uploading 6 enormous photos as a cost-amplification
    //    attack against OpenAI billing.
    const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        log.warn("scan_payload_too_large", {
          req: reqId,
          user: gate.userId,
          contentLength,
        });
        return NextResponse.json(
          {
            error:
              "Request too large. Total image payload must be under 10 MB.",
            code: "payload_too_large",
          },
          { status: 413 }
        );
      }
    }

    const body = (await req.json()) as ScanRequestBody;
    const images = body.images;
    const clientRequestId =
      typeof body.requestId === "string" && body.requestId.trim()
        ? body.requestId.trim().slice(0, 128)
        : undefined;
    const sellersClaim =
      typeof body.sellersClaim === "string" && body.sellersClaim.trim()
        ? body.sellersClaim.trim().slice(0, 80)
        : undefined;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }
    if (images.length > 6) {
      return NextResponse.json(
        { error: "Too many images (max 6)" },
        { status: 400 }
      );
    }

    // 2. Per-image MIME allowlist + per-image size cap. OpenAI's Vision
    //    API accepts jpeg/png/webp/gif; HEIC is iOS-camera default and
    //    we accept it because Capacitor wraps the iOS app (HEIC images
    //    are sent through the same path). Per-image cap at 2 MB raw,
    //    ~2.7 MB as a data: URL — keeps any single image realistic.
    const ALLOWED_MIME = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ]);
    const MAX_IMAGE_BYTES = 2_800_000;
    const validatedImages: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (typeof img !== "string") {
        return NextResponse.json(
          { error: `Image at index ${i} is not a string`, code: "invalid_image" },
          { status: 400 }
        );
      }
      if (!img.startsWith("data:")) {
        return NextResponse.json(
          {
            error: `Image at index ${i} must be a data: URL`,
            code: "invalid_image_format",
          },
          { status: 400 }
        );
      }
      const semicolon = img.indexOf(";");
      const mime = semicolon > 5 ? img.slice(5, semicolon).toLowerCase() : "";
      if (!ALLOWED_MIME.has(mime)) {
        return NextResponse.json(
          {
            error: `Image at index ${i} has unsupported MIME type: ${mime}`,
            code: "unsupported_image_type",
            allowed: Array.from(ALLOWED_MIME),
          },
          { status: 415 }
        );
      }
      if (img.length > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          {
            error: `Image at index ${i} is too large. Max ~2 MB per image.`,
            code: "image_too_large",
          },
          { status: 413 }
        );
      }
      validatedImages.push(img);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // ── Atomic quota check + counter increment ──
    // consume_scan() locks profiles.id row, validates membership tier,
    // enforces monthly cap (Member: 100/mo), and increments the right
    // counter. Member who's exhausted their 100 falls back to topup
    // credits if any remain. Returns allowed=false when out of both.
    // We call it AFTER body validation so bad requests don't burn a slot,
    // and BEFORE the OpenAI call so a refused user never burns OpenAI
    // cost; if OpenAI later fails we refund_scan() to make the user whole.
    const sb = getSupabaseAdmin();
    const quotaRpc = await sb.rpc("consume_scan", { p_user_id: gate.userId });
    if (quotaRpc.error) {
      log.error("scan_quota_rpc_error", {
        req: reqId,
        user: gate.userId,
        err: quotaRpc.error.message,
      });
      return NextResponse.json(
        { error: "Couldn't verify scan quota. Try again in a moment." },
        { status: 503 }
      );
    }
    const quota = quotaRpc.data as
      | {
          allowed: boolean;
          reason?: string;
          from_topup?: boolean;
          monthly_used?: number;
          monthly_cap?: number | null;
          monthly_remaining?: number | null;
          topup_remaining?: number;
          unlimited?: boolean;
        }
      | null;

    if (!quota || quota.allowed !== true) {
      const reason = quota?.reason ?? "quota_exceeded";
      const msg =
        reason === "no_subscription"
          ? "Active subscription required."
          : reason === "monthly_cap_reached"
            ? "You've used all 100 Member scans this month. Buy a top-up or upgrade to Pro for unlimited."
            : reason === "user_not_found"
              ? "Profile not found. Sign out and back in."
              : "Scan quota exceeded.";
      const status = reason === "no_subscription" ? 402 : 429;
      log.warn("scan_quota_blocked", {
        req: reqId,
        user: gate.userId,
        tier: gate.tier,
        reason,
      });
      return NextResponse.json(
        { error: msg, code: reason, quota },
        { status }
      );
    }

    // From here on, a slot has been spent. Any failure path must refund.
    needsRefund = true;
    refundUserId = gate.userId;
    refundFromTopup = quota.from_topup === true;

    log.info("scan_start", {
      req: reqId,
      user: gate.userId,
      tier: gate.tier,
      monthly_used: quota.monthly_used,
      topup_remaining: quota.topup_remaining,
    });

    // Build multimodal content from the already-validated images.
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: string } }
    > = [
      {
        type: "text",
        text: buildUserPrompt(validatedImages.length, sellersClaim),
      },
    ];
    for (const img of validatedImages) {
      content.push({
        type: "image_url",
        image_url: { url: img, detail: "high" },
      });
    }

    // Wrap the expensive OpenAI call in idempotency: a duplicate
    // request_id from the same user within ~60s returns the original
    // result without re-billing the OpenAI call. No requestId → runs
    // every time.
    const { result: outcome, cached } = await runIdempotent(
      gate.userId,
      clientRequestId,
      async () => {
        const aiRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content },
              ],
              response_format: { type: "json_object" },
              temperature: 0.2,
              max_tokens: 1800,
            }),
          }
        );

        if (!aiRes.ok) {
          const errText = await aiRes.text().catch(() => "");
          return {
            ok: false as const,
            status: 502,
            payload: {
              error: `OpenAI request failed (${aiRes.status})`,
              detail: errText.slice(0, 500),
            },
          };
        }

        const aiJson = (await aiRes.json()) as Record<string, unknown>;
        const choices = aiJson.choices as
          | Array<Record<string, unknown>>
          | undefined;
        const messageContent = choices?.[0]?.message
          ? ((choices[0].message as Record<string, unknown>).content as string)
          : "";

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(messageContent);
        } catch {
          const m = messageContent.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch {
              /* fall through */
            }
          }
        }

        const normalized = normalizeAnalysis(parsed, sellersClaim);
        return {
          ok: true as const,
          normalized,
          usage: aiJson.usage ?? null,
        };
      }
    );

    if (outcome.ok === false) {
      // OpenAI returned non-2xx — refund the slot so the user can retry.
      await refundScan(sb, refundUserId, refundFromTopup).catch((e) =>
        log.warn("scan_refund_failed", { req: reqId, err: String(e) })
      );
      needsRefund = false;
      return NextResponse.json(outcome.payload, { status: outcome.status });
    }

    if (cached) {
      // Double-tap with the same requestId. The original request already
      // spent a slot; refund this second spend so we don't charge twice.
      await refundScan(sb, refundUserId, refundFromTopup).catch((e) =>
        log.warn("scan_refund_cached_failed", {
          req: reqId,
          err: String(e),
        })
      );
    }

    // Success path — keep the spend.
    needsRefund = false;

    log.info("scan_done", {
      req: reqId,
      ms: Date.now() - t0,
      cached,
      candidates: Array.isArray((outcome.normalized as any)?.candidates)
        ? (outcome.normalized as any).candidates.length
        : 0,
    });
    return NextResponse.json({
      ok: true,
      model: "gpt-4o",
      result: outcome.normalized,
      usage: outcome.usage,
      cached,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("scan_error", {
      req: reqId,
      ms: Date.now() - t0,
      message,
    });
    if (needsRefund && refundUserId) {
      try {
        await refundScan(getSupabaseAdmin(), refundUserId, refundFromTopup);
      } catch (refundErr) {
        log.warn("scan_refund_catch_failed", {
          req: reqId,
          err: String(refundErr),
        });
      }
    }
    return NextResponse.json(
      { error: "Scan failed", detail: message },
      { status: 500 }
    );
  }
}

async function refundScan(
  sb: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  fromTopup: boolean
): Promise<void> {
  const { error } = await sb.rpc("refund_scan", {
    p_user_id: userId,
    p_from_topup: fromTopup,
  });
  if (error) throw new Error(error.message);
}
