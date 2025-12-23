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
      // Try both table names (grows vs gardens system)
      let logbook: any[] = [];
      
      // Check if this is a grow_id (grows system)
      const { data: growCheck } = await supabase
        .from("grows")
        .select("id")
        .eq("id", garden_id)
        .eq("user_id", user.id)
        .single();
      
      if (growCheck) {
        // Use grow_logs table
        const { data: growLogs } = await supabase
          .from("grow_logs")
          .select("*")
          .eq("grow_id", garden_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        logbook = growLogs || [];
      } else {
        // Use garden_logbook_entries table
        const { data: gardenLogs } = await supabase
          .from("garden_logbook_entries")
          .select("*")
          .eq("garden_id", garden_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        logbook = gardenLogs || [];
      }
      
      context.logbook = (logbook || []).map((l: any) => {
        const entry: any = {
          created_at: l.created_at,
          text: l.note || l.text || l.content,
          stage: l.stage,
        };
        
        // Include source metadata if available (for Coach context)
        if (l.source_metadata && l.source_metadata.source_type === "community") {
          entry.source_metadata = l.source_metadata;
          // Add context hint for Coach
          if (l.source_metadata.source_title) {
            entry.community_context = `This entry was saved from a Community discussion: "${l.source_metadata.source_title}"`;
          }
        }
        
        return entry;
      });
    }

    // A) Active garden/plant context (already gathered above)
    
    // B) Recent grow notes (last 5-10)
    try {
      const { data: growNotes } = await supabase
        .from("grow_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      context.grow_notes = (growNotes || []).map((n: any) => ({
        created_at: n.created_at,
        content: n.content,
        source: n.source,
      }));
    } catch (err) {
      // Table might not exist, fail silently
      context.grow_notes = [];
    }

    // C) Open tasks (up to 10) - already gathered above, but ensure limit
    if (context.tasks && context.tasks.length > 10) {
      context.tasks = context.tasks.slice(0, 10);
    }

    // D) Last scan result (if exists)
    try {
      const { data: lastScan } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "processed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (lastScan) {
        context.last_scan = {
          scan_type: lastScan.scan_type,
          created_at: lastScan.created_at,
          vision: lastScan.vision,
          enrichment: lastScan.enrichment,
          match_result: lastScan.match_result,
        };
      }
    } catch (err) {
      // No scan found or error, fail silently
      context.last_scan = null;
    }

    // E) Recent "issue" entries (logbook entries with keywords)
    if (context.logbook) {
      const issueKeywords = ['problem', 'issue', 'yellow', 'droop', 'spot', 'pest', 'mold', 'deficiency', 'burn', 'stress'];
      context.recent_issues = context.logbook.filter((entry: any) => {
        const text = (entry.text || '').toLowerCase();
        return issueKeywords.some(keyword => text.includes(keyword));
      }).slice(0, 5);
    }

    // Generate coach response
    const coach = await generateCoachInsights(context, message);

    // Format response in locked structure
    const sections: string[] = [];

    // 1) "What I'm seeing" (2-3 bullets)
    if (coach.seeing && coach.seeing.length > 0) {
      sections.push("What I'm seeing\n" + coach.seeing.map((s) => `• ${s}`).join("\n"));
    } else {
      sections.push("What I'm seeing\n• I don't have enough data about your garden yet.");
    }

    // 2) "Why I think this" (2-4 bullets referencing data)
    if (coach.reasoning && coach.reasoning.length > 0) {
      sections.push("Why I think this\n" + coach.reasoning.map((r) => `• ${r}`).join("\n"));
    } else {
      sections.push("Why I think this\n• Based on the data you've shared, I'm making these observations.");
    }

    // 3) "Do next" (ONE clear action)
    if (coach.action) {
      sections.push("Do next\n" + coach.action);
    } else {
      sections.push("Do next\nContinue monitoring your plants and log any changes.");
    }

    // 4) "If you want, tell me" (ONE optional question)
    if (coach.question) {
      sections.push("If you want, tell me\n" + coach.question);
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
