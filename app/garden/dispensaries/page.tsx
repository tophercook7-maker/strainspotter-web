"use client";

import { useState, useEffect } from "react";
import TopNav from "../_components/TopNav";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Dispensary {
  id: string | number;
  name: string;
  address: string;
  distance?: number;
  openingHours?: string | null;
  lat?: number;
  lng?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

function milesBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Fallback AR data ────────────────────────────────────────────────────────
const AR_DISPENSARIES = [
  { id: "ar-001", name: "Good Day Farm – Little Rock", city: "Little Rock", lat: 34.7465, lng: -92.2896 },
  { id: "ar-002", name: "Natural Relief Dispensary", city: "Sherwood", lat: 34.8151, lng: -92.2243 },
  { id: "ar-003", name: "Suite 443", city: "Hot Springs", lat: 34.5037, lng: -93.0552 },
  { id: "ar-004", name: "Harvest Cannabis", city: "Conway", lat: 35.0887, lng: -92.4421 },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100];

export default function DispensariesPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"overpass" | "local" | null>(null);

  const getLocation = () => {
    setLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      loadFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        fetchDispensaries(loc.lat, loc.lng, radius);
      },
      () => {
        setLocationError("Location access denied. Showing Arkansas dispensaries.");
        loadFallback();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchDispensaries = async (lat: number, lng: number, r: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dispensaries?lat=${lat}&lng=${lng}&radius=${r}`);
      const data = await res.json();
      if (data.dispensaries && data.dispensaries.length > 0) {
        const withDist = data.dispensaries.map((d: any) => ({
          ...d,
          distance: d.lat && d.lng ? milesBetween(lat, lng, d.lat, d.lng) : undefined,
        }));
        withDist.sort((a: Dispensary, b: Dispensary) => (a.distance ?? 999) - (b.distance ?? 999));
        setDispensaries(withDist);
        setSource("overpass");
      } else {
        loadFallbackWithDistance(lat, lng);
      }
    } catch {
      loadFallbackWithDistance(lat, lng);
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackWithDistance = (lat: number, lng: number) => {
    const withDist = AR_DISPENSARIES.map((d) => ({
      id: d.id, name: d.name, address: `${d.city}, AR`, lat: d.lat, lng: d.lng,
      distance: milesBetween(lat, lng, d.lat, d.lng),
    })).sort((a, b) => a.distance - b.distance);
    setDispensaries(withDist);
    setSource("local");
    setLoading(false);
  };

  const loadFallback = () => {
    setDispensaries(
      AR_DISPENSARIES.map((d) => ({ id: d.id, name: d.name, address: `${d.city}, AR`, lat: d.lat, lng: d.lng }))
    );
    setSource("local");
    setLoading(false);
  };

  useEffect(() => { getLocation(); }, []);

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (userLocation) fetchDispensaries(userLocation.lat, userLocation.lng, r);
  };

  const filtered = dispensaries.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.address?.toLowerCase().includes(search.toLowerCase())
  );

  const openDirections = (d: Dispensary) => {
    if (d.lat && d.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(d.name + " " + d.address)}`, "_blank");
    }
  };

  return (
    <>
      <TopNav title="Dispensaries" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🏪</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Dispensaries</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Find cannabis dispensaries near you. We search OpenStreetMap data to locate
              licensed dispensaries within your selected radius.
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dispensaries..."
              style={{
                width: "100%", padding: "12px 14px 12px 42px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                color: "white", fontSize: 14, outline: "none",
              }}
            />
          </div>

          {/* Radius selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginRight: 4 }}>RADIUS:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: radius === r ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
                  color: radius === r ? "#81C784" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${radius === r ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {r} mi
              </button>
            ))}
            <button
              onClick={getLocation}
              style={{
                marginLeft: "auto", padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                display: "flex", alignItems: "center", gap: 4, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
              }}
            >
              📍 Refresh
            </button>
          </div>

          {/* Location error */}
          {locationError && (
            <div style={{ ...glass, padding: 16, marginBottom: 16, borderColor: "rgba(255,152,0,0.3)" }}>
              <span style={{ color: "#FFB74D", fontSize: 13 }}>⚠️ {locationError}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.5)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Finding dispensaries near you...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* No results */}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No dispensaries found</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Try increasing the search radius or check a different area</div>
            </div>
          )}

          {/* Results */}
          {!loading && filtered.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>
                  {filtered.length} Dispensar{filtered.length === 1 ? "y" : "ies"} Found
                </span>
                {source === "local" && (
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Arkansas data</span>
                )}
              </div>

              {filtered.map((d, i) => (
                <div key={String(d.id) || i} style={{ ...glass, marginBottom: 12, overflow: "hidden", transition: "background 0.2s" }}>
                  <div style={{ padding: 20, display: "flex", gap: 16 }}>
                    {/* Icon */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.3)",
                      display: "grid", placeItems: "center", flexShrink: 0, fontSize: 24,
                    }}>
                      🏪
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "white", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{d.name}</div>

                      {d.address && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>📍</span>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{d.address}</span>
                        </div>
                      )}

                      {d.openingHours && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>🕐</span>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{d.openingHours}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        {d.distance !== undefined && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: 99,
                            background: "rgba(33,150,243,0.15)", border: "1px solid rgba(33,150,243,0.3)",
                            color: "#64B5F6", fontSize: 12, fontWeight: 600,
                          }}>
                            📐 {d.distance < 1 ? `${(d.distance * 5280).toFixed(0)} ft` : `${d.distance.toFixed(1)} mi`}
                          </span>
                        )}

                        <button
                          onClick={() => openDirections(d)}
                          style={{
                            padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                            display: "flex", alignItems: "center", gap: 4,
                            border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                          }}
                        >
                          Directions ↗
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
