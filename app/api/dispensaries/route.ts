export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const query = `
    [out:json];
    (
      node["shop"="cannabis"](around:25000,${lat},${lng});
      way["shop"="cannabis"](around:25000,${lat},${lng});
      relation["shop"="cannabis"](around:25000,${lat},${lng});
    );
    out center tags;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Overpass request failed" }, { status: 502 });
    }

    const data = await res.json();

    const dispensaries =
      data.elements?.map((el: any) => ({
        id: el.id,
        name: el.tags?.name ?? "Unnamed Dispensary",
        address: [
          el.tags?.["addr:housenumber"],
          el.tags?.["addr:street"],
          el.tags?.["addr:city"],
          el.tags?.["addr:state"],
        ]
          .filter(Boolean)
          .join(" "),
      })) ?? [];

    return NextResponse.json({ dispensaries });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

