import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateCoachInsights } from "@/lib/ai/coach";

// POST - Get AI coach insights for garden (all content types)
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const payload = await req.json();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", details: "Authentication required" },
        { status: 401 }
      );
    }

    const { garden_id, message, include } = payload as {
      garden_id?: string;
      message?: string;
      include?: {
        summary?: boolean;
        plants?: boolean;
        tasks?: boolean;
        environment?: boolean;
        logbook?: boolean;
      };
    };

    if (!garden_id) {
      return NextResponse.json(
        { error: "missing_fields", details: "garden_id required" },
        { status: 400 }
      );
    }

    // Default: include all if not specified
    const includeFlags = include || {
      summary: true,
      plants: true,
      tasks: true,
      environment: true,
      logbook: true,
    };

    // Fetch garden
    const { data: garden, error: gardenError } = await supabase
      .from("gardens")
      .select("*")
      .eq("id", garden_id)
      .eq("user_id", user.id)
      .single();

    if (gardenError || !garden) {
      return NextResponse.json(
        { error: "grow_not_found", details: "Garden not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch selected content types
    const context: any = {
      garden: {
        id: garden.id,
        name: garden.name,
        created_at: garden.created_at,
      },
    };

    if (includeFlags.plants) {
      const { data: plants } = await supabase
        .from("garden_plants")
        .select("*")
        .eq("garden_id", garden_id)
        .order("created_at", { ascending: false });
      context.plants = (plants || []).map((p: any) => ({
        strain_name: p.strain_name,
        stage: p.stage,
        started_at: p.started_at,
        notes: p.notes,
      }));
    }

    if (includeFlags.tasks) {
      const { data: tasks } = await supabase
        .from("garden_tasks")
        .select("*")
        .eq("garden_id", garden_id)
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      context.tasks = (tasks || []).map((t: any) => ({
        title: t.title,
        due_at: t.due_at,
        created_at: t.created_at,
      }));
    }

    if (includeFlags.environment) {
      const { data: envLogs } = await supabase
        .from("garden_environment_logs")
        .select("*")
        .eq("garden_id", garden_id)
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(20);
      context.environment = (envLogs || []).map((e: any) => ({
        logged_at: e.logged_at,
        temperature: e.temperature,
        humidity: e.humidity,
        vpd: e.vpd,
        notes: e.notes,
      }));
    }

    if (includeFlags.logbook) {
      const { data: logbook } = await supabase
        .from("garden_logbook_entries")
        .select("*")
        .eq("garden_id", garden_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      context.logbook = (logbook || []).map((l: any) => ({
        created_at: l.created_at,
        entry_type: l.entry_type,
        text: l.text,
        related_plant_id: l.related_plant_id,
      }));
    }

    // Generate coach response
    const coach = await generateCoachInsights(context, message);

    // Format response
    const sections: string[] = [];

    if (coach.insights && coach.insights.length > 0) {
      sections.push("Current Status\n--------------\n" + coach.insights[0]);
      if (coach.insights.length > 1) {
        sections.push(
          "Observations\n------------\n" +
            coach.insights.slice(1).map((o) => `- ${o}`).join("\n")
        );
      }
    } else {
      sections.push("Current Status\n--------------\nCoach is reviewing your garden data.");
    }

    if (coach.actions && coach.actions.length > 0) {
      sections.push(
        "Suggestions\n-----------\n" +
          coach.actions
            .map((s) => (s.startsWith("You") ? `- ${s}` : `- You may want to consider: ${s}`))
            .join("\n")
      );
    } else {
      sections.push(
        "Suggestions\n-----------\nYou may want to consider adding more data to get better insights."
      );
    }

    const responseText = sections.join("\n\n");

    return new NextResponse(responseText || "Coach unavailable right now.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("COACH ERROR:", err);
    return new NextResponse("Coach unavailable right now.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
