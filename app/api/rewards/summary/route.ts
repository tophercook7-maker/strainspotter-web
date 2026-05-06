import { NextRequest, NextResponse } from "next/server";
import { getUserRewardSummary, REWARD_BADGES } from "@/lib/scanner/rewardSystem";
import { resolveFeedbackUserId } from "@/lib/server/feedbackUser";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const deviceParam = req.nextUrl.searchParams.get("deviceId");
    const userId = await resolveFeedbackUserId(req, deviceParam);

    const summary = getUserRewardSummary(userId);

    const badgesDetailed = REWARD_BADGES.filter((b) =>
      summary.badges.some((x) => x.id === b.id)
    ).map((b) => ({ id: b.id, label: b.label, minPoints: b.minPoints }));

    const recentRewards = summary.recentRewards.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      eventType: r.eventType,
      points: r.points,
      reason: r.reason,
      correctStrainSlug: r.correctStrainSlug,
    }));

    return NextResponse.json({
      ok: true,
      userId,
      totalPoints: summary.totalPoints,
      trustLevel: summary.trustLevel,
      trustWeight: summary.trustWeight,
      badges: badgesDetailed,
      recentRewards,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "summary_failed" },
      { status: 500 }
    );
  }
}
