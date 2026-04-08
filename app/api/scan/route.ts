// app/api/scan/route.ts
// StrainSpotter AI Scanner v2 — Quality Grading + Dual Mode + Problem Detection
// GPT-4o Vision + 314-Strain Database Context
// Edge Runtime for 30s timeout (Hobby plan serverless caps at 10s)

import { NextRequest, NextResponse } from "next/server";
import strainDb from "@/lib/data/strains.json";

export const runtime = "edge";

/* ─── Build compact strain reference for the system prompt ─── */
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

/* ─── System Prompts ─── */

const BASE_CONTEXT = `You are StrainSpotter's cannabis visual analysis AI — the most advanced plant analysis system available.

═══ STRAINSPOTTER DATABASE (${STRAIN_COUNT} verified cultivars) ═══
When identifying a strain, ALWAYS check against this catalog first.
Prefer matches from this list when visual traits align. Only suggest strains outside this list if nothing matches well.

${STRAIN_CATALOG}

═══ END DATABASE ═══`;

const CONSUMER_SYSTEM_PROMPT = `${BASE_CONTEXT}

You analyze cannabis photographs and return comprehensive identification + quality analysis.

ANALYSIS PROTOCOL:
1. STRAIN IDENTIFICATION
   - Cross-reference visual traits against the StrainSpotter database
   - Match bud structure, trichome density, pistil color, leaf shape, coloration
   - Consider phenotype variation and grow conditions
   - If ambiguous, list top 2-3 alternates

2. QUALITY GRADING (A+ through F)
   Grade on these criteria, each scored 1-10:
   - Trichome Coverage: Density, distribution, and maturity (clear/cloudy/amber)
   - Bud Structure: Density, calyx-to-leaf ratio, shape consistency
   - Trim Quality: How well manicured, sugar leaf presence
   - Color & Appeal: Vibrancy, fade patterns, anthocyanin presence
   - Cure Quality: Dryness indicators, color preservation, stem snap indicators
   - Overall Bag Appeal: First impression, photogenic quality
   
   Grading scale:
   A+ (95-100): Exceptional top-shelf, competition quality
   A  (90-94): Premium dispensary top-shelf
   A- (85-89): High quality, minor imperfections
   B+ (80-84): Above average, good dispensary mid-shelf
   B  (75-79): Solid quality, typical mid-shelf
   B- (70-74): Acceptable, some visible issues
   C+ (65-69): Below average, budget shelf
   C  (60-64): Mediocre, noticeable flaws
   D  (50-59): Poor quality, significant issues
   F  (below 50): Very poor, possible problems

3. PROBLEM DETECTION
   Scan for any visible issues:
   - Mold/bud rot (gray/white fuzzy patches, dark spots)
   - Pest damage (webs, spots, bite marks)
   - Nutrient issues (yellowing, browning, spots)
   - Premature harvest (all-clear trichomes, white pistils)
   - Over-dried / poorly cured indicators
   - PGR (Plant Growth Regulator) suspicion (unnaturally dense, no trichomes, orange hairs)
   Report "none" if the sample looks clean.

4. TRICHOME MATURITY ASSESSMENT
   - Clear → not ready / early harvest
   - Cloudy → peak THC / ideal harvest
   - Amber → degrading to CBN / late harvest / more sedative
   - Mixed ratio estimation

5. TERPENE PREDICTION
   - Use database terpenes when matched strain has known profiles
   - Predict from visual cues with confidence scores
   - Dense resinous → myrcene; Purple → linalool; Citrus trichomes → limonene

CONFIDENCE RULES:
- 85-95%: Multiple strong visual markers align with database cultivar
- 70-84%: Good match but some traits could fit related cultivars
- 55-69%: General family/lineage, specific cultivar uncertain
- Below 55%: Not enough visual data
- NEVER output exactly 81%
- Be genuinely calibrated

Return ONLY valid JSON. No markdown, no commentary.`;

