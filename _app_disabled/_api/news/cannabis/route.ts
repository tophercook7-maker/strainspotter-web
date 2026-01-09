import { NextResponse } from "next/server";
import { fetchCannabisNews } from "@/lib/news/fetchCannabisNews";

import "server-only";
/**
 * GET /api/news/cannabis
 * Returns latest cannabis industry news articles
 * No auth required - read-only public feed
 */
export async function GET() {
  try {
    const articles = await fetchCannabisNews();
    
    return NextResponse.json({
      articles,
      count: articles.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15 minutes cache
      },
    });
  } catch (error) {
    console.error('Error in news API:', error);
    
    // Return empty array on error (graceful degradation)
    return NextResponse.json({
      articles: [],
      count: 0,
    }, {
      status: 200, // Still return 200 to not break UI
    });
  }
}
