import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

/**
 * POST /api/admin/desktop/feature-flag
 * Enable/disable desktop access feature flag for a user (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, enabled } = body;

    if (!user_id || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: "user_id and enabled (boolean) are required" },
        { status: 400 }
      );
    }

    // Update feature flag
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ desktop_access: enabled })
      .or(`user_id.eq.${user_id},id.eq.${user_id}`)
      .select()
      .single();

    if (error) {
      console.error("Error updating feature flag:", error);
      return NextResponse.json(
        { error: "Failed to update feature flag" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error: any) {
    console.error("Error in feature flag route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
