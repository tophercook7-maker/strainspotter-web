export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing location" }, { status: 400 });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "Google API key missing" }, { status: 500 });
    }

    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=60000` +
      `&keyword=cannabis%20dispensary` +
      `&key=${key}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: data.error_message || data.status || "Unknown error" },
        { status: 500 }
      );
    }

    const results =
      data.results
        ?.filter((p: any) => {
          const name = (p.name || "").toLowerCase();
          return (
            name.includes("cannabis") ||
            name.includes("dispensary") ||
            name.includes("marijuana")
          );
        })
        .map((p: any) => ({
          id: p.place_id,
          name: p.name,
          address: p.vicinity,
          rating: p.rating,
          openNow: p.opening_hours?.open_now ?? null,
        })) ?? [];

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

