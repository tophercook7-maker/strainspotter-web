// app/api/scan/route.ts
// StrainSpotter AI Scanner — Real GPT-4o Vision Analysis
// Replaces mock wikiEngine with actual image analysis

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are StrainSpotter's cannabis visual analysis AI — the most detailed plant identification system in the world.

You analyze cannabis plant photographs and return structured identification data based on observable visual characteristics.

ANALYSIS PROTOCOL:
1. MORPHOLOGY FIRST: Examine bud structure, density, shape, calyx-to-leaf ratio
2. TRICHOME ASSESSMENT: Density, color (clear/cloudy/amber), coverage pattern, maturity indicators
3. PISTIL ANALYSIS: Color spectrum (white→orange→amber→brown), density, curl pattern
4. COLORATION: Base green shade, purple/anthocyanin presence, sugar leaf coloring, fade patterns
5. LEAF STRUCTURE: Broad vs narrow leaflets, serration pattern, internode spacing clues
6. OVERALL MORPHOTYPE: Growth pattern indicators (indica-dominant structure vs sativa stretch)

STRAIN IDENTIFICATION:
- Cross-reference ALL observable traits against known cultivar phenotype databases
- Consider popular commercial strains AND legacy/landrace genetics
- Account for phenotype variation within strains
- Factor in grow conditions that affect appearance (indoor vs outdoor, maturity stage)
- If visual features strongly align with a known cultivar, name it with appropriate confidence
- If ambiguous, identify the most likely strain family/lineage

CONFIDENCE RULES:
- 85-95%: Multiple strong visual markers align with a specific cultivar
- 70-84%: Good morphological match but some traits could fit related cultivars  
- 55-69%: General family/lineage identification, specific cultivar uncertain
- Below 55%: Not enough visual data for meaningful identification
- NEVER output exactly 81% (avoid the uncanny valley of fake confidence)
- Be genuinely calibrated — if you're unsure, say so

TERPENE PREDICTION:
- Predict likely terpene profile from visual cues:
  - Dense, resinous buds → higher myrcene likelihood
  - Purple coloration → anthocyanin presence, often correlates with linalool
  - Strong citrus-colored trichomes → limonene indicators
  - Piney/earthy visual structure → pinene/caryophyllene correlation
- Assign confidence to each terpene prediction (0.0-1.0)

You MUST return valid JSON matching the exact schema below. No markdown, no commentary — pure JSON only.`;

const USER_PROMPT_TEMPLATE = (imageCount: number) => `Analyze ${imageCount > 1 ? `these ${imageCount} cannabis plant images` : "this cannabis plant image"} and return a detailed identification.

