// STEP J4 (Cursor) — app/api/scan/judge/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

type Candidate = {
  strain_id: string;
  strain_name: string;
  storage_path: string | null;
  similarity: number;
};

function toBase64FromDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URL");
  return { mime: m[1], base64: m[2] };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY" },
        { status: 503 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase configuration" },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({} as any));

    const imageDataUrl: string | undefined = body.imageDataUrl;
    const imageBase64: string | undefined = body.imageBase64;
    const imageMime: string | undefined = body.imageMime || "image/jpeg";

    const topK: number = Number(body.topK ?? 10);
    const minSimilarity: number = Number(body.minSimilarity ?? 0.0);

    const userId: string | null = body.userId ?? null;
    const anonSessionId: string | null = body.anonSessionId ?? null;

    if (!imageDataUrl && !imageBase64) {
      return NextResponse.json(
        { ok: false, error: "Provide imageDataUrl or imageBase64" },
        { status: 400 }
      );
    }

    const { base64, mime } = imageDataUrl
      ? toBase64FromDataUrl(imageDataUrl)
      : { base64: imageBase64 as string, mime: imageMime };

    // 1) Vision: short, consistent description (keeps embeddings aligned w/ backfill approach)
    // Throttle-safe: tiny retry loop for 429s.
    let description = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const vision = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "Describe the cannabis product/strain image briefly for identification. 1-2 sentences. Focus on visible packaging/label text, logo, colors, and key visual elements. No guesses beyond what is visible.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${base64}` },
                },
              ],
            },
          ],
        });

        description =
          vision.choices?.[0]?.message?.content?.trim() ||
          "Unclear image; no readable label text.";
        break;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
          await sleep(350 + attempt * 250);
          continue;
        }
        throw e;
      }
    }

    // 2) Embedding
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description,
    });
    const embedding = emb.data[0].embedding;

    // 3) Vector match against vault
    const { data: matches, error: matchErr } = await supabase.rpc(
      "vault_match_images",
      {
        query_embedding: embedding,
        match_count: Math.max(1, Math.min(50, topK)),
        min_similarity: minSimilarity,
      }
    );

    if (matchErr) {
      return NextResponse.json(
        { ok: false, error: `vault_match_images failed: ${matchErr.message}` },
        { status: 500 }
      );
    }

    const rows =
      (matches as Array<{
        image_id: string;
        strain_id: string;
        storage_path: string;
        similarity: number;
      }>) || [];

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        description,
        best: null,
        candidates: [],
        askForBetterPics: true,
        reason: "No matches above threshold",
        noRealMatch: true,
        userMessage: "We could not confidently identify a known cultivar from this scan.",
      });
    }

    // 4) Hydrate strain names
    const strainIds = Array.from(new Set(rows.map((r) => r.strain_id)));
    const { data: strains, error: strainErr } = await supabase
      .from("vault_strains")
      .select("strain_id, canonical_name")
      .in("strain_id", strainIds);

    if (strainErr) {
      return NextResponse.json(
        { ok: false, error: `vault_strains lookup failed: ${strainErr.message}` },
        { status: 500 }
      );
    }

    const nameById = new Map(
      (strains || []).map((s: any) => [s.strain_id, s.canonical_name])
    );

    // 5) Aggregate by strain (best similarity wins)
    const bestByStrain = new Map<string, Candidate>();
    for (const r of rows) {
      const existing = bestByStrain.get(r.strain_id);
      const candidate: Candidate = {
        strain_id: r.strain_id,
        strain_name: nameById.get(r.strain_id) || "Unknown",
        storage_path: r.storage_path || null,
        similarity: Number(r.similarity),
      };
      if (!existing || candidate.similarity > existing.similarity) {
        bestByStrain.set(r.strain_id, candidate);
      }
    }

    const candidates = Array.from(bestByStrain.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    const best = candidates[0] || null;

    // 6) Confidence + "ask for better pics"
    const bestSim = best?.similarity ?? 0;
    const askForBetterPics = bestSim < 0.82; // tune later

    // 7) Memory (optional table)
    // If table doesn't exist, this silently fails without breaking the judge response.
    try {
      await supabase.from("vault_scan_events").insert({
        user_id: userId,
        anon_session_id: anonSessionId,
        best_strain_id: best?.strain_id ?? null,
        best_similarity: bestSim,
        candidates,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      description,
      best,
      candidates,
      askForBetterPics,
      guidance: askForBetterPics
        ? "Best match shown. For higher confidence, upload a sharper, front-on photo of the label and one of the full package."
        : "High-confidence match. You can still add another angle to confirm.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
