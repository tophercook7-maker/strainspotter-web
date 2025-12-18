import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

/**
 * GET /api/desktop/check-access
 * Check if user has access to desktop app
 * 
 * Access control methods:
 * 1. Whitelist: Check if user_id is in desktop_whitelist table
 * 2. Feature flag: Check if user has desktop_access feature flag in profile
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { 
          authorized: false, 
          reason: "not_authenticated",
          message: "Please sign in to access the desktop app."
        },
        { status: 401 }
      );
    }

    // Check if desktop access is globally enabled
    const desktopEnabled = process.env.DESKTOP_ACCESS_ENABLED !== 'false';
    if (!desktopEnabled) {
      return NextResponse.json({
        authorized: false,
        reason: "disabled",
        message: "Desktop access is currently disabled."
      });
    }

    // Method 1: Check whitelist (if table exists)
    if (!supabaseAdmin) {
      return NextResponse.json({ authorized: false, reason: 'database_unavailable' }, { status: 503 });
    }
    try {
      const { data: whitelistEntry } = await supabaseAdmin
        .from('desktop_whitelist')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (whitelistEntry) {
        return NextResponse.json({
          authorized: true,
          method: "whitelist",
          version: process.env.DESKTOP_VERSION || "DESKTOP_TEST_v1"
        });
      }
    } catch (error) {
      // Whitelist table doesn't exist or error - continue to feature flag check
    }

    // Method 2: Check feature flag in profile
    try {
      const { data: profile } = await supabaseAdmin
        ?.from('profiles')
        .select('desktop_access')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .single();

      if (profile?.desktop_access === true) {
        return NextResponse.json({
          authorized: true,
          method: "feature_flag",
          version: process.env.DESKTOP_VERSION || "DESKTOP_TEST_v1"
        });
      }
    } catch (error) {
      // Profile check failed - continue
    }

    // Not authorized
    return NextResponse.json(
      {
        authorized: false,
        reason: "not_whitelisted",
        message: "Desktop access is currently in private testing. If you believe you should have access, please contact support."
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("Error checking desktop access:", error);
    return NextResponse.json(
      {
        authorized: false,
        reason: "error",
        message: "An error occurred while checking access."
      },
      { status: 500 }
    );
  }
}
