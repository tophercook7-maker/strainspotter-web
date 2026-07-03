// lib/auth/ownerGate.ts
//
// Owner-only gate for /api/admin/*. Same bearer-token validation as
// requireSubscription, but the requirement is profiles.is_owner = true
// (set manually in SQL — see 012_owner_field.sql) instead of a paid tier,
// so the owner account works regardless of its own subscription state.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type OwnerGateResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

function failure(status: number, error: string, code: string): OwnerGateResult {
  return { ok: false, response: NextResponse.json({ error, code }, { status }) };
}

export async function requireOwner(req: Request): Promise<OwnerGateResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return failure(401, "Sign in to continue.", "auth_required");
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return failure(401, "Sign in to continue.", "auth_required");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return failure(503, "Auth backend is not configured.", "auth_misconfigured");
  }

  let userId: string;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnon },
    });
    if (!userRes.ok) return failure(401, "Session expired — sign in again.", "auth_invalid");
    const user = (await userRes.json()) as { id?: string };
    if (!user.id) return failure(401, "Session expired — sign in again.", "auth_invalid");
    userId = user.id;
  } catch {
    return failure(500, "Auth check failed.", "auth_error");
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("is_owner")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.is_owner !== true) {
      return failure(403, "Owner access only.", "not_owner");
    }
  } catch {
    return failure(500, "Owner check failed.", "owner_check_error");
  }

  return { ok: true, userId };
}
