import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// DELETE - Delete a photo
import "server-only";
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServer();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Get photo to verify ownership and get path for storage cleanup
    const { data: photo, error: fetchError } = await supabase
      .from("log_photos")
      .select("id, user_id, path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: "photo_not_found", details: "Photo not found or access denied" },
        { status: 404 }
      );
    }

    // Delete from storage (best-effort, don't fail if storage delete fails)
    try {
      const pathParts = photo.path.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const folderPath = pathParts.slice(0, -1).join("/");
      
      await supabase.storage
        .from("grow-logs")
        .remove([photo.path]);
    } catch (storageError) {
      console.warn("Storage delete failed (non-blocking):", storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("log_photos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (dbError) {
      console.error("DELETE LOG PHOTO ERROR:", dbError);
      return NextResponse.json(
        { error: "database_error", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE LOG PHOTO ERROR:", err);
    return NextResponse.json(
      { error: "server_error", details: err.message },
      { status: 500 }
    );
  }
}
