import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusMiles = Number(searchParams.get("radius") ?? 15);

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing coordinates" },
      { status: 400 }
    );
  }

  const radiusMeters = radiusMiles * 1609.34;

  const query = `
    [out:json];
    (
      node["shop"="cannabis"](around:${radiusMeters},${lat},${lng});
      way["shop"="cannabis"](around:${radiusMeters},${lat},${lng});
      relation["shop"="cannabis"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "text/plain" },
    next: { revalidate: 86400 }, // cache 24h
  });

  const json = await res.json();

  const dispensaries = json.elements.map((el: any) => ({
    id: el.id,
    name: el.tags?.name ?? "Cannabis Dispensary",
    address: [
      el.tags?.["addr:housenumber"],
      el.tags?.["addr:street"],
      el.tags?.["addr:city"],
      el.tags?.["addr:state"],
    ]
      .filter(Boolean)
      .join(" "),
    openingHours: el.tags?.opening_hours ?? null,
  }));

  return NextResponse.json({ dispensaries });
}

