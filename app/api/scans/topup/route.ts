import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_AMOUNTS = new Set([10, 25]);

/**
 * POST /api/scans/topup
 * Internal helper for Stripe (or other server flows) to credit top-up scans.
 *
 * Body: { userId: string, amount: 10 | 25 }
 *
 * If `SCAN_TOPUP_INTERNAL_SECRET` is set, require:
 *   Authorization: Bearer <SCAN_TOPUP_INTERNAL_SECRET>
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SCAN_TOPUP_INTERNAL_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const userId =
      body &&
      typeof body === "object" &&
      "userId" in body &&
      typeof (body as { userId: unknown }).userId === "string"
        ? (body as { userId: string }).userId.trim()
        : "";

    const amountRaw =
      body &&
      typeof body === "object" &&
      "amount" in body
        ? (body as { amount: unknown }).amount
        : undefined;

    const amount =
      typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || !ALLOWED_AMOUNTS.has(amount)) {
      return NextResponse.json(
        { error: "amount must be 10 or 25" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: row, error: selErr } = await supabase
      .from("profiles")
      .select("topup_scans_available")
      .eq("id", userId)
      .single();

    if (selErr?.code === "PGRST116" || !row) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }

    const current = Number(row.topup_scans_available ?? 0);
    const next = Math.max(0, current) + amount;

    const { data: updated, error: upErr } = await supabase
      .from("profiles")
      .update({ topup_scans_available: next })
      .eq("id", userId)
      .select("topup_scans_available")
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      userId,
      amount,
      topup_scans_available: Number(updated?.topup_scans_available ?? next),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
