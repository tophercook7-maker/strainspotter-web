// app/api/b2b/connections/route.ts — list the caller's connections.
//
// Returns incoming + outgoing requests with the other party's public card.
// Contact info (email/phone) is included ONLY on accepted connections — this
// is the mutual-consent contact exchange, mirroring get_connection_contact().

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBusinessProfile } from "@/lib/b2b/server";

interface WireConnection {
  id: string;
  direction: "incoming" | "outgoing";
  status: string;
  message: string | null;
  createdAt: string;
  threadId: string | null;
  other: {
    profileId: string;
    businessName: string | null;
    role: string | null;
    region: string | null;
    verified: boolean;
  };
  contact: { email: string | null; phone: string | null } | null;
}

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  try {
    const me = await getBusinessProfile(gate.userId);
    if (!me) {
      return NextResponse.json(
        { error: "Create a business profile first.", code: "no_business_profile" },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin
      .from("connection_requests")
      .select("id, from_profile, to_profile, message, status, created_at, thread_id")
      .or(`from_profile.eq.${me.id},to_profile.eq.${me.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const otherIds = [
      ...new Set(
        (rows ?? []).map((r) => (r.from_profile === me.id ? r.to_profile : r.from_profile))
      ),
    ];
    const profilesById = new Map<string, Record<string, unknown>>();
    if (otherIds.length) {
      const { data: others, error: othersErr } = await admin
        .from("business_profiles")
        .select("id, business_name, role, region, verified, contact_email, contact_phone")
        .in("id", otherIds);
      if (othersErr) throw new Error(othersErr.message);
      for (const p of others ?? []) profilesById.set(p.id as string, p);
    }

    const connections: WireConnection[] = (rows ?? []).map((r) => {
      const direction = r.from_profile === me.id ? "outgoing" : "incoming";
      const otherId = direction === "outgoing" ? r.to_profile : r.from_profile;
      const other = profilesById.get(otherId) ?? {};
      return {
        id: r.id,
        direction,
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
        threadId: r.thread_id ?? null,
        other: {
          profileId: otherId,
          businessName: (other.business_name as string) ?? null,
          role: (other.role as string) ?? null,
          region: (other.region as string) ?? null,
          verified: other.verified === true,
        },
        // Mutual-consent gate: contact only flows on accepted connections.
        contact:
          r.status === "accepted"
            ? {
                email: (other.contact_email as string) ?? null,
                phone: (other.contact_phone as string) ?? null,
              }
            : null,
      };
    });

    return NextResponse.json({ connections, myProfileId: me.id });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }
}
