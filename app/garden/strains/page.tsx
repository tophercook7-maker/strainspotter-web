"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useRouter } from "next/navigation";

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
  Sativa: { bg: "rgba(255,213,79,0.12)", border: "#FFD54F", text: "#FFD54F", gradient: "linear-gradient(135deg, rgba(255,213,79,0.18), rgba(255,179,0,0.06))" },
  Indica: { bg: "rgba(149,117,205,0.12)", border: "#9575CD", text: "#9575CD", gradient: "linear-gradient(135deg, rgba(149,117,205,0.18), rgba(106,27,154,0.06))" },
  Hybrid: { bg: "rgba(102,187,106,0.12)", border: "#66BB6A", text: "#66BB6A", gradient: "linear-gradient(135deg, rgba(102,187,106,0.18), rgba(46,125,50,0.06))" },
};

const EFFECT_ICONS: Record<string, string> = {
  euphoric: "✨", relaxed: "😌", happy: "😊", creative: "🎨", energetic: "⚡",
  uplifted: "🚀", sleepy: "😴", hungry: "🍕", focused: "🎯", talkative: "💬",
  tingly: "🌟", giggly: "😂", aroused: "💗",
};

function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    ...extra,
  };
}

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StrainsPage() {
  const router = useRouter();

  const [strains, setStrains] = useState<Strain[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StrainType | "">("");
  const [sort, setSort] = useState<"popular" | "name">("popular");
  const [selected, setSelected] = useState<Strain | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch strains from API ──
  const fetchStrains = useCallback(
    async (p: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
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
        setStrains((prev) => (append ? [...prev, ...data.strains] : data.strains));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Strains fetch:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, typeFilter, sort],
  );

  // Reload on filter change
  useEffect(() => {
    setPage(1);
    fetchStrains(1);
  }, [search, typeFilter, sort, fetchStrains]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 350);
  };

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || page >= totalPages) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
      fetchStrains(page + 1, true);
    }
  }, [page, totalPages, loadingMore, fetchStrains]);

  // ── Strain Card ──
  const StrainCard = ({ strain: s }: { strain: Strain }) => {
    const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Hybrid;
    const hasEffects = s.effects && s.effects.length > 0;
    const hasDesc = s.description && s.description.length > 0;

    return (
      <ButtonBase
        onClick={() => setSelected(s)}
        sx={{
          display: "block", width: "100%", textAlign: "left",
          borderRadius: "16px", overflow: "hidden",
          transition: "transform 0.12s ease",
          "&:active": { transform: "scale(0.97)" },
        }}
      >
        <Box sx={{ ...glassCard({ p: 2, position: "relative", overflow: "hidden" }) }}>
          {/* Accent bar */}
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tc.border, opacity: 0.8 }} />

          {/* Row 1: Name + Type badge */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.8 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", lineHeight: 1.25, pr: 1, flex: 1 }}>
              {s.name}
            </Typography>
            <Box sx={{
              px: 1, py: 0.25, borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700,
              background: tc.bg, color: tc.text, border: `1px solid ${tc.border}33`,
              whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0,
            }}>
              {s.type}
            </Box>
          </Box>

          {/* Ratio bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: hasDesc || hasEffects ? 1 : 0 }}>
            <Typography sx={{ fontSize: "0.6rem", color: "#9575CD", fontWeight: 600, minWidth: 28 }}>I {s.indica_percentage}%</Typography>
            <Box sx={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <Box sx={{
                width: `${s.indica_percentage}%`, height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #9575CD 0%, #66BB6A 60%, #FFD54F 100%)",
              }} />
            </Box>
            <Typography sx={{ fontSize: "0.6rem", color: "#FFD54F", fontWeight: 600, minWidth: 28, textAlign: "right" }}>S {s.sativa_percentage}%</Typography>
          </Box>

          {/* Description */}
          {hasDesc && (
            <Typography sx={{
              fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4, mb: hasEffects ? 0.8 : 0,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {s.description}
            </Typography>
          )}

          {/* Effect pills */}
          {hasEffects && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
              {s.effects.slice(0, 4).map((e) => (
                <Box key={e} sx={{
                  px: 0.7, py: 0.15, borderRadius: "6px", fontSize: "0.6rem",
                  background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)",
                }}>
                  {EFFECT_ICONS[e.toLowerCase()] || "🌿"} {capFirst(e)}
                </Box>
              ))}
              {s.effects.length > 4 && (
                <Box sx={{
                  px: 0.7, py: 0.15, borderRadius: "6px", fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.3)",
                }}>
                  +{s.effects.length - 4}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </ButtonBase>
    );
  };

  // ── Detail Modal ──
  const DetailModal = () => {
    if (!selected) return null;
    const s = selected;
    const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Hybrid;

    return (
      <Box
        onClick={() => setSelected(null)}
        sx={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: "100%", maxWidth: 500, maxHeight: "88vh", overflow: "auto",
            borderRadius: "24px 24px 0 0",
            background: "linear-gradient(180deg, #1a2420, #111816)",
            border: "1px solid rgba(255,255,255,0.1)", p: 3,
          }}
        >
          {/* Close button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <ButtonBase
              onClick={() => setSelected(null)}
              sx={{ p: 0.5, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }}
            >
              <CloseIcon sx={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }} />
            </ButtonBase>
          </Box>

          {/* Name + Type */}
          <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", mb: 0.5, lineHeight: 1.2 }}>
            {s.name}
          </Typography>
          <Box sx={{
            display: "inline-flex", px: 1.5, py: 0.4, borderRadius: "10px",
            background: tc.gradient, border: `1px solid ${tc.border}44`, mb: 2,
          }}>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: tc.text }}>{s.type}</Typography>
          </Box>

          {/* Ratio bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#9575CD", fontWeight: 600 }}>Indica {s.indica_percentage}%</Typography>
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <Box sx={{
                width: `${s.indica_percentage}%`, height: "100%", borderRadius: 3,
                background: "linear-gradient(90deg, #9575CD 0%, #66BB6A 60%, #FFD54F 100%)",
              }} />
            </Box>
            <Typography sx={{ fontSize: "0.75rem", color: "#FFD54F", fontWeight: 600 }}>Sativa {s.sativa_percentage}%</Typography>
          </Box>

          {/* THC / CBD */}
          {((s.thc && s.thc > 0) || (s.cbd && s.cbd > 0)) && (
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {s.thc && s.thc > 0 && (
                <Box sx={{ ...glassCard({ px: 2, py: 1 }) }}>
                  <Typography sx={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", mb: 0.2, textTransform: "uppercase", letterSpacing: "0.08em" }}>THC</Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#66BB6A" }}>{s.thc}%</Typography>
                </Box>
              )}
              {s.cbd && s.cbd > 0 && (
                <Box sx={{ ...glassCard({ px: 2, py: 1 }) }}>
                  <Typography sx={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", mb: 0.2, textTransform: "uppercase", letterSpacing: "0.08em" }}>CBD</Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#9575CD" }}>{s.cbd}%</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Description */}
          {s.description && (
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.65, mb: 2 }}>
              {s.description}
            </Typography>
          )}

          {/* Effects */}
          {s.effects && s.effects.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", mb: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>Effects</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {s.effects.map((e) => (
                  <Box key={e} sx={{
                    px: 1.2, py: 0.5, borderRadius: "10px",
                    background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.18)",
                    fontSize: "0.75rem", color: "#66BB6A",
                  }}>
                    {EFFECT_ICONS[e.toLowerCase()] || "🌿"} {capFirst(e)}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Terpenes/Flavors */}
          {s.flavors && s.flavors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", mb: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>Terpenes</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {s.flavors.map((t) => (
                  <Box key={t} sx={{
                    px: 1.2, py: 0.5, borderRadius: "10px",
                    background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.18)",
                    fontSize: "0.75rem", color: "#FFD54F",
                  }}>
                    🧪 {capFirst(t)}
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
        {/* Back + Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, mt: 0.5 }}>
          <ButtonBase
            onClick={() => router.push("/garden")}
            sx={{ p: 0.5, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }} />
          </ButtonBase>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography sx={{
              fontSize: "1.4rem", fontWeight: 800,
              background: "linear-gradient(135deg, #66BB6A, #FFD54F)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              🔬 Strain Database
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", mt: 0.2 }}>
              {loading ? "Loading…" : `${total.toLocaleString()} strains`}
            </Typography>
          </Box>
          <Box sx={{ width: 30 }} /> {/* spacer */}
        </Box>

        {/* Search bar */}
        <Box sx={{ ...glassCard({ display: "flex", alignItems: "center", px: 2, py: 1.2, mb: 2 }) }}>
          <SearchIcon sx={{ color: "rgba(255,255,255,0.3)", mr: 1, fontSize: 20 }} />
          <input
            type="text"
            placeholder="Search strains…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: "0.9rem", fontFamily: "inherit",
            }}
          />
          {searchInput && (
            <ButtonBase onClick={() => { setSearchInput(""); setSearch(""); }} sx={{ p: 0.3 }}>
              <CloseIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.3)" }} />
            </ButtonBase>
          )}
        </Box>

        {/* Filter row */}
        <Box sx={{ display: "flex", gap: 0.8, mb: 2, flexWrap: "wrap" }}>
          {[
            { label: "All", value: "" as const, icon: <AutoAwesomeIcon sx={{ fontSize: 13 }} /> },
            { label: "Indica", value: "Indica" as const, icon: <SpaIcon sx={{ fontSize: 13 }} /> },
            { label: "Sativa", value: "Sativa" as const, icon: <LocalFireDepartmentIcon sx={{ fontSize: 13 }} /> },
            { label: "Hybrid", value: "Hybrid" as const, icon: <SpaIcon sx={{ fontSize: 13 }} /> },
          ].map(({ label, value, icon }) => {
            const active = typeFilter === value;
            const tc = value ? TYPE_COLORS[value as StrainType] : { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)", text: "#fff" };
            return (
              <ButtonBase
                key={label}
                onClick={() => setTypeFilter(value)}
                sx={{
                  px: 1.3, py: 0.6, borderRadius: "10px",
                  background: active ? tc.bg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? tc.border : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", gap: 0.4,
                  transition: "all 0.15s ease",
                }}
              >
                <Box sx={{ color: active ? tc.text : "rgba(255,255,255,0.35)", display: "flex" }}>{icon}</Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: active ? tc.text : "rgba(255,255,255,0.45)" }}>
                  {label}
                </Typography>
              </ButtonBase>
            );
          })}

          <ButtonBase
            onClick={() => setSort(sort === "popular" ? "name" : "popular")}
            sx={{
              ml: "auto", px: 1.3, py: 0.6, borderRadius: "10px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
              {sort === "popular" ? "🔥 Popular" : "🔤 A–Z"}
            </Typography>
          </ButtonBase>
        </Box>

        {/* Strain list with scroll */}
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            display: "flex", flexDirection: "column", gap: 1.2,
            maxHeight: "calc(100vh - 300px)", overflowY: "auto",
            pr: 0.5,
            /* thin scrollbar */
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.1)", borderRadius: 2 },
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={32} sx={{ color: "#66BB6A" }} />
            </Box>
          ) : strains.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: "2rem", mb: 1 }}>🔍</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                No strains found
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem", mt: 0.5 }}>
                Try a different search or filter
              </Typography>
            </Box>
          ) : (
            <>
              {strains.map((s) => <StrainCard key={s.id} strain={s} />)}
              {loadingMore && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} sx={{ color: "#66BB6A" }} />
                </Box>
              )}
              {page >= totalPages && strains.length > 0 && (
                <Typography sx={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", py: 2 }}>
                  That's all {total.toLocaleString()} strains
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Detail modal */}
      <DetailModal />
    </Box>
  );
}
