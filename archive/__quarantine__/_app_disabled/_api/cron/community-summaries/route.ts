import { NextRequest, NextResponse } from "next/server";

import "server-only";
/**
 * Cron endpoint for generating weekly community summaries
 * 
 * This endpoint can be called by:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron services
 * 
 * To protect this endpoint, you can add authentication:
 * - Check for a secret token in headers
 * - Use Vercel Cron's built-in auth
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check kill switch
    if (process.env.COMMUNITY_INTELLIGENCE_ENABLED === 'false') {
      return NextResponse.json({
        message: "Community Intelligence is disabled",
        enabled: false
      });
    }

    // Community summary generation not available in web repo
    return NextResponse.json({
      success: false,
      message: "Community summary generation not available in web repo",
      error: "Backend cron code not included in web repository"
    });
  } catch (error: any) {
    console.error("Error generating community summaries:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error"
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(req: NextRequest) {
  return GET(req);
}