const GROWER_SYSTEM_PROMPT = `${BASE_CONTEXT}

You analyze cannabis GROW photographs and return cultivation-focused analysis. The user is a grower checking on their plants — they care about plant health, harvest timing, and growing advice, not just strain identification.

ANALYSIS PROTOCOL:
1. PLANT HEALTH ASSESSMENT
   Score overall health 1-100 and identify:
   - Nutrient status: deficiencies (N, P, K, Ca, Mg, Fe), toxicities, lockout signs
   - Pest detection: spider mites, thrips, aphids, fungus gnats, broad mites
   - Disease detection: powdery mildew, bud rot, root rot, leaf septoria
   - Environmental stress: light burn, heat stress, wind damage, overwatering
   
2. GROWTH STAGE IDENTIFICATION
   - Seedling / Vegetative / Pre-flower / Early flower / Mid flower / Late flower / Harvest ready
   - Estimated days/weeks in current stage
   - Estimated days to harvest (if flowering)

3. TRICHOME MATURITY (if visible)
   - Clear/cloudy/amber ratio estimate
   - Harvest window recommendation:
     "Not ready" / "Harvest window opening" / "Peak harvest" / "Late harvest — more sedative"
   
4. STRAIN IDENTIFICATION (secondary)
   - Still cross-reference the database but focus on grow characteristics
   - Indica vs sativa structure assessment from plant morphology

5. ACTIONABLE GROW ADVICE
   - Top 3 things the grower should do right now
   - Any warnings or urgent issues
   - Feeding recommendations based on visible health
   - Environmental adjustments needed

6. PROBLEM DETECTION (CRITICAL)
   - Flag ANY mold, pests, or disease with severity (low/medium/high/critical)
   - Provide immediate action steps for each problem found
   - "Clean" if no issues detected

Return ONLY valid JSON. No markdown, no commentary.`;

/* ─── User Prompts ─── */

const CONSUMER_USER_PROMPT = (imageCount: number) =>
  `Analyze ${imageCount > 1 ? `these ${imageCount} cannabis images` : "this cannabis image"} and return a complete identification + quality assessment.

Return ONLY valid JSON with this exact structure:
{
  "identity": {
    "strainName": "string — most likely cultivar name",
    "confidence": "number 55-95",
    "alternateMatches": [{"strainName": "string", "confidence": "number"}],
    "databaseMatch": "boolean — true if matched from StrainSpotter catalog"
  },
  "quality": {
    "grade": "string — A+, A, A-, B+, B, B-, C+, C, D, or F",
    "score": "number 0-100",
    "breakdown": {
      "trichomeCoverage": "number 1-10",
      "budStructure": "number 1-10",
      "trimQuality": "number 1-10",
      "colorAppeal": "number 1-10",
      "cureQuality": "number 1-10",
      "bagAppeal": "number 1-10"
    },
    "summary": "string — one-sentence quality verdict"
  },
  "genetics": {
    "dominance": "Indica | Sativa | Hybrid",
    "ratio": {"indica": "number 0-100", "sativa": "number 0-100"},
    "lineage": ["parent1", "parent2"],
    "breederNotes": "string"
  },
  "morphology": {
    "budStructure": "string — detailed bud structure analysis",
    "coloration": "string — color analysis with specific shades",
    "trichomes": "string — trichome density, type, maturity assessment",
    "trichomeMaturity": {"clear": "number %", "cloudy": "number %", "amber": "number %"},
    "pistils": "string — pistil color and state",
    "visualTraits": ["trait1", "trait2", "trait3"]
  },
  "chemistry": {
    "terpenes": [{"name": "string", "confidence": "number 0-1.0", "aroma": "string"}],
    "cannabinoids": {"THC": "string range%", "CBD": "string range%"},
    "predictedExperience": "string — what to expect from this specific sample"
  },
  "problems": {
    "detected": "boolean",
    "issues": [{"type": "string", "severity": "low|medium|high|critical", "description": "string", "action": "string"}],
    "safetyVerdict": "string — Clean / Caution / Warning / Do Not Consume"
  },
  "experience": {
    "effects": ["effect1", "effect2", "effect3"],
    "onset": "Quick | Gradual | Moderate",
    "duration": "string range",
    "bestFor": ["use1", "use2"],
    "avoidIf": "string or null — warnings for certain users"
  },
  "cultivation": {
    "difficulty": "string",
    "floweringTime": "string range",
    "yield": "string",
    "growTips": ["tip1", "tip2"]
  },
  "reasoning": {
    "whyThisMatch": "string — detailed explanation referencing visual cues and database traits",
    "conflictingSignals": ["signal1"] or null,
    "analysisNotes": "string — anything interesting about this sample"
  }
}`;

