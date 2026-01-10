import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { allowAI, enforceCalmTone } from "@/lib/ai/guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!allowAI({ kind: "chat", userAsked: true })) {
      return NextResponse.json({ error: "ai_not_allowed" }, { status: 403 });
    }

    if (!entries.length) {
      return NextResponse.json({
        reply: "No sessions available yet. Add entries to see a reflection here.",
      });
    }

    const productCounts: Record<string, number> = {};
    let withStrain = 0;
    let withEffects = 0;
    entries.forEach((e: any) => {
      if (e.product) productCounts[e.product] = (productCounts[e.product] || 0) + 1;
      if (e.strain) withStrain += 1;
      if (Array.isArray(e.effects) && e.effects.length) withEffects += 1;
    });

    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const parts: string[] = [];
    parts.push("These notes are observational and educational, not advice.");
    if (topProduct) parts.push(`Most frequent product type noted: ${topProduct}.`);
    if (withStrain) parts.push(`${withStrain} entries include strain names, helpful for spotting personal preferences.`);
    if (withEffects) parts.push(`${withEffects} entries list effects; watching those over time can show patterns you find meaningful.`);
    parts.push("Continue logging sessions calmly; reflections summarize themes without recommendations.");

    const reply = enforceCalmTone(parts.join(" "));
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[sessions/reflect] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

