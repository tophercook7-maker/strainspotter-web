import { NextResponse } from "next/server";
import { classifyDispensary, type DispensaryKind } from "@/lib/dispensaries";

// Nearby dispensaries via OpenStreetMap Overpass (free, no key). Also matches
// amenity=dispensary variants some mappers use. Returns coordinates (nodes
// carry lat/lon directly; ways/relations via `out center`) — the client sorts
// by distance and builds directions links from these.

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
      node["amenity"="dispensary"](around:${radiusMeters},${lat},${lng});
      way["amenity"="dispensary"](around:${radiusMeters},${lat},${lng});
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

  const seen = new Set<string>();
  const dispensaries = (json.elements as any[])
    .map((el: any) => {
      // Nodes have lat/lon at the top level; ways/relations expose a centroid
      // under `center` when the query uses `out center`.
      const elLat = el.lat ?? el.center?.lat ?? null;
      const elLng = el.lon ?? el.center?.lon ?? null;
      return {
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
        lat: elLat,
        lng: elLng,
        kind: classifyDispensary(el.tags) as DispensaryKind,
        openingHours: el.tags?.opening_hours ?? null,
        website: el.tags?.website ?? el.tags?.["contact:website"] ?? null,
        phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? null,
      };
    })
    // Same shop can match both selectors or appear as node+way — dedupe by
    // name+rounded location.
    .filter((d) => {
      const key = `${d.name}|${d.lat?.toFixed?.(3)}|${d.lng?.toFixed?.(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return NextResponse.json({ dispensaries });
}
