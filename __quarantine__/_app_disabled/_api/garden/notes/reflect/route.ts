import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { allowAI, enforceCalmTone } from "@/lib/ai/guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notes } = body as { notes?: string[] };
    if (!allowAI({ kind: "chat", userAsked: true })) {
      return NextResponse.json({ error: "ai_not_allowed" }, { status: 403 });
    }

    const cleanNotes = (notes || []).filter((n) => typeof n === "string" && n.trim());

    if (!cleanNotes.length) {
      return NextResponse.json({
        reply: "You can jot thoughts here anytime. When more notes accumulate, the Garden can reflect on themes.",
      });
    }

    const summary = enforceCalmTone(
      [
        "Here are gentle themes noticed across your notes:",
        ...cleanNotes.slice(0, 5).map((n) => `• ${n.slice(0, 180)}${n.length > 180 ? "…" : ""}`),
        "Consider what you might want to observe next; no action is required.",
      ].join(" ")
    );

    return NextResponse.json({ reply: summary });
  } catch (err: any) {
    console.error("[notes/reflect] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