const GROWER_USER_PROMPT = (imageCount: number) =>
  `Analyze ${imageCount > 1 ? `these ${imageCount} cannabis grow images` : "this cannabis grow image"} and return a cultivation-focused assessment.

Return ONLY valid JSON with this exact structure:
{
  "identity": {
    "strainName": "string — best guess cultivar name",
    "confidence": "number 55-95",
    "databaseMatch": "boolean"
  },
  "health": {
    "score": "number 0-100",
    "status": "Thriving | Healthy | Fair | Stressed | Critical",
    "summary": "string — one-sentence health verdict"
  },
  "growthStage": {
    "stage": "Seedling | Vegetative | Pre-flower | Early Flower | Mid Flower | Late Flower | Harvest Ready",
    "estimatedAge": "string — estimated days/weeks in current stage",
    "daysToHarvest": "number or null — estimated days until harvest",
    "harvestWindow": "string — Not Ready | Window Opening | Peak Harvest | Late Harvest"
  },
  "trichomes": {
    "visible": "boolean — whether trichomes are clearly visible in photos",
    "maturity": {"clear": "number %", "cloudy": "number %", "amber": "number %"},
    "assessment": "string — maturity analysis and harvest timing recommendation"
  },
  "problems": {
    "detected": "boolean",
    "issues": [{"type": "string", "severity": "low|medium|high|critical", "description": "string", "immediateAction": "string"}],
    "overallRisk": "None | Low | Medium | High | Critical"
  },
  "nutrients": {
    "status": "Optimal | Slight Deficiency | Deficiency | Toxicity | Lockout",
    "deficiencies": [{"nutrient": "string", "severity": "string", "signs": "string"}],
    "feedingAdvice": "string"
  },
  "environment": {
    "growType": "Indoor | Outdoor | Greenhouse | Unknown",
    "lightAssessment": "string",
    "stressIndicators": ["indicator1"] or null
  },
  "actionItems": {
    "urgent": ["string — critical things to do now"] or null,
    "recommended": ["string — suggested improvements"],
    "watchFor": ["string — things to monitor"]
  },
  "genetics": {
    "dominance": "Indica | Sativa | Hybrid",
    "morphotype": "string — growth structure assessment",
    "lineage": ["parent1", "parent2"] or null
  }
}`;

