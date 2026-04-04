"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SpaIcon from "@mui/icons-material/Spa";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FavoriteScan {
  id: string;
  strainName: string;
  confidence: number | null;
  savedAt: string;
  scanId?: string;
}

// ─── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = "strainspotter_favorites";

function loadFavorites(): FavoriteScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: FavoriteScan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
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

function confidenceColor(c: number | null): string {
  if (c === null) return "rgba(255,255,255,0.5)";
  if (c >= 80) return "#66BB6A";
  if (c >= 60) return "#FFA726";
  return "#EF5350";
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteScan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setFavorites(loadFavorites());
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: FavoriteScan[]) => {
    setFavorites(updated);
    saveFavorites(updated);
  }, []);

  const handleRemove = (id: string) => {
    persist(favorites.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    if (confirm("Remove all favorites?")) {
      persist([]);
    }
  };

  const filtered = favorites.filter(
    (f) =>
      !search || f.strainName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by strain name
  const grouped = filtered.reduce<Record<string, FavoriteScan[]>>((acc, fav) => {
    const key = fav.strainName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(fav);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(
    (a, b) => b[1].length - a[1].length
  );

  if (!loaded) return null;

  return (
    <>
      <TopNav title="Favorites" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <FavoriteIcon sx={{ fontSize: 28, color: "#EF5350" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Favorites
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Your saved strains and scans. Bookmark cultivars you love to build a personal
              collection and quickly reference them later.
            </Typography>
          </Box>

          {/* Empty state */}
          {favorites.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>⭐</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, mb: 1 }}>
                No favorites yet
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 14, mb: 3 }}>
                After scanning a plant, tap the heart icon to save it here
              </Typography>
              <Link href="/garden/scanner">
                <ButtonBase
                  sx={{
                    px: 3,
                    py: 1.2,
                    borderRadius: 2,
                    background: "rgba(239,83,80,0.2)",
                    color: "#EF5350",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "1px solid rgba(239,83,80,0.3)",
                  }}
                >
                  Go to Scanner
                </ButtonBase>
              </Link>
            </Box>
          ) : (
            <>
              {/* Search + Clear */}
              <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
                <Box sx={{ position: "relative", flex: 1 }}>
                  <SearchIcon sx={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search favorites..."
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 42px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </Box>
                <ButtonBase
                  onClick={handleClearAll}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Clear All
                </ButtonBase>
              </Box>

              {/* Stats */}
              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <Box sx={{ ...glassCard({ p: 2, flex: 1, textAlign: "center" }) }}>
                  <Typography sx={{ color: "#EF5350", fontSize: 28, fontWeight: 800 }}>
                    {favorites.length}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>
                    Saved
                  </Typography>
                </Box>
                <Box sx={{ ...glassCard({ p: 2, flex: 1, textAlign: "center" }) }}>
                  <Typography sx={{ color: "#66BB6A", fontSize: 28, fontWeight: 800 }}>
                    {Object.keys(grouped).length}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>
                    Strains
                  </Typography>
                </Box>
              </Box>

              {/* Grouped favorites */}
              {sortedGroups.map(([strain, items]) => (
                <Box key={strain} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <SpaIcon sx={{ fontSize: 16, color: "#66BB6A" }} />
                    <Typography sx={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                      {strain}
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      ({items.length})
                    </Typography>
                  </Box>

                  {items.map((fav) => (
                    <Box
                      key={fav.id}
                      sx={{
                        ...glassCard({ mb: 1, px: 2.5, py: 2 }),
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 20, color: "#EF5350", flexShrink: 0 }} />

                      <Box sx={{ flex: 1 }}>
                        {fav.confidence !== null && (
                          <Typography sx={{ color: confidenceColor(fav.confidence), fontSize: 13, fontWeight: 700 }}>
                            {Math.round(fav.confidence)}% confidence
                          </Typography>
                        )}
                        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                          Saved {new Date(fav.savedAt).toLocaleDateString()}
                        </Typography>
                      </Box>

                      {fav.scanId && (
                        <Link href={`/garden/history/${fav.scanId}`}>
                          <ButtonBase
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              color: "rgba(255,255,255,0.5)",
                              "&:hover": { color: "white" },
                            }}
                          >
                            <HistoryIcon sx={{ fontSize: 18 }} />
                          </ButtonBase>
                        </Link>
                      )}

                      <ButtonBase
                        onClick={() => handleRemove(fav.id)}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          color: "rgba(255,255,255,0.3)",
                          "&:hover": { color: "#EF5350" },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </ButtonBase>
                    </Box>
                  ))}
                </Box>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
