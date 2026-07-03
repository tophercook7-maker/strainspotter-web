// app/api/b2b/menu/route.ts — a dispensary manages its published menu.
//
// GET    — my menu items (dispensary/processor business profiles only).
// POST   — add item { strainName, category?, price?, thc?, inStock? } or
//          update item { id, ...fields }. Strain names are resolved to the
//          10k catalog via the scanner's label matcher at write time — that
//          link powers "scan a strain → who carries it".
// DELETE — ?id=<uuid> remove an item.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBusinessProfile, cleanText, isUuid } from "@/lib/b2b/server";
import { matchLabelToCatalog } from "@/lib/scanner/labelMatch";
import { logger } from "@/lib/observability/log";

const CATEGORIES = ["flower", "preroll", "vape", "edible", "concentrate", "other"] as const;
const MENU_ROLES = new Set(["dispensary", "processor"]);
const MAX_ITEMS = 300;

const ITEM_COLUMNS = "id, strain_name, strain_slug, category, price, thc, in_stock, updated_at";

async function requireMenuProfile(userId: string) {
  const me = await getBusinessProfile(userId);
  if (!me) return { error: "Create a business profile first.", code: "no_business_profile", status: 403 as const };
  if (!MENU_ROLES.has(me.role ?? "")) {
    return { error: "Menus are for dispensary and processor profiles.", code: "wrong_role", status: 403 as const };
  }
  return { me };
}

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;
  try {
    const check = await requireMenuProfile(gate.userId);
    if ("error" in check) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });

    const { data, error } = await getSupabaseAdmin()
      .from("dispensary_menu_items")
      .select(ITEM_COLUMNS)
      .eq("profile_id", check.me.id)
      .order("updated_at", { ascending: false })
      .limit(MAX_ITEMS);
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/b2b/menu" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const check = await requireMenuProfile(gate.userId);
    if ("error" in check) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });
    const admin = getSupabaseAdmin();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.strainName !== undefined) {
      const name = cleanText(body.strainName, 120);
      if (!name) return NextResponse.json({ error: "strainName is required" }, { status: 400 });
      patch.strain_name = name;
      // Catalog link — the whole point. Confident matches only (≥0.9), so a
      // typo'd menu entry never claims the wrong strain's reverse lookups.
      const match = matchLabelToCatalog(name);
      patch.strain_slug = match && match.score >= 0.9 ? match.strain.slug : null;
    }
    if (body.category !== undefined) {
      patch.category =
        typeof body.category === "string" && (CATEGORIES as readonly string[]).includes(body.category)
          ? body.category
          : "flower";
    }
    if (body.price !== undefined) patch.price = cleanText(body.price, 40);
    if (body.thc !== undefined) patch.thc = cleanText(body.thc, 40);
    if (body.inStock !== undefined) patch.in_stock = body.inStock !== false;

    // Update path
    if (body.id !== undefined) {
      if (!isUuid(body.id)) return NextResponse.json({ error: "id must be a uuid" }, { status: 400 });
      const { data, error } = await admin
        .from("dispensary_menu_items")
        .update(patch)
        .eq("id", body.id)
        .eq("profile_id", check.me.id) // ownership — can only edit your own menu
        .select(ITEM_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, item: data });
    }

    // Insert path
    if (!patch.strain_name) {
      return NextResponse.json({ error: "strainName is required" }, { status: 400 });
    }
    const { count } = await admin
      .from("dispensary_menu_items")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", check.me.id);
    if ((count ?? 0) >= MAX_ITEMS) {
      return NextResponse.json({ error: `Menu is at the ${MAX_ITEMS}-item limit.` }, { status: 400 });
    }

    const { data, error } = await admin
      .from("dispensary_menu_items")
      .insert({ profile_id: check.me.id, ...patch })
      .select(ITEM_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    log.info("menu_item_added", { profile: check.me.id, slug: patch.strain_slug ?? null });
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    log.error("menu_error", { user: gate.userId, err: String(e) });
    return NextResponse.json({ error: "Menu update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "id (uuid) is required" }, { status: 400 });

  try {
    const check = await requireMenuProfile(gate.userId);
    if ("error" in check) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });

    const { error } = await getSupabaseAdmin()
      .from("dispensary_menu_items")
      .delete()
      .eq("id", id)
      .eq("profile_id", check.me.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
