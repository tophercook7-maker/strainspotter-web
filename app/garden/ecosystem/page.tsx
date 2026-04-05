"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import SearchIcon from "@mui/icons-material/Search";
import SpaIcon from "@mui/icons-material/Spa";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";

// ─── Types ───────────────────────────────────────────────────────────────────
type StrainType = "Sativa" | "Indica" | "Hybrid";

interface Strain {
  id: string;
  name: string;
  slug: string;
  type: StrainType;
  description: string | null;
  effects: string[];
  flavors: string[];
  thc: number | null;
  cbd: number | null;
  indica_percentage: number;
  sativa_percentage: number;
  popularity: number;
}

interface APIResponse {
  strains: Strain[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Colors & Helpers ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<StrainType, { bg: string; border: string; text: string; gradient: string }> = {
  Sativa: { bg: "rgba(255,213,79,0.12)", border: "#FFD54F", text: "#FFD54F", gradient: "linear-gradient(135deg, rgba(255,213,79,0.15), rgba(255,179,0,0.05))" },
  Indica: { bg: "rgba(149,117,205,0.12)", border: "#9575CD", text: "#9575CD", gradient: "linear-gradient(135deg, rgba(149,117,205,0.15), rgba(106,27,154,0.05))" },
  Hybrid: { bg: "rgba(102,187,106,0.12)", border: "#66BB6A", text: "#66BB6A", gradient: "linear-gradient(135deg, rgba(102,187,106,0.15), rgba(46,125,50,0.05))" },
};

const EFFECT_ICONS: Record<string, string> = {
  euphoric: "✨", relaxed: "😌", happy: "😊", creative: "🎨", energetic: "⚡",
  uplifted: "🚀", sleepy: "😴", hungry: "🍕", focused: "🎯", talkative: "💬",
  tingly: "🌟", giggly: "😂", aroused: "💗",
};

function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    ...extra,
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EcosystemPage() {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StrainType | "">("");
  const [sort, setSort] = useState<"popular" | "name">("popular");
  const [selected, setSelected] = useState<Strain | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch strains from API
  const fetchStrains = useCallback(async (p: number, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: "50",
        sort,
        ...(search ? { q: search } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      const res = await fetch(`/api/strains?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: APIResponse = await res.json();

      if (append) {
        setStrains((prev) => [...prev, ...data.strains]);
      } else {
        setStrains(data.strains);
      }
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, typeFilter, sort]);

  // Initial load + filter changes
  useEffect(() => {
    setPage(1);
    fetchStrains(1);
  }, [search, typeFilter, sort, fetchStrains]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 300);
  };

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || page >= totalPages) return;
    const el = scrollRef.current;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      fetchStrains(page + 1, true);
    }
  }, [page, totalPages, loadingMore, fetchStrains]);

  // ─── Strain Card ─────────────────────────────────────────────────────────
  const StrainCard = ({ strain }: { strain: Strain }) => {
    const tc = TYPE_COLORS[strain.type] || TYPE_COLORS.Hybrid;
    return (
      <ButtonBase
        onClick={() => setSelected(strain)}
        sx={{
          display: "block",
          width: "100%",
          textAlign: "left",
          borderRadius: "16px",
          overflow: "hidden",
          transition: "transform 0.15s, box-shadow 0.15s",
          "&:active": { transform: "scale(0.97)" },
        }}
      >
        <Box sx={{ ...glassCard({ p: 2, position: "relative", overflow: "hidden" }) }}>
          {/* Type accent bar */}
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tc.border }} />

          {/* Name + type badge */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#fff", lineHeight: 1.2, pr: 1, flex: 1 }}>
              {strain.name}
            </Typography>
            <Box sx={{
              px: 1.2, py: 0.3, borderRadius: "8px", fontSize: "0.7rem", fontWeight: 700,
              background: tc.bg, color: tc.text, border: `1px solid ${tc.border}33`,
              whiteSpace: "nowrap", letterSpacing: "0.05em",
            }}>
              {strain.type}
            </Box>
          </Box>

          {/* Ratio bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.2 }}>
            <Typography sx={{ fontSize: "0.65rem", color: "#9575CD", fontWeight: 600 }}>I {strain.indica_percentage}%</Typography>
            <Box sx={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <Box sx={{ width: `${strain.indica_percentage}%`, height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #9575CD, #66BB6A)" }} />
            </Box>
            <Typography sx={{ fontSize: "0.65rem", color: "#FFD54F", fontWeight: 600 }}>S {strain.sativa_percentage}%</Typography>
          </Box>

          {/* Description preview */}
          {strain.description && (
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", mb: 1, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {strain.description}
            </Typography>
          )}

          {/* Effects pills */}
          {strain.effects.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {strain.effects.slice(0, 4).map((e) => (
                <Box key={e} sx={{ px: 0.8, py: 0.2, borderRadius: "6px", fontSize: "0.65rem", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  {EFFECT_ICONS[e.toLowerCase()] || "🌿"} {e}
                </Box>
              ))}
            </Box>
          )}

          {/* THC if available */}
          {strain.thc && strain.thc > 0 && (
            <Typography sx={{ mt: 0.8, fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
              THC: {strain.thc}%
            </Typography>
          )}
        </Box>
      </ButtonBase>
    );
  };

  // ─── Detail Modal ────────────────────────────────────────────────────────
  const DetailModal = () => {
    if (!selected) return null;
    const s = selected;
    const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Hybrid;

    return (
      <Box onClick={() => setSelected(null)} sx={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 500, maxHeight: "85vh", overflow: "auto", borderRadius: "24px 24px 0 0", background: "linear-gradient(180deg, #1a2420, #111816)", border: "1px solid rgba(255,255,255,0.1)", p: 3 }}>
          {/* Close */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <ButtonBase onClick={() => setSelected(null)} sx={{ p: 0.5, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }}>
              <CloseIcon sx={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }} />
            </ButtonBase>
          </Box>

          {/* Name + Type */}
          <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", mb: 0.5 }}>{s.name}</Typography>
          <Box sx={{ display: "inline-flex", px: 1.5, py: 0.4, borderRadius: "10px", background: tc.gradient, border: `1px solid ${tc.border}44`, mb: 2 }}>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: tc.text }}>{s.type}</Typography>
          </Box>

          {/* Ratio */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#9575CD", fontWeight: 600 }}>Indica {s.indica_percentage}%</Typography>
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <Box sx={{ width: `${s.indica_percentage}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #9575CD, #66BB6A)" }} />
            </Box>
            <Typography sx={{ fontSize: "0.75rem", color: "#FFD54F", fontWeight: 600 }}>Sativa {s.sativa_percentage}%</Typography>
          </Box>

          {/* THC/CBD */}
          {(s.thc || s.cbd) && (
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {s.thc && s.thc > 0 && (
                <Box sx={{ ...glassCard({ px: 2, py: 1 }) }}>
                  <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", mb: 0.3 }}>THC</Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#66BB6A" }}>{s.thc}%</Typography>
                </Box>
              )}
              {s.cbd && s.cbd > 0 && (
                <Box sx={{ ...glassCard({ px: 2, py: 1 }) }}>
                  <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", mb: 0.3 }}>CBD</Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#9575CD" }}>{s.cbd}%</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Description */}
          {s.description && (
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, mb: 2 }}>{s.description}</Typography>
          )}

          {/* Effects */}
          {s.effects.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", mb: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>Effects</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {s.effects.map((e) => (
                  <Box key={e} sx={{ px: 1.2, py: 0.5, borderRadius: "10px", background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.2)", fontSize: "0.75rem", color: "#66BB6A" }}>
                    {EFFECT_ICONS[e.toLowerCase()] || "🌿"} {e}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Terpenes/Flavors */}
          {s.flavors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", mb: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>Terpenes</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {s.flavors.map((t) => (
                  <Box key={t} sx={{ px: 1.2, py: 0.5, borderRadius: "10px", background: "rgba(255,213,79,0.1)", border: "1px solid rgba(255,213,79,0.2)", fontSize: "0.75rem", color: "#FFD54F" }}>
                    🧪 {t}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #111816, #0d120f)", color: "#fff" }}>
      <TopNav />

      <Box sx={{ p: 2, maxWidth: 600, mx: "auto", pb: 12 }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 3, mt: 1 }}>
          <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg, #66BB6A, #FFD54F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🌿 Strain Database
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
            {total.toLocaleString()} strains
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ ...glassCard({ display: "flex", alignItems: "center", px: 2, py: 1.2, mb: 2 }) }}>
          <SearchIcon sx={{ color: "rgba(255,255,255,0.3)", mr: 1, fontSize: 20 }} />
          <input
            type="text"
            placeholder="Search strains..."
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: "0.9rem", fontFamily: "inherit",
            }}
          />
        </Box>

