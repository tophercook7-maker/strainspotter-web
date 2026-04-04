"use client";

import { useState, useEffect } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import NearMeIcon from "@mui/icons-material/NearMe";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

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
function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

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

// ─── Radius Options ──────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100];

export default function DispensariesPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"overpass" | "local" | null>(null);

  // Get user location
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
      (err) => {
        setLocationError("Location access denied. Showing Arkansas dispensaries.");
        loadFallback();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fetch from Overpass API
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
        // No results from Overpass, fall back to local data
        loadFallbackWithDistance(lat, lng);
      }
    } catch (err) {
      loadFallbackWithDistance(lat, lng);
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackWithDistance = (lat: number, lng: number) => {
    const withDist = AR_DISPENSARIES.map((d) => ({
      id: d.id,
      name: d.name,
      address: `${d.city}, AR`,
      lat: d.lat,
      lng: d.lng,
      distance: milesBetween(lat, lng, d.lat, d.lng),
    })).sort((a, b) => a.distance - b.distance);
    setDispensaries(withDist);
    setSource("local");
    setLoading(false);
  };

  const loadFallback = () => {
    setDispensaries(
      AR_DISPENSARIES.map((d) => ({
        id: d.id,
        name: d.name,
        address: `${d.city}, AR`,
        lat: d.lat,
        lng: d.lng,
      }))
    );
    setSource("local");
    setLoading(false);
  };

  // Auto-locate on mount
  useEffect(() => {
    getLocation();
  }, []);

  // Re-fetch when radius changes
  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (userLocation) {
      fetchDispensaries(userLocation.lat, userLocation.lng, r);
    }
  };

  // Filter by search
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
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <StorefrontIcon sx={{ fontSize: 28, color: "#81C784" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Dispensaries
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Find cannabis dispensaries near you. We search OpenStreetMap data to locate
              licensed dispensaries within your selected radius.
            </Typography>
          </Box>

          {/* Search bar */}
          <Box sx={{ position: "relative", mb: 2 }}>
            <SearchIcon sx={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dispensaries..."
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
                color: "white",
                fontSize: 14,
                outline: "none",
              }}
            />
          </Box>

          {/* Radius selector */}
          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, mr: 0.5 }}>
              RADIUS:
            </Typography>
            {RADIUS_OPTIONS.map((r) => (
              <ButtonBase
                key={r}
                onClick={() => handleRadiusChange(r)}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: radius === r ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
                  color: radius === r ? "#81C784" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${radius === r ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {r} mi
              </ButtonBase>
            ))}
            <ButtonBase
              onClick={getLocation}
              sx={{
                ml: "auto",
                px: 1.5,
                py: 0.5,
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <MyLocationIcon sx={{ fontSize: 14 }} /> Refresh
            </ButtonBase>
          </Box>

          {/* Location status */}
          {locationError && (
            <Box sx={{ ...glassCard({ p: 2, mb: 2, borderColor: "rgba(255,152,0,0.3)" }) }}>
              <Typography sx={{ color: "#FFB74D", fontSize: 13 }}>
                ⚠️ {locationError}
              </Typography>
            </Box>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CircularProgress sx={{ color: "rgba(255,255,255,0.5)", mb: 2 }} />
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                Finding dispensaries near you...
              </Typography>
            </Box>
          )}

          {/* Results */}
          {!loading && filtered.length === 0 && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>🏪</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, mb: 1 }}>
                No dispensaries found
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Try increasing the search radius or check a different area
              </Typography>
            </Box>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>
                  {filtered.length} Dispensar{filtered.length === 1 ? "y" : "ies"} Found
                </Typography>
                {source === "local" && (
                  <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                    Arkansas data
                  </Typography>
                )}
              </Box>

              {filtered.map((d, i) => (
                <Box
                  key={d.id || i}
                  sx={{
                    ...glassCard({ mb: 1.5, overflow: "hidden" }),
                    "&:hover": { background: "rgba(255,255,255,0.08)" },
                    transition: "background 0.2s",
                  }}
                >
                  <Box sx={{ p: 2.5, display: "flex", gap: 2 }}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: "rgba(76,175,80,0.15)",
                        border: "1px solid rgba(76,175,80,0.3)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <StorefrontIcon sx={{ fontSize: 24, color: "#81C784" }} />
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ color: "white", fontWeight: 700, fontSize: 15, mb: 0.5 }}>
                        {d.name}
                      </Typography>

                      {d.address && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }} />
                          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                            {d.address}
                          </Typography>
                        </Box>
                      )}

                      {d.openingHours && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }} />
                          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                            {d.openingHours}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                        {d.distance !== undefined && (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              borderRadius: 99,
                              background: "rgba(33,150,243,0.15)",
                              border: "1px solid rgba(33,150,243,0.3)",
                            }}
                          >
                            <NearMeIcon sx={{ fontSize: 12, color: "#64B5F6" }} />
                            <Typography sx={{ color: "#64B5F6", fontSize: 12, fontWeight: 600 }}>
                              {d.distance < 1 ? `${(d.distance * 5280).toFixed(0)} ft` : `${d.distance.toFixed(1)} mi`}
                            </Typography>
                          </Box>
                        )}

                        <ButtonBase
                          onClick={() => openDirections(d)}
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.7)",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          Directions <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </ButtonBase>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
