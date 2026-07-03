// app/api/feedback/route.ts — user side of the two-way feedback loop.
//
// POST { category, message } — submit an idea/suggestion/bug (rate-limited).
// GET — the caller's own submissions, including any admin reply.
//
// Signed-in requirement only (any authenticated user may send feedback — you
// don't need a paid membership to tell us what to build).

import { NextRequest, NextResponse } from "next/server";
import { NextResponse as NR } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { cleanText } from "@/lib/b2b/server";

const CATEGORIES = ["idea", "suggestion", "bug", "praise", "other"] as const;

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NR.json({ error: "Sign in to view your feedback." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("feedback")
    .select("id, category, content, status, admin_reply, created_at, replied_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NR.json({ error: "Read failed" }, { status: 500 });
  return NR.json({ feedback: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NR.json({ error: "Sign in to send feedback." }, { status: 401 });

  const rl = await checkRateLimit(userId, 5, 86400, "feedback:1d");
  if (rl.ok === false) {
    return NR.json(
      { error: "That's plenty for today — thank you! Try again tomorrow.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NR.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = cleanText(body.message, 2000);
  const category =
    typeof body.category === "string" && (CATEGORIES as readonly string[]).includes(body.category)
      ? body.category
      : "idea";
  if (!message) return NR.json({ error: "Say something — message is required." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("feedback")
    .insert({ user_id: userId, category, content: message })
    .select("id, created_at")
    .single();
  if (error) return NR.json({ error: "Failed to save feedback" }, { status: 500 });
  return NR.json({ ok: true, id: data.id });
}