/* ─── API Handler ─── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, mode = "consumer" } = body as {
      images: string[];
      mode?: "consumer" | "grower";
    };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Select prompt based on mode
    const systemPrompt =
      mode === "grower" ? GROWER_SYSTEM_PROMPT : CONSUMER_SYSTEM_PROMPT;
    const userPrompt =
      mode === "grower"
        ? GROWER_USER_PROMPT(images.length)
        : CONSUMER_USER_PROMPT(images.length);

    // Build message content with images
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: string } }
    > = [];

    const SUPPORTED_MIMES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    for (const img of images.slice(0, 5)) {
      let dataUrl = img.startsWith("data:")
        ? img
        : `data:image/jpeg;base64,${img}`;

      const mimeMatch = dataUrl.match(/^data:([^;]+);/);
      if (mimeMatch && !SUPPORTED_MIMES.includes(mimeMatch[1])) {
        dataUrl = dataUrl.replace(/^data:[^;]+;/, "data:image/jpeg;");
      }

      content.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    content.push({ type: "text", text: userPrompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `AI analysis failed (upstream ${response.status})`,
          detail: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      return NextResponse.json(
        { error: "No analysis returned from AI" },
        { status: 502 }
      );
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 502 }
      );
    }

    const result =
      mode === "grower"
        ? normalizeGrowerAnalysis(analysis)
        : normalizeConsumerAnalysis(analysis);

    return NextResponse.json({
      ok: true,
      mode,
      result,
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal scanner error", detail: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}

/* ─── Normalize Consumer Response ─── */
function normalizeConsumerAnalysis(
  raw: Record<string, any>
): Record<string, any> {
  const identity = raw.identity || {};
  const quality = raw.quality || {};
  const genetics = raw.genetics || {};
  const morphology = raw.morphology || {};
  const chemistry = raw.chemistry || {};
  const problems = raw.problems || {};
  const experience = raw.experience || {};
  const cultivation = raw.cultivation || {};
  const reasoning = raw.reasoning || {};

  return {
    identity: {
      strainName: identity.strainName || "Unknown Cultivar",
      confidence: Math.max(55, Math.min(95, Number(identity.confidence) || 60)),
      alternateMatches: Array.isArray(identity.alternateMatches)
        ? identity.alternateMatches
        : [],
      databaseMatch: identity.databaseMatch ?? false,
    },
    quality: {
      grade: quality.grade || "B",
      score: Math.max(0, Math.min(100, Number(quality.score) || 70)),
      breakdown: {
        trichomeCoverage: Number(quality.breakdown?.trichomeCoverage) || 5,
        budStructure: Number(quality.breakdown?.budStructure) || 5,
        trimQuality: Number(quality.breakdown?.trimQuality) || 5,
        colorAppeal: Number(quality.breakdown?.colorAppeal) || 5,
        cureQuality: Number(quality.breakdown?.cureQuality) || 5,
        bagAppeal: Number(quality.breakdown?.bagAppeal) || 5,
      },
      summary: quality.summary || "Quality assessment based on visual analysis",
    },
    genetics: {
      dominance: ["Indica", "Sativa", "Hybrid"].includes(genetics.dominance)
        ? genetics.dominance
        : "Hybrid",
      ratio: genetics.ratio || { indica: 50, sativa: 50 },
      lineage: Array.isArray(genetics.lineage) ? genetics.lineage : [],
      breederNotes: genetics.breederNotes || "Lineage based on visual traits",
    },
    morphology: {
      budStructure: morphology.budStructure || "Analysis pending",
      coloration: morphology.coloration || "Standard green coloration",
      trichomes: morphology.trichomes || "Trichome assessment pending",
      trichomeMaturity: morphology.trichomeMaturity || {
        clear: 20,
        cloudy: 60,
        amber: 20,
      },
      pistils: morphology.pistils || "Pistil analysis pending",
      visualTraits: Array.isArray(morphology.visualTraits)
        ? morphology.visualTraits
        : [],
    },
    chemistry: {
      terpenes: Array.isArray(chemistry.terpenes)
        ? chemistry.terpenes
        : [{ name: "Myrcene", confidence: 0.5, aroma: "earthy" }],
      cannabinoids: chemistry.cannabinoids || { THC: "15-25%", CBD: "<1%" },
      predictedExperience:
        chemistry.predictedExperience || "Typical cannabis experience",
    },
    problems: {
      detected: problems.detected ?? false,
      issues: Array.isArray(problems.issues) ? problems.issues : [],
      safetyVerdict: problems.safetyVerdict || "Clean",
    },
    experience: {
      effects: Array.isArray(experience.effects)
        ? experience.effects
        : ["Relaxed"],
      onset: experience.onset || "Moderate",
      duration: experience.duration || "2-4 hours",
      bestFor: Array.isArray(experience.bestFor) ? experience.bestFor : [],
      avoidIf: experience.avoidIf || null,
    },
    cultivation: {
      difficulty: cultivation.difficulty || "Moderate",
      floweringTime: cultivation.floweringTime || "8-10 weeks",
      yield: cultivation.yield || "Medium",
      growTips: Array.isArray(cultivation.growTips) ? cultivation.growTips : [],
    },
    reasoning: {
      whyThisMatch:
        reasoning.whyThisMatch || "Visual analysis of uploaded images",
      conflictingSignals: Array.isArray(reasoning.conflictingSignals)
        ? reasoning.conflictingSignals
        : null,
      analysisNotes: reasoning.analysisNotes || null,
    },
    disclaimer:
      "AI-assisted visual analysis. Not a substitute for laboratory testing.",
  };
}

