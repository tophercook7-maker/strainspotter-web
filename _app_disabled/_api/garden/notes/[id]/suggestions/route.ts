import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import "server-only";
/**
 * GET /api/garden/notes/[id]/suggestions
 * Get AI suggestions for a note (conversions, related notes)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Get the note
    const { data: note, error: noteError } = await supabase
      .from("grow_notes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: "note not found" }, { status: 404 });
    }

    const suggestions: any[] = [];

    // Check if note content suggests it could be a task
    const contentLower = note.content.toLowerCase();
    const taskKeywords = ["todo", "need to", "should", "must", "remind", "check", "adjust", "monitor"];
    const hasTaskKeywords = taskKeywords.some(keyword => contentLower.includes(keyword));

    if (hasTaskKeywords) {
      suggestions.push({
        type: "convert_to_task",
        title: "Convert to Task",
        description: "This note might work better as a task",
        action: "convert_task",
      });
    }

    // Check if note content suggests it could be a logbook entry
    const logbookKeywords = ["today", "observed", "noticed", "growth", "stage", "fed", "watered", "checked"];
    const hasLogbookKeywords = logbookKeywords.some(keyword => contentLower.includes(keyword));

    if (hasLogbookKeywords) {
      suggestions.push({
        type: "convert_to_logbook",
        title: "Convert to Logbook Entry",
        description: "This note could be saved as a logbook entry",
        action: "convert_logbook",
      });
    }

    // Find related notes (same keywords or related plant)
    if (note.related_plant_id) {
      const { data: relatedNotes } = await supabase
        .from("grow_notes")
        .select("id, content, created_at")
        .eq("user_id", user.id)
        .eq("related_plant_id", note.related_plant_id)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (relatedNotes && relatedNotes.length > 0) {
        suggestions.push({
          type: "related_notes",
          title: "Related Notes",
          description: `Found ${relatedNotes.length} note${relatedNotes.length !== 1 ? 's' : ''} for this plant`,
          related_notes: relatedNotes.map((n: any) => ({
            id: n.id,
            preview: n.content.substring(0, 100),
            created_at: n.created_at,
          })),
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error("GET NOTE SUGGESTIONS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
