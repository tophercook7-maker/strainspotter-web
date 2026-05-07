// app/api/grow-doctor/diagnose/route.ts
//
// Grow Doctor Diagnostic Endpoint — May 2026
//
// Accepts an image (cannabis plant or leaf showing a problem) plus optional
// context (stage, symptoms text, environment), runs a single GPT-4o Vision
// call with a cultivation-expert system prompt, and returns a structured
// diagnosis with: ranked likely cause(s), severity, immediate actions,
// monitoring guidance, and prevention.
//
// Apple-safe framing: educational cultivation guidance, no medical claims,
// no consumption instructions. Frames everything as "common grower practice".

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";

export const runtime = "edge";

const STAGES = [
  "sourcing",
  "seed",
  "seedling",
  "veg",
  "flower",
  "dry",
  "cure",
  "harvested",
  "partake",
] as const;
type Stage = (typeof STAGES)[number];

const SYSTEM_PROMPT = `You are Grow Doctor, an expert cannabis cultivation diagnostic assistant for the StrainSpotter app.

Your role: a grower has photographed a problem with their plant. Analyze the image and any context they provided, then return a structured diagnosis. You are educational, not medical. You speak with the calm, practical authority of a 20-year cultivator who has seen every common issue dozens of times.

═══ DIAGNOSTIC PROTOCOL ═══

Step 1 — OBSERVE.
Look at the photo objectively. Note: which leaves are affected (lower / mid / upper canopy), the symptom pattern (yellowing edges? brown tips? spots? wilting? curling? holes? webbing? mold?), the affected tissue (leaves only / stems / buds / roots), overall plant vigor, color, and any environmental clues (medium type, container, lighting visible).

Step 2 — RANK CAUSES.
Most cannabis plant problems fall into a small number of buckets: light stress (too much / too little / spectrum), nutrient issues (deficiency / excess / lockout / pH), watering issues (over / under / inconsistent), pests (spider mites, fungus gnats, thrips, aphids, broad mites), diseases (powdery mildew, bud rot/botrytis, root rot, septoria, leaf spot), heat / cold stress, humidity issues, training / mechanical damage, or genetic abnormality. Rank the 1-3 most likely causes with honest confidence (0-100). DO NOT inflate confidence — saying "this is most likely nitrogen deficiency OR early light burn, can't tell from the photo" is better than picking one with fake 90%.

Step 3 — SEVERITY.
Tag severity as "low" (cosmetic, monitor), "moderate" (act this week), or "urgent" (act today, plant at risk).

Step 4 — RECOMMEND ACTIONS.
Concrete steps the grower can take TODAY to address the most likely cause. Be specific: "flush with 3x pot volume of pH 6.3 water" not "fix the pH". For pest/disease: name the most common safe treatment (neem oil, IPM-friendly options) but don't prescribe specific brand names. If the user is in flower stage, avoid recommending products that shouldn't be used in flower.

Step 5 — PREVENTION.
What to do differently next time to prevent this. One or two practical tips, not a lecture.

═══ APPLE / HEALTH-CLAIM SAFETY ═══
- NEVER provide medical advice or claim cannabis treats any condition.
- Frame all recommendations as cultivation/horticultural practice.
- Use "experienced growers commonly" and "the typical practice is" framing.
- This is plant health diagnosis, not human health.

═══ OUTPUT FORMAT ═══
Return ONE valid JSON object, no markdown, no commentary, no code fences.

{
  "imageAssessment": {
    "isCannabisPlant": true | false,
    "imageQuality": "clear" | "blurry" | "too-dark" | "too-far",
    "stageObserved": "seedling" | "veg" | "flower" | "harvested" | "unclear",
    "affectedArea": "lower-leaves" | "upper-leaves" | "all-leaves" | "stems" | "buds" | "roots-pot" | "whole-plant" | "unclear"
  },
  "diagnoses": [
    {
      "cause": "string — short label (e.g. 'Nitrogen deficiency', 'Spider mites', 'Light burn', 'pH lockout')",
      "category": "nutrient" | "water" | "light" | "pest" | "disease" | "environment" | "mechanical" | "genetic" | "unknown",
      "confidence": 0-100,
      "explanation": "1-2 sentence explanation of WHY this is the likely cause based on what's visible",
      "supportingObservations": ["specific visual evidence #1", "specific visual evidence #2"]
    }
  ],
  "severity": "low" | "moderate" | "urgent",
  "severityReasoning": "1-sentence why this severity tier",
  "immediateActions": [
    "Concrete step #1 — what to do TODAY",
    "Concrete step #2 — what to do TODAY"
  ],
  "monitor": [
    "What to watch for over the next 3-7 days that confirms or rules out the diagnosis"
  ],
  "prevention": [
    "Practical tip to avoid this next grow"
  ],
  "advisoryNote": "Optional 1-sentence note when the diagnosis is uncertain. null if not needed.",
  "notCannabisMessage": "Only set if isCannabisPlant=false. Short kind message. null otherwise."
}

If the image clearly does not contain a cannabis plant, set isCannabisPlant=false, fill notCannabisMessage, and return an empty diagnoses array. If the image quality is too poor to diagnose, return one diagnosis with cause="Image quality too low to diagnose" and confidence in the 5-15 range.`;

function buildUserPrompt(input: {
  stage?: string;
  symptoms?: string;
  environment?: string;
  strainName?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    "Analyze this cannabis cultivation problem photo and return the JSON described in the system prompt."
  );

  const ctx: string[] = [];
  if (input.stage) ctx.push(`Stage: ${input.stage}`);
  if (input.strainName) ctx.push(`Strain (per grower): ${input.strainName}`);
  if (input.environment) ctx.push(`Environment: ${input.environment}`);
  if (input.symptoms) ctx.push(`Grower's description: "${input.symptoms.replace(/"/g, '\\"')}"`);

  if (ctx.length > 0) {
    lines.push("");
    lines.push("Grower-provided context:");
    for (const c of ctx) lines.push(`  • ${c}`);
  }

  lines.push("");
  lines.push("Return ONLY valid JSON. No markdown, no commentary, no code fences.");
  return lines.join("\n");
}