/* ─── Normalize Grower Response ─── */
function normalizeGrowerAnalysis(
  raw: Record<string, any>
): Record<string, any> {
  const identity = raw.identity || {};
  const health = raw.health || {};
  const growthStage = raw.growthStage || {};
  const trichomes = raw.trichomes || {};
  const problems = raw.problems || {};
  const nutrients = raw.nutrients || {};
  const environment = raw.environment || {};
  const actionItems = raw.actionItems || {};
  const genetics = raw.genetics || {};

  return {
    identity: {
      strainName: identity.strainName || "Unknown Cultivar",
      confidence: Math.max(55, Math.min(95, Number(identity.confidence) || 60)),
      databaseMatch: identity.databaseMatch ?? false,
    },
    health: {
      score: Math.max(0, Math.min(100, Number(health.score) || 70)),
      status: ["Thriving", "Healthy", "Fair", "Stressed", "Critical"].includes(
        health.status
      )
        ? health.status
        : "Fair",
      summary: health.summary || "Health assessment based on visual analysis",
    },
    growthStage: {
      stage: growthStage.stage || "Unknown",
      estimatedAge: growthStage.estimatedAge || "Unknown",
      daysToHarvest: growthStage.daysToHarvest ?? null,
      harvestWindow: growthStage.harvestWindow || "Not Ready",
    },
    trichomes: {
      visible: trichomes.visible ?? false,
      maturity: trichomes.maturity || { clear: 33, cloudy: 34, amber: 33 },
      assessment: trichomes.assessment || "Unable to assess trichome maturity from photos",
    },
    problems: {
      detected: problems.detected ?? false,
      issues: Array.isArray(problems.issues) ? problems.issues : [],
      overallRisk: problems.overallRisk || "None",
    },
    nutrients: {
      status: nutrients.status || "Unknown",
      deficiencies: Array.isArray(nutrients.deficiencies)
        ? nutrients.deficiencies
        : [],
      feedingAdvice: nutrients.feedingAdvice || "Monitor plant response",
    },
    environment: {
      growType: environment.growType || "Unknown",
      lightAssessment: environment.lightAssessment || "Unable to assess",
      stressIndicators: Array.isArray(environment.stressIndicators)
        ? environment.stressIndicators
        : null,
    },
    actionItems: {
      urgent: Array.isArray(actionItems.urgent) ? actionItems.urgent : null,
      recommended: Array.isArray(actionItems.recommended)
        ? actionItems.recommended
        : ["Continue current care routine"],
      watchFor: Array.isArray(actionItems.watchFor)
        ? actionItems.watchFor
        : ["Monitor overall plant health"],
    },
    genetics: {
      dominance: ["Indica", "Sativa", "Hybrid"].includes(genetics.dominance)
        ? genetics.dominance
        : "Hybrid",
      morphotype: genetics.morphotype || "Visual morphotype assessment",
      lineage: Array.isArray(genetics.lineage) ? genetics.lineage : null,
    },
    disclaimer:
      "AI-assisted grow analysis. Not a substitute for professional cultivation advice.",
  };
}
