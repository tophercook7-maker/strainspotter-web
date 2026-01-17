import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { allowAI, enforceCalmTone } from "@/lib/ai/guard";

const cache = new Map<string, { at: number; text: string }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, grow_id, scan_id, diagnosis_id, confidence } = body;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    if (!allowAI({ kind: "chat", userAsked: true })) {
      return NextResponse.json({ error: "ai_not_allowed" }, { status: 403 });
    }

    const key = `${message.trim()}|${grow_id || ""}|${scan_id || ""}|${diagnosis_id || ""}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ reply: cached.text });
    }

    const parts: string[] = [];
    parts.push("Here’s a calm note based on what you shared.");
    if (grow_id) parts.push("Context: a specific grow is in focus.");
    if (scan_id) parts.push("You recently added a scan; it documents progress.");
    if (diagnosis_id && confidence && Number(confidence) >= 50) {
      parts.push("Diagnostics suggest a moderate or better signal; consider the latest guidance as a steady reference.");
    } else if (diagnosis_id) {
      parts.push("Diagnostics are still observational; use them as light guidance.");
    }
    parts.push("Keep noting changes over time; the Garden learns from steady updates.");

    const reply = enforceCalmTone(parts.join(" "));
    cache.set(key, { at: now, text: reply });
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[chat/ask] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

