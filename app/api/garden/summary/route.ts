import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import "server-only";
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Get or create default garden
    let { data: gardens } = await supabase
      .from("gardens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    let garden = gardens && gardens.length > 0 ? gardens[0] : null;

    // Auto-create garden if none exists
    if (!garden) {
      const { data: newGarden } = await supabase
        .from("gardens")
        .insert({ user_id: user.id, name: "My Garden" })
        .select()
        .single();
      garden = newGarden;

      // Seed starter tasks
      if (garden) {
        await supabase.from("garden_tasks").insert([
          { garden_id: garden.id, user_id: user.id, title: "Log today's environment" },
          { garden_id: garden.id, user_id: user.id, title: "Add first plant/strain" },
          { garden_id: garden.id, user_id: user.id, title: "Create first logbook entry" },
        ]);
      }
    }

    if (!garden) {
      return NextResponse.json({ error: "failed to create garden" }, { status: 500 });
    }

    // Get counts and latest entries
    const [plantsRes, tasksRes, envRes, logbookRes] = await Promise.all([
      supabase
        .from("garden_plants")
        .select("id", { count: "exact" })
        .eq("garden_id", garden.id),
      supabase
        .from("garden_tasks")
        .select("id", { count: "exact" })
        .eq("garden_id", garden.id)
        .eq("status", "open"),
      supabase
        .from("garden_environment_logs")
        .select("*")
        .eq("garden_id", garden.id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("garden_logbook_entries")
        .select("*")
        .eq("garden_id", garden.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      garden: {
        id: garden.id,
        name: garden.name,
        created_at: garden.created_at,
      },
      plants_count: plantsRes.count || 0,
      open_tasks_count: tasksRes.count || 0,
      last_environment: envRes.data,
      last_logbook_entry: logbookRes.data,
    });
  } catch (err: any) {
    console.error("GET GARDEN SUMMARY ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