Return ONLY valid JSON with this exact structure:
{
  "identity": {
    "strainName": "string — most likely cultivar name",
    "confidence": "number 55-95",
    "alternateMatches": [{"strainName": "string", "confidence": "number"}]
  },
  "genetics": {
    "dominance": "Indica | Sativa | Hybrid",
    "lineage": ["parent1", "parent2"],
    "breederNotes": "string — origin/breeding history",
    "confidenceNotes": "string | null — any uncertainty explanation"
  },
  "morphology": {
    "budStructure": "string — detailed bud structure analysis",
    "coloration": "string — color analysis with specific shades",
    "trichomes": "string — trichome density, type, maturity assessment",
    "visualTraits": ["trait1", "trait2", "trait3"],
    "growthIndicators": ["indicator1", "indicator2"]
  },
  "chemistry": {
    "terpenes": [{"name": "string", "confidence": 0.0}],
    "cannabinoids": {"THC": "range%", "CBD": "range%"},
    "cannabinoidRange": "string summary"
  },
  "experience": {
    "effects": ["effect1", "effect2", "effect3"],
    "primaryEffects": ["primary1", "primary2"],
    "secondaryEffects": ["secondary1", "secondary2"],
    "onset": "Quick | Gradual | Moderate",
    "duration": "string range",
    "bestUse": ["use1", "use2"]
  },
  "cultivation": {
    "difficulty": "string",
    "floweringTime": "string range",
    "yield": "string",
    "notes": "string — growing tips"
  },
  "reasoning": {
    "whyThisMatch": "string — detailed explanation of why this strain was identified",
    "conflictingSignals": ["signal1"] or null
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images } = body as { images: string[] }; // base64 encoded images

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

    // Build message content with images
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: string } }
    > = [];

    // Add each image
    for (const img of images.slice(0, 5)) {
      // Ensure proper data URL format
      const dataUrl = img.startsWith("data:")
        ? img
        : `data:image/jpeg;base64,${img}`;

      content.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    // Add text prompt after images
    content.push({
      type: "text",
      text: USER_PROMPT_TEMPLATE(images.length),
    });

    // Call GPT-4o with vision
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        max_tokens: 4096,
        temperature: 0.3, // Low temperature for consistent, factual analysis
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI analysis failed: ${response.status}` },
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

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 502 }
      );
    }

    // Validate and ensure required fields exist
    const result = normalizeAnalysis(analysis);

    return NextResponse.json({
      ok: true,
      result,
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal scanner error" },
      { status: 500 }
    );
  }
}

/**
 * Ensure the AI response has all required fields with safe defaults
 */
function normalizeAnalysis(raw: Record<string, unknown>): Record<string, unknown> {
  const identity = (raw.identity as Record<string, unknown>) || {};
  const genetics = (raw.genetics as Record<string, unknown>) || {};
  const morphology = (raw.morphology as Record<string, unknown>) || {};
  const chemistry = (raw.chemistry as Record<string, unknown>) || {};
  const experience = (raw.experience as Record<string, unknown>) || {};
  const cultivation = (raw.cultivation as Record<string, unknown>) || {};
  const reasoning = (raw.reasoning as Record<string, unknown>) || {};

  return {
    identity: {
      strainName: identity.strainName || "Unknown Cultivar",
      confidence: Math.max(55, Math.min(95, Number(identity.confidence) || 60)),
      alternateMatches: Array.isArray(identity.alternateMatches)
        ? identity.alternateMatches
        : [],
    },
    genetics: {
      dominance: ["Indica", "Sativa", "Hybrid"].includes(
        genetics.dominance as string
      )
        ? genetics.dominance
        : "Hybrid",
      lineage: Array.isArray(genetics.lineage) ? genetics.lineage : [],
      breederNotes:
        genetics.breederNotes || "Lineage analysis based on visual traits",
      confidenceNotes: genetics.confidenceNotes || null,
    },
    morphology: {
      budStructure: morphology.budStructure || "Analysis pending",
      coloration: morphology.coloration || "Standard green coloration",
      trichomes: morphology.trichomes || "Trichome assessment pending",
      visualTraits: Array.isArray(morphology.visualTraits)
        ? morphology.visualTraits
        : [],
      growthIndicators: Array.isArray(morphology.growthIndicators)
        ? morphology.growthIndicators
        : [],
    },
    chemistry: {
      terpenes: Array.isArray((chemistry as Record<string, unknown>).terpenes)
        ? (chemistry as Record<string, unknown>).terpenes
        : [{ name: "Myrcene", confidence: 0.5 }],
      cannabinoids: (chemistry as Record<string, unknown>).cannabinoids || {
        THC: "15-25%",
        CBD: "<1%",
      },
      cannabinoidRange:
        (chemistry as Record<string, unknown>).cannabinoidRange ||
        "15-25% THC, <1% CBD",
      likelyTerpenes: Array.isArray(
        (chemistry as Record<string, unknown>).terpenes
      )
        ? ((chemistry as Record<string, unknown>).terpenes as Array<unknown>).slice(0, 3)
        : [{ name: "Myrcene", confidence: 0.5 }],
    },
    experience: {
      effects: Array.isArray(experience.effects)
        ? experience.effects
        : ["Relaxed"],
      primaryEffects: Array.isArray(experience.primaryEffects)
        ? experience.primaryEffects
        : [],
      secondaryEffects: Array.isArray(experience.secondaryEffects)
        ? experience.secondaryEffects
        : [],
      onset: experience.onset || "Moderate",
      duration: experience.duration || "2-4 hours",
      bestUse: Array.isArray(experience.bestUse) ? experience.bestUse : [],
    },
    cultivation: {
      difficulty: cultivation.difficulty || "Moderate",
      floweringTime: cultivation.floweringTime || "8-10 weeks",
      yield: cultivation.yield || "Medium",
      notes: cultivation.notes || "Standard cultivation requirements",
    },
    reasoning: {
      whyThisMatch:
        reasoning.whyThisMatch || "Visual analysis of uploaded images",
      conflictingSignals: Array.isArray(reasoning.conflictingSignals)
        ? reasoning.conflictingSignals
        : null,
    },
    disclaimer:
      "AI-assisted visual analysis. Not a substitute for laboratory testing. Results are based on observable morphological characteristics.",
  };
}
