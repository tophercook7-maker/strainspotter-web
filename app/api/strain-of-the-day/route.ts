// app/api/strain-of-the-day/route.ts
// Deterministic "Strain of the Day" — the Garden hub fetches this for its
// daily-feature card. Picks one strain per calendar day (UTC) from a pool of
// popular, described strains so the choice is stable all day and rotates fresh.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache at the edge for an hour; the pick only changes at the UTC day boundary.
export const revalidate = 3600;

export async function GET() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const dayIndex = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);

  try {
    // A stable pool of well-described, popular strains to rotate through.
    const { data, error } = await supabase
      .from("strains")
      .select("name, type, description, effects, flavors, thc, cbd")
      .not("description", "is", null)
      .order("popularity", { ascending: false })
      .order("name", { ascending: true })
      .limit(300);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ strain: null, date }, { status: 200 });
    }

    const pick: any = data[dayIndex % data.length];
    const parseArr = (v: any) =>
      typeof v === "string" ? (() => { try { return JSON.parse(v || "[]"); } catch { return []; } })() : (v || []);

    const strain = {
      name: pick.name,
      type: pick.type || "Hybrid",
      description: pick.description || "",
      effects: parseArr(pick.effects),
      flavors: parseArr(pick.flavors),
      thc: pick.thc ?? null,
      cbd: pick.cbd ?? null,
    };

    return NextResponse.json({ strain, date }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ strain: null, date, error: "failed" }, { status: 200 });
  }
}
