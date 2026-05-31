// app/api/profile/training-consent/route.ts
//
// Training-data consent endpoint.
//
// Lets a signed-in user toggle whether their confirmed scans may be used
// as training data for future model fine-tunes. MUST be explicit, MUST
// default to false, MUST be revocable. Reading this is critical for
// GDPR (lawful basis: explicit consent, Art. 6(1)(a)) and CCPA
// (right to know + right to opt-out of sale/share).
//
// Endpoints:
//   GET  → returns { consent: boolean, consentedAt: string | null }
//   POST → body { consent: boolean }; persists; returns the new state
//
// Auth: required. Reuses requireSubscription's auth check (just the
// token validation half) — we don't gate this on subscription because
// the user must always be able to revoke consent even after canceling.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Validate the Supabase access token and return the user id. Returns
 * null on auth failure (caller responds 401).
 *
 * Lighter than requireSubscription — we don't need tier here.
 */
async function resolveUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnon,
      },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function getProfileConsent(
  userId: string,
  accessToken: string
): Promise<{ consent: boolean; consentedAt: string | null } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
      userId
    )}&select=training_consent,training_consent_at`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnon,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{
    training_consent?: boolean | null;
    training_consent_at?: string | null;
  }>;
  const row = rows?.[0];
  if (!row) return { consent: false, consentedAt: null };
  return {
    consent: row.training_consent === true,
    consentedAt: row.training_consent_at ?? null,
  };
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const accessToken = req.headers.get("authorization")!.slice(7).trim();
  const consent = await getProfileConsent(userId, accessToken);
  if (!consent) {
    return NextResponse.json(
      { error: "Couldn't load consent state." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, ...consent });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const accessToken = req.headers.get("authorization")!.slice(7).trim();

  let body: { consent?: unknown } = {};
  try {
    body = (await req.json()) as { consent?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.consent !== "boolean") {
    return NextResponse.json(
      { error: "Body must include `consent: boolean`." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Granting consent → set both flag and timestamp.
  // Revoking consent → clear timestamp so we have an audit trail of
  // "consented at X, then revoked." (Don't keep the timestamp around;
  // it would be misleading.)
  const updates = body.consent
    ? {
        training_consent: true,
        training_consent_at: new Date().toISOString(),
      }
    : {
        training_consent: false,
        training_consent_at: null,
      };

  const upd = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnon,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(updates),
    }
  );
  if (!upd.ok) {
    return NextResponse.json(
      { error: "Couldn't update consent state." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    ok: true,
    consent: body.consent,
    consentedAt: updates.training_consent_at,
  });
}
