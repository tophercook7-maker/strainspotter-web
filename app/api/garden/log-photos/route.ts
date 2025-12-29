import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST - Attach photos to a log entry
import "server-only";
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", details: "Authentication required" },
        { status: 401 }
      );
    }

    const { log_id, grow_id, paths } = body;

    // Support both single path and array of paths
    const pathsArray = Array.isArray(paths) ? paths : paths ? [paths] : [];

    if (!log_id) {
      return NextResponse.json(
        { error: "missing_fields", details: "log_id is required" },
        { status: 400 }
      );
    }

    if (!grow_id) {
      return NextResponse.json(
        { error: "missing_fields", details: "grow_id is required" },
        { status: 400 }
      );
    }

    if (pathsArray.length === 0) {
      return NextResponse.json(
        { error: "missing_fields", details: "paths (array or single path) is required" },
        { status: 400 }
      );
    }

    // Verify log belongs to user
    const { data: log, error: logError } = await supabase
      .from("grow_logs")
      .select("id, user_id, grow_id")
      .eq("id", log_id)
      .eq("user_id", user.id)
      .single();

    if (logError || !log) {
      return NextResponse.json(
        { error: "log_not_found", details: "Log entry not found or access denied" },
        { status: 404 }
      );
    }

    // Verify grow_id matches
    if (log.grow_id !== grow_id) {
      return NextResponse.json(
        { error: "invalid_request", details: "grow_id does not match log's grow_id" },
        { status: 400 }
      );
    }

    // Insert photo records
    const photoRecords = pathsArray.map((path: string) => ({
      log_id,
      grow_id,
      user_id: user.id,
      path,
    }));

    const { data, error: dbError } = await supabase
      .from("log_photos")
      .insert(photoRecords)
      .select("*");

    if (dbError) {
      console.error("CREATE LOG PHOTOS ERROR:", dbError);
      return NextResponse.json(
        { error: "database_error", details: dbError.message },
        { status: 500 }
      );
    }

    // Transform to include URLs
    const photos = (data || []).map((photo: any) => ({
      id: photo.id,
      path: photo.path,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/grow-logs/${photo.path}`,
      created_at: photo.created_at,
    }));

    return NextResponse.json({ photos });
  } catch (err: any) {
    console.error("CREATE LOG PHOTOS ERROR:", err);
    return NextResponse.json(
      { error: "server_error", details: err.message },
      { status: 500 }
    );
  }
}