        {/* Type filters */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", pb: 0.5 }}>
          {[
            { label: "All", value: "", icon: <AutoAwesomeIcon sx={{ fontSize: 14 }} /> },
            { label: "Indica", value: "Indica", icon: <SpaIcon sx={{ fontSize: 14 }} /> },
            { label: "Sativa", value: "Sativa", icon: <LocalFireDepartmentIcon sx={{ fontSize: 14 }} /> },
            { label: "Hybrid", value: "Hybrid", icon: <SpaIcon sx={{ fontSize: 14 }} /> },
          ].map(({ label, value, icon }) => {
            const active = typeFilter === value;
            const tc = value ? TYPE_COLORS[value as StrainType] : { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)", text: "#fff" };
            return (
              <ButtonBase
                key={value}
                onClick={() => setTypeFilter(value as StrainType | "")}
                sx={{
                  px: 1.5, py: 0.7, borderRadius: "10px", whiteSpace: "nowrap",
                  background: active ? tc.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? tc.border : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", gap: 0.5,
                }}
              >
                <Box sx={{ color: active ? tc.text : "rgba(255,255,255,0.4)" }}>{icon}</Box>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: active ? tc.text : "rgba(255,255,255,0.5)" }}>{label}</Typography>
              </ButtonBase>
            );
          })}

          {/* Sort toggle */}
          <ButtonBase
            onClick={() => setSort(sort === "popular" ? "name" : "popular")}
            sx={{
              ml: "auto", px: 1.5, py: 0.7, borderRadius: "10px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
              {sort === "popular" ? "🔥 Popular" : "🔤 A–Z"}
            </Typography>
          </ButtonBase>
        </Box>

        {/* Strain Grid */}
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: "calc(100vh - 280px)", overflowY: "auto", pr: 0.5 }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} sx={{ color: "#66BB6A" }} />
            </Box>
          ) : strains.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography sx={{ fontSize: "1.2rem", mb: 0.5 }}>🔍</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>No strains found</Typography>
            </Box>
          ) : (
            <>
              {strains.map((strain) => (
                <StrainCard key={strain.id} strain={strain} />
              ))}
              {loadingMore && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} sx={{ color: "#66BB6A" }} />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Detail Modal */}
      <DetailModal />
    </Box>
  );
}
