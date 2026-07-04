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

  // Overpass etiquette: identify yourself. The main instance started 406ing
  // UA-less requests (which crashed this route with an unhandled HTML parse).
  // Try mirrors in order; any total failure returns an EMPTY list with 200 so
  // the client can fall back to its local data instead of a dead page.
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let json: { elements?: unknown[] } | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "StrainSpotter/1.0 (+https://strainspotter.app)",
        },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 86400 }, // cache 24h
      });
      if (!res.ok) continue;
      json = (await res.json()) as { elements?: unknown[] };
      break;
    } catch {
      continue; // mirror down / timeout / non-JSON — try the next one
    }
  }
  if (!json || !Array.isArray(json.elements)) {
    return NextResponse.json({ dispensaries: [] });
  }

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
