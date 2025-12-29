import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// GET /api/community/intelligence-settings
// Get user's intelligence preferences
import "server-only";
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      // Return defaults for unauthenticated users
      return NextResponse.json({
        enabled: true,
        weekly_summaries: true,
        pattern_signals: true,
        what_you_missed: true,
      });
    }

    const supabase = await createSupabaseServer();
    
    // Get user preferences from profiles table (add intelligence_preferences JSONB column)
    const { data: profile } = await supabase
      .from("profiles")
      .select("intelligence_preferences")
      .eq("id", user.id)
      .single();

    const prefs = profile?.intelligence_preferences || {};
    
    return NextResponse.json({
      enabled: prefs.enabled !== false, // Default true
      weekly_summaries: prefs.weekly_summaries !== false,
      pattern_signals: prefs.pattern_signals !== false,
      what_you_missed: prefs.what_you_missed !== false,
    });
  } catch (err: any) {
    console.error("Error in GET /api/community/intelligence-settings:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/community/intelligence-settings
// Update user's intelligence preferences
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, weekly_summaries, pattern_signals, what_you_missed } = body;

    const supabase = await createSupabaseServer();
    
    // Update preferences in profiles table
    const { error } = await supabase
      .from("profiles")
      .update({
        intelligence_preferences: {
          enabled: enabled !== false,
          weekly_summaries: weekly_summaries !== false,
          pattern_signals: pattern_signals !== false,
          what_you_missed: what_you_missed !== false,
        },
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating intelligence preferences:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in POST /api/community/intelligence-settings:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
