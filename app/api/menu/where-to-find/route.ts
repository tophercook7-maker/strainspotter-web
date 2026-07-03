// app/api/menu/where-to-find/route.ts — the reverse lookup the menus exist
// for: given a strain slug (from a scan result or the library), which
// directory-listed dispensaries on StrainSpotter carry it right now?
//
// Subscriber-gated like the scanner (it renders on scan results). Only
// directory-opted-in dispensary profiles appear, and only public-card fields —
// never contact info.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const slug = new URL(req.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: items, error } = await admin
      .from("dispensary_menu_items")
      .select("profile_id, strain_name, category, price, thc, updated_at")
      .eq("strain_slug", slug)
      .eq("in_stock", true)
      .limit(100);
    if (error) throw new Error(error.message);
    if (!items?.length) return NextResponse.json({ carriers: [] });

    const profileIds = [...new Set(items.map((i) => i.profile_id))];
    const { data: profiles, error: profErr } = await admin
      .from("business_profiles")
      .select("id, business_name, region, verified")
      .in("id", profileIds)
      .eq("directory_opt_in", true)
      .eq("role", "dispensary");
    if (profErr) throw new Error(profErr.message);

    const carriers = (profiles ?? []).map((p) => ({
      profileId: p.id,
      businessName: p.business_name,
      region: p.region,
      verified: p.verified === true,
      items: items
        .filter((i) => i.profile_id === p.id)
        .map((i) => ({ name: i.strain_name, category: i.category, price: i.price, thc: i.thc })),
    }));

    return NextResponse.json({ carriers });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