function detectImageMimeType(base64: string): string | null {
  if (!base64.startsWith("data:")) return null;
  const m = base64.match(/^data:([^;]+);/);
  return m ? m[1].toLowerCase() : null;
}
function isSupportedFormat(mime: string): boolean {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(mime);
}

const VALID_CATEGORIES = [
  "nutrient", "water", "light", "pest", "disease",
  "environment", "mechanical", "genetic", "unknown",
] as const;
const VALID_SEVERITIES = ["low", "moderate", "urgent"] as const;
const VALID_QUALITY = ["clear", "blurry", "too-dark", "too-far"] as const;
const VALID_AFFECTED = [
  "lower-leaves", "upper-leaves", "all-leaves", "stems",
  "buds", "roots-pot", "whole-plant", "unclear",
] as const;
const VALID_STAGE_OBS = [
  "seedling", "veg", "flower", "harvested", "unclear",
] as const;

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fb: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb;
}
function clampInt(v: unknown, min: number, max: number, fb: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.max(min, Math.min(max, Math.round(n)));
}
function asStringArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

function normalizeDiagnosis(raw: any) {
  const ia = (raw?.imageAssessment as Record<string, unknown>) || {};
  const isCannabis = ia.isCannabisPlant !== false;

  const diagnosesRaw = Array.isArray(raw?.diagnoses) ? raw.diagnoses : [];
  const diagnoses = diagnosesRaw
    .slice(0, 3)
    .map((d: any) => ({
      cause: typeof d?.cause === "string" ? d.cause.trim() : "Unknown cause",
      category: pickEnum(d?.category, VALID_CATEGORIES, "unknown"),
      confidence: clampInt(d?.confidence, 0, 100, 0),
      explanation: typeof d?.explanation === "string" ? d.explanation.trim() : "",
      supportingObservations: asStringArray(d?.supportingObservations, 5),
    }))
    .sort((a: any, b: any) => b.confidence - a.confidence);

  return {
    schemaVersion: "grow-doctor-v1",
    imageAssessment: {
      isCannabisPlant: isCannabis,
      imageQuality: pickEnum(ia.imageQuality, VALID_QUALITY, "clear"),
      stageObserved: pickEnum(ia.stageObserved, VALID_STAGE_OBS, "unclear"),
      affectedArea: pickEnum(ia.affectedArea, VALID_AFFECTED, "unclear"),
    },
    diagnoses,
    severity: pickEnum(raw?.severity, VALID_SEVERITIES, "low"),
    severityReasoning:
      typeof raw?.severityReasoning === "string" ? raw.severityReasoning.trim() : "",
    immediateActions: asStringArray(raw?.immediateActions, 6),
    monitor: asStringArray(raw?.monitor, 4),
    prevention: asStringArray(raw?.prevention, 4),
    advisoryNote:
      typeof raw?.advisoryNote === "string" && raw.advisoryNote.trim()
        ? raw.advisoryNote.trim() : null,
    notCannabisMessage:
      !isCannabis && typeof raw?.notCannabisMessage === "string"
        ? raw.notCannabisMessage.trim() : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    // ── Subscription gate ──
    // Plant-problem diagnostics burn a GPT-4o Vision call per request.
    // Subscribers only.
    const gate = await requireSubscription(req);
    if (gate.ok === false) return gate.response;

    const body = await req.json();
    const images: unknown = body?.images;
    const stage: unknown = body?.stage;
    const symptoms: unknown = body?.symptoms;
    const environment: unknown = body?.environment;
    const strainName: unknown = body?.strainName;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "At least one image is required." }, { status: 400 });
    }
    if (images.length > 4) {
      return NextResponse.json({ error: "Maximum 4 images per diagnosis." }, { status: 400 });
    }
    for (const img of images) {
      if (typeof img !== "string" || !img.startsWith("data:")) {
        return NextResponse.json(
          { error: "Each image must be a base64 data URL." },
          { status: 400 }
        );
      }
      const mime = detectImageMimeType(img);
      if (!mime || !isSupportedFormat(mime)) {
        return NextResponse.json(
          { error: `Unsupported image format${mime ? `: ${mime}` : ""}. Use PNG, JPEG, WEBP, or GIF.` },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is not configured for AI diagnosis." },
        { status: 503 }
      );
    }

    const userPrompt = buildUserPrompt({
      stage: typeof stage === "string" && STAGES.includes(stage as Stage) ? stage : undefined,
      symptoms: typeof symptoms === "string" ? symptoms.slice(0, 500) : undefined,
      environment: typeof environment === "string" ? environment.slice(0, 200) : undefined,
      strainName: typeof strainName === "string" ? strainName.slice(0, 80) : undefined,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          ...(images as string[]).map((img) => ({
            type: "image_url",
            image_url: { url: img, detail: "high" as const },
          })),
        ],
      },
    ];

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      return NextResponse.json(
        {
          error: "AI diagnosis service returned an error.",
          detail: errText.slice(0, 400),
          status: openaiResp.status,
        },
        { status: 502 }
      );
    }

    const data = await openaiResp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned malformed JSON; please try again.",
          raw: typeof content === "string" ? content.slice(0, 400) : "",
        },
        { status: 502 }
      );
    }

    const normalized = normalizeDiagnosis(parsed);
    return NextResponse.json(normalized);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Diagnosis failed.", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
