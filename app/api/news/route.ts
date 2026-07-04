// app/api/news/route.ts — cannabis news, topic-filterable.
// GET /api/news?topic=policy|business|growing|science|arkansas&limit=8
// Public (news is news); feed fetches are cached ~30 min.

import { NextRequest, NextResponse } from "next/server";
import { fetchAllNews } from "@/lib/news/feeds";

export const revalidate = 1800;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic");
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? 8)));

    let items = await fetchAllNews();
    if (topic) {
      const filtered = items.filter((i) => i.topics.includes(topic));
      // a thin topic (e.g. arkansas on a slow week) falls back to general news
      items = filtered.length >= 3 ? filtered : [...filtered, ...items.filter((i) => !filtered.includes(i))];
    }
    return NextResponse.json({ items: items.slice(0, limit) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
