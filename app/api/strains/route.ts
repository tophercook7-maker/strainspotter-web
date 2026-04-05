// app/api/strains/route.ts
// Server-side API route to query Supabase strains table
// Supports: search, filter by type, pagination, popular strains

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";         // Indica, Sativa, Hybrid
  const sort = searchParams.get("sort") || "popular";  // popular, name, newest
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from("strains")
      .select("id, name, slug, type, description, effects, flavors, thc, cbd, indica_percentage, sativa_percentage, image_url, popularity, confidence", { count: "exact" });

    // Search filter
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    // Type filter
    if (type && ["Indica", "Sativa", "Hybrid"].includes(type)) {
      query = query.eq("type", type);
    }

    // Sort
    if (sort === "popular") {
      query = query.order("popularity", { ascending: false }).order("name");
    } else if (sort === "name") {
      query = query.order("name");
    } else if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Strains query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse JSON strings for effects/flavors
    const strains = (data || []).map((s: any) => ({
      ...s,
      effects: typeof s.effects === "string" ? JSON.parse(s.effects || "[]") : (s.effects || []),
      flavors: typeof s.flavors === "string" ? JSON.parse(s.flavors || "[]") : (s.flavors || []),
    }));

    return NextResponse.json({
      strains,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error("Strains API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
