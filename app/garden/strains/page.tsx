"use client";

import { useState, useMemo, useEffect } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import SpaIcon from "@mui/icons-material/Spa";
import GrassIcon from "@mui/icons-material/Grass";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StrainEntry {
  name: string;
  aliases: string[];
  genetics: string;
  type: "Indica" | "Sativa" | "Hybrid";
  visualProfile: {
    trichomeDensity: string;
    pistilColor: string[];
    budStructure: string;
    leafShape: string;
    colorProfile: string;
  };
  terpeneProfile: string[];
  effects: string[];
  sources: string[];
  indicaSativaRatio?: { indica: number; sativa: number };
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

const TYPE_COLORS: Record<string, string> = {
  Indica: "#9b59b6",
  Sativa: "#e67e22",
  Hybrid: "#2ecc71",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Indica: <SpaIcon fontSize="small" />,
  Sativa: <GrassIcon fontSize="small" />,
  Hybrid: <LocalFloristIcon fontSize="small" />,
};

const TERPENE_COLORS: Record<string, string> = {
  myrcene: "#a8e6cf",
  limonene: "#ffd93d",
  caryophyllene: "#ff8b94",
  pinene: "#6bcb77",
  linalool: "#c9b1ff",
  terpinolene: "#ffc09f",
  humulene: "#d4a574",
  ocimene: "#89CFF0",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function StrainsPage() {
  const [strains, setStrains] = useState<StrainEntry[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load strains from JSON
  useEffect(() => {
    async function load() {
      try {
        // Try loading from data endpoint
        const res = await fetch("/data/strains.json");
        if (res.ok) {
          const data = await res.json();
          setStrains(data);
        }
      } catch (err) {
        console.error("Failed to load strains:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = strains;
    if (typeFilter !== "All") {
      result = result.filter((s) => s.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.aliases.some((a) => a.toLowerCase().includes(q)) ||
          s.genetics.toLowerCase().includes(q) ||
          s.terpeneProfile.some((t) => t.toLowerCase().includes(q)) ||
          s.effects.some((e) => e.toLowerCase().includes(q))
      );
    }
    return result;
  }, [strains, search, typeFilter]);

  const counts = useMemo(() => {
    const c = { All: strains.length, Indica: 0, Sativa: 0, Hybrid: 0 };
    strains.forEach((s) => {
      if (s.type in c) c[s.type as keyof typeof c]++;
    });
    return c;
  }, [strains]);

  return (
    <>
      <TopNav title="Strain Database" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Stats Bar */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            {(["All", "Indica", "Sativa", "Hybrid"] as const).map((t) => (
              <ButtonBase
                key={t}
                onClick={() => setTypeFilter(t)}
                sx={{
                  ...glassCard({
                    padding: "8px 16px",
                    borderRadius: "12px",
                    transition: "all 0.2s",
                    border:
                      typeFilter === t
                        ? `1px solid ${t === "All" ? "#fff" : TYPE_COLORS[t]}`
                        : "1px solid rgba(255,255,255,0.15)",
                    background:
                      typeFilter === t
                        ? `${t === "All" ? "rgba(255,255,255,0.15)" : TYPE_COLORS[t]}22`
                        : "rgba(255,255,255,0.06)",
                  }),
                }}
              >
                <Typography sx={{ color: "white", fontSize: 13, fontWeight: 600 }}>
                  {t === "All" ? "🌿" : ""} {t}{" "}
                  <span style={{ opacity: 0.5 }}>
                    ({counts[t as keyof typeof counts]})
                  </span>
                </Typography>
              </ButtonBase>
            ))}
          </Box>

          {/* Search */}
          <Box sx={{ position: "relative", mb: 3 }}>
            <SearchIcon
              sx={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
              }}
            />
            <input
              type="text"
              placeholder="Search strains, genetics, terpenes, effects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px 12px 44px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "white",
                fontSize: 14,
                outline: "none",
                backdropFilter: "blur(12px)",
              }}
            />
          </Box>

          {/* Results count */}
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, mb: 2 }}>
            {loading
              ? "Loading strain database..."
              : `${filtered.length} strain${filtered.length !== 1 ? "s" : ""}`}
          </Typography>

          {/* Strain Cards */}
          {loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
                Loading strains...
              </Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>
                No strains found
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: 13, mt: 1 }}>
                Try a different search or filter
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {filtered.map((strain) => {
                const isExpanded = expandedId === strain.name;
                return (
                  <ButtonBase
                    key={strain.name}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : strain.name)
                    }
                    sx={{
                      ...glassCard({
                        padding: "16px",
                        textAlign: "left",
                        width: "100%",
                        display: "block",
                        transition: "all 0.2s",
                        "&:hover": {
                          background: "rgba(255,255,255,0.1)",
                          borderColor: "rgba(255,255,255,0.25)",
                        },
                      }),
                    }}
                  >
                    {/* Header Row */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "8px",
                              background: `${TYPE_COLORS[strain.type]}33`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: TYPE_COLORS[strain.type],
                            }}
                          >
                            {TYPE_ICONS[strain.type]}
                          </Box>
                          <Box>
                            <Typography
                              sx={{
                                color: "white",
                                fontWeight: 700,
                                fontSize: 16,
                                lineHeight: 1.2,
                              }}
                            >
                              {strain.name}
                            </Typography>
                            <Typography
                              sx={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 12,
                                mt: 0.25,
                              }}
                            >
                              {strain.genetics}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "8px",
                          background: `${TYPE_COLORS[strain.type]}22`,
                          border: `1px solid ${TYPE_COLORS[strain.type]}44`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: TYPE_COLORS[strain.type],
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {strain.type}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Terpene chips (always visible) */}
                    <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap" }}>
                      {strain.terpeneProfile.slice(0, 3).map((t) => (
                        <Box
                          key={t}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: "6px",
                            background: `${TERPENE_COLORS[t] || "#888"}22`,
                            border: `1px solid ${TERPENE_COLORS[t] || "#888"}44`,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 10,
                              color: TERPENE_COLORS[t] || "#888",
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {t}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <Box
                        sx={{
                          mt: 2,
                          pt: 2,
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        {/* Indica / Sativa Ratio Bar */}
                        {strain.indicaSativaRatio && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              sx={{
                                color: "rgba(255,255,255,0.4)",
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                mb: 0.75,
                              }}
                            >
                              Indica / Sativa Ratio
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ color: "#9b59b6", fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: "right" }}>
                                {strain.indicaSativaRatio.indica}%
                              </Typography>
                              <Box
                                sx={{
                                  flex: 1,
                                  height: 8,
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  background: "rgba(255,255,255,0.08)",
                                  display: "flex",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${strain.indicaSativaRatio.indica}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #9b59b6, #8e44ad)",
                                    borderRadius: strain.indicaSativaRatio.indica === 100 ? "4px" : "4px 0 0 4px",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                                <Box
                                  sx={{
                                    width: `${strain.indicaSativaRatio.sativa}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #e67e22, #d35400)",
                                    borderRadius: strain.indicaSativaRatio.sativa === 100 ? "4px" : "0 4px 4px 0",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </Box>
                              <Typography sx={{ color: "#e67e22", fontSize: 12, fontWeight: 700, minWidth: 28 }}>
                                {strain.indicaSativaRatio.sativa}%
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                              <Typography sx={{ color: "rgba(155,89,182,0.6)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Indica
                              </Typography>
                              <Typography sx={{ color: "rgba(230,126,34,0.6)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Sativa
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {/* Aliases */}
                        {strain.aliases.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography
                              sx={{
                                color: "rgba(255,255,255,0.4)",
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                mb: 0.5,
                              }}
                            >
                              Also Known As
                            </Typography>
                            <Typography
                              sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}
                            >
                              {strain.aliases.join(", ")}
                            </Typography>
                          </Box>
                        )}

                        {/* Visual Profile */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography
                            sx={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                              mb: 0.5,
                            }}
                          >
                            Visual Profile
                          </Typography>
                          <Typography
                            sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}
                          >
                            {strain.visualProfile.colorProfile}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 2,
                              mt: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Box>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: 10,
                                }}
                              >
                                Trichomes
                              </Typography>
                              <Typography
                                sx={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {strain.visualProfile.trichomeDensity}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: 10,
                                }}
                              >
                                Bud Density
                              </Typography>
                              <Typography
                                sx={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {strain.visualProfile.budStructure}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: 10,
                                }}
                              >
                                Leaf Shape
                              </Typography>
                              <Typography
                                sx={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {strain.visualProfile.leafShape}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: 10,
                                }}
                              >
                                Pistil Colors
                              </Typography>
                              <Typography
                                sx={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {strain.visualProfile.pistilColor.join(", ")}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Effects */}
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            sx={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                              mb: 0.5,
                            }}
                          >
                            Effects
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.75,
                              flexWrap: "wrap",
                            }}
                          >
                            {strain.effects.map((e) => (
                              <Box
                                key={e}
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: "6px",
                                  background: "rgba(255,255,255,0.08)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    color: "rgba(255,255,255,0.7)",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {e}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </ButtonBase>
                );
              })}
            </Box>
          )}
        </div>
      </main>
    </>
  );
}
