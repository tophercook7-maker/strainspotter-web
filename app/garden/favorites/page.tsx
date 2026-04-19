"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";
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
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

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
    if (confirm("Remove all favorites?")) persist([]);
  };

  const filtered = favorites.filter(
    (f) => !search || f.strainName.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, FavoriteScan[]>>((acc, fav) => {
    const key = fav.strainName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(fav);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  if (!loaded) return null;

  return (
    <>
      <TopNav title="Favorites" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>❤️</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Favorites</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Your saved strains and scans. Bookmark cultivars you love to build a personal
              collection and quickly reference them later.
            </div>
          </div>

          {/* Empty state */}
          {favorites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                No favorites yet
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                After scanning a plant, tap the heart icon to save it here
              </div>
              <Link href="/garden/scanner">
                <button style={{
                  padding: "10px 24px", borderRadius: 8,
                  background: "rgba(239,83,80,0.2)", color: "#EF5350",
                  fontWeight: 700, fontSize: 14, border: "1px solid rgba(239,83,80,0.3)", cursor: "pointer",
                }}>
                  Go to Scanner
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Search + Clear */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }}>🔍</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search favorites..."
                    style={{
                      width: "100%", padding: "10px 14px 10px 42px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                      color: "white", fontSize: 14, outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={handleClearAll}
                  style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                    fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <div style={{ ...glass, padding: 16, flex: 1, textAlign: "center" }}>
                  <div style={{ color: "#EF5350", fontSize: 28, fontWeight: 800 }}>{favorites.length}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>Saved</div>
                </div>
                <div style={{ ...glass, padding: 16, flex: 1, textAlign: "center" }}>
                  <div style={{ color: "#66BB6A", fontSize: 28, fontWeight: 800 }}>{Object.keys(grouped).length}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>Strains</div>
                </div>
              </div>

              {/* Grouped favorites */}
              {sortedGroups.map(([strain, items]) => (
                <div key={strain} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>🌿</span>
                    <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{strain}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({items.length})</span>
                  </div>

                  {items.map((fav) => (
                    <div
                      key={fav.id}
                      style={{ ...glass, marginBottom: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>❤️</span>

                      <div style={{ flex: 1 }}>
                        {fav.confidence !== null && (
                          <div style={{ color: confidenceColor(fav.confidence), fontSize: 13, fontWeight: 700 }}>
                            {Math.round(fav.confidence)}% confidence
                          </div>
                        )}
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                          Saved {new Date(fav.savedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {fav.scanId && (
                        <Link href={`/garden/history/${fav.scanId}`}>
                          <button style={{
                            padding: 8, borderRadius: 4, background: "none",
                            color: "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", fontSize: 18,
                          }}>
                            📋
                          </button>
                        </Link>
                      )}

                      <button
                        onClick={() => handleRemove(fav.id)}
                        style={{
                          padding: 8, borderRadius: 4, background: "none",
                          color: "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", fontSize: 18,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
