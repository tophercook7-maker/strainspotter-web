import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

/**
 * POST /api/admin/desktop/whitelist
 * Add user to desktop whitelist (admin only)
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
    const { user_id, notes } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Add to whitelist
    const { data, error } = await supabaseAdmin
      .from('desktop_whitelist')
      .upsert({
        user_id,
        added_by: user.id,
        notes: notes || null,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding to whitelist:", error);
      return NextResponse.json(
        { error: "Failed to add to whitelist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      whitelist_entry: data,
    });
  } catch (error: any) {
    console.error("Error in whitelist route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/desktop/whitelist
 * Remove user from desktop whitelist (admin only)
 */
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Remove from whitelist
    const { error } = await supabaseAdmin
      .from('desktop_whitelist')
      .delete()
      .eq('user_id', user_id);

    if (error) {
      console.error("Error removing from whitelist:", error);
      return NextResponse.json(
        { error: "Failed to remove from whitelist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in whitelist delete route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/desktop/whitelist
 * List all whitelisted users (admin only)
 */
export async function GET(req: NextRequest) {
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

    // Get all whitelisted users
    const { data, error } = await supabaseAdmin
      .from('desktop_whitelist')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      console.error("Error fetching whitelist:", error);
      return NextResponse.json(
        { error: "Failed to fetch whitelist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ whitelist: data || [] });
  } catch (error: any) {
    console.error("Error in whitelist get route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
