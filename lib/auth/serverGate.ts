// lib/auth/serverGate.ts
//
// Edge-runtime-safe subscription gate for AI endpoints.
// Validates the Supabase auth token from the Authorization header,
// looks up profile.membership, and returns either an authorized
// user or an HTTP-ready failure response.
//
// Used by /api/scan and /api/grow-doctor/diagnose to protect the
// expensive OpenAI Vision calls behind an active paid subscription.

import { NextResponse } from "next/server";

export type GateResult =
  | { ok: true; userId: string; tier: "member" | "pro" }
  | { ok: false; response: NextResponse };

/**
 * Verify the request carries a valid Supabase access token AND that the
 * authenticated user has an active "member" or "pro" subscription.
 *
 * Returns either:
 *   - { ok: true, userId, tier } on success — caller proceeds with the AI call
 *   - { ok: false, response }    on failure — caller MUST return that response
 *
 * Failure conditions and their HTTP status codes:
 *   401 — no Authorization header / invalid token
 *   402 — authenticated but no active subscription
 *   503 — Supabase env vars not configured (server misconfiguration)
 *   500 — Supabase backend unreachable / unexpected error
 */
export async function requireSubscription(req: Request): Promise<GateResult> {
  // 1. Extract bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return failure(401, "Sign in to continue.", "auth_required");
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return failure(401, "Sign in to continue.", "auth_required");
  }

  // 2. Resolve required env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return failure(
      503,
      "Auth backend is not configured.",
      "auth_misconfigured"
    );
  }

  // 3. Validate token + get user id
  let userId: string;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnon,
      },
    });
    if (!userRes.ok) {
      return failure(401, "Session expired. Sign in again.", "session_expired");
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user?.id) {
      return failure(401, "Couldn't resolve user.", "auth_invalid");
    }
    userId = user.id;
  } catch {
    return failure(500, "Auth check failed.", "auth_network");
  }

  // 4. Look up profile.membership
  let membership: string | null = null;
  try {
    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
        userId
      )}&select=membership`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnon,
          Accept: "application/json",
        },
      }
    );
    if (!profRes.ok) {
      return failure(500, "Couldn't load subscription status.", "profile_error");
    }
    const rows = (await profRes.json()) as Array<{ membership?: string | null }>;
    membership = rows?.[0]?.membership ?? null;
  } catch {
    return failure(500, "Subscription check failed.", "profile_network");
  }

  // 5. Tier check
  if (membership !== "member" && membership !== "pro") {
    return failure(
      402,
      "Active subscription required.",
      "subscription_required"
    );
  }

  return { ok: true, userId, tier: membership };
}

function failure(
  status: number,
  message: string,
  code: string
): GateResult {
  return {
    ok: false,
    response: NextResponse.json({ error: message, code }, { status }),
  };
}
