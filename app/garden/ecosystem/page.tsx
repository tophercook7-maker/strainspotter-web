"use client";

import { apiUrl } from "@/lib/config/apiBase";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────────────── */
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

/* ─── Constants ─────────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<StrainType, { bg: string; border: string; text: string }> = {
  Sativa:  { bg: "rgba(255,213,79,0.12)",  border: "#FFD54F", text: "#FFD54F" },
  Indica:  { bg: "rgba(149,117,205,0.12)", border: "#9575CD", text: "#9575CD" },
  Hybrid:  { bg: "rgba(102,187,106,0.12)", border: "#66BB6A", text: "#66BB6A" },
};

const EFFECT_ICONS: Record<string, string> = {
  euphoric: "✨", relaxed: "😌", happy: "😊", creative: "🎨", energetic: "⚡",
  uplifted: "🚀", sleepy: "😴", hungry: "🍕", focused: "🎯", talkative: "💬",
  tingly: "🌟", giggly: "😂", aroused: "💗",
};

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

/* ─── Card ──────────────────────────────────────────────────────────────── */
function StrainCard({ strain: s, onTap }: { strain: Strain; onTap: () => void }) {
  const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Hybrid;
  const hasEffects = s.effects && s.effects.length > 0;
  const hasDesc = s.description && s.description.length > 0;

  return (
    <div
      onClick={onTap}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: 14, cursor: "pointer",
        borderTop: `3px solid ${tc.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
          {s.name}
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: tc.bg, color: tc.text, border: `1px solid ${tc.border}44`,
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {s.type}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: (hasDesc || hasEffects) ? 8 : 0 }}>
        <span style={{ fontSize: 10, color: "#9575CD", fontWeight: 600, minWidth: 30 }}>I {s.indica_percentage}%</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${s.indica_percentage}%`, height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #9575CD 0%, #66BB6A 60%, #FFD54F 100%)" }} />
        </div>
        <span style={{ fontSize: 10, color: "#FFD54F", fontWeight: 600, minWidth: 30, textAlign: "right" }}>S {s.sativa_percentage}%</span>
      </div>

      {hasDesc && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4, marginBottom: hasEffects ? 8 : 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {s.description}
        </div>
      )}

      {hasEffects && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {s.effects.slice(0, 4).map((e) => (
            <span key={e} style={{ padding: "2px 6px", borderRadius: 6, fontSize: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
              {EFFECT_ICONS[e.toLowerCase()] || "🌿"} {cap(e)}
            </span>
          ))}
          {s.effects.length > 4 && <span style={{ padding: "2px 6px", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>+{s.effects.length - 4}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Detail Modal ──────────────────────────────────────────────────────── */
function DetailModal({ strain: s, onClose }: { strain: Strain; onClose: () => void }) {
  const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Hybrid;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto", borderRadius: "24px 24px 0 0", background: "linear-gradient(180deg, #1a2420, #111816)", border: "1px solid rgba(255,255,255,0.1)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>{s.name}</div>
        <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}44`, fontSize: 13, fontWeight: 700, color: tc.text, marginBottom: 16 }}>{s.type}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
          <span style={{ fontSize: 12, color: "#9575CD", fontWeight: 600 }}>Indica {s.indica_percentage}%</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${s.indica_percentage}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #9575CD 0%, #66BB6A 60%, #FFD54F 100%)" }} />
          </div>
          <span style={{ fontSize: 12, color: "#FFD54F", fontWeight: 600 }}>Sativa {s.sativa_percentage}%</span>
        </div>
        {((s.thc != null && s.thc > 0) || (s.cbd != null && s.cbd > 0)) && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {s.thc != null && s.thc > 0 && <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 16px" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>THC</div><div style={{ fontSize: 18, fontWeight: 700, color: "#66BB6A" }}>{s.thc}%</div></div>}
            {s.cbd != null && s.cbd > 0 && <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 16px" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>CBD</div><div style={{ fontSize: 18, fontWeight: 700, color: "#9575CD" }}>{s.cbd}%</div></div>}
          </div>
        )}
        {s.description && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, marginBottom: 16 }}>{s.description}</div>}
        {s.effects && s.effects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Effects</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.effects.map((e) => <span key={e} style={{ padding: "4px 10px", borderRadius: 10, background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.18)", fontSize: 12, color: "#66BB6A" }}>{EFFECT_ICONS[e.toLowerCase()] || "🌿"} {cap(e)}</span>)}
            </div>
          </div>
        )}
        {s.flavors && s.flavors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Terpenes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.flavors.map((t) => <span key={t} style={{ padding: "4px 10px", borderRadius: 10, background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.18)", fontSize: 12, color: "#FFD54F" }}>🧪 {cap(t)}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function EcosystemPage() {
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

  const fetchStrains = useCallback(async (p: number, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50", sort, ...(search ? { q: search } : {}), ...(typeFilter ? { type: typeFilter } : {}) });
      const res = await fetch(apiUrl(`/api/strains?${params}`));
      if (!res.ok) throw new Error("fail");
      const data: APIResponse = await res.json();
      setStrains(prev => append ? [...prev, ...data.strains] : data.strains);
      setTotal(data.total); setPage(data.page); setTotalPages(data.totalPages);
    } catch { /* ignore */ } finally { setLoading(false); setLoadingMore(false); }
  }, [search, typeFilter, sort]);

  useEffect(() => { setPage(1); fetchStrains(1); }, [search, typeFilter, sort, fetchStrains]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 350);
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || page >= totalPages) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) fetchStrains(page + 1, true);
  }, [page, totalPages, loadingMore, fetchStrains]);

  const filters: { label: string; value: StrainType | ""; emoji: string }[] = [
    { label: "All", value: "", emoji: "✨" },
    { label: "Indica", value: "Indica", emoji: "🌙" },
    { label: "Sativa", value: "Sativa", emoji: "☀️" },
    { label: "Hybrid", value: "Hybrid", emoji: "🌿" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #111816, #0d120f)", color: "#fff" }}>
      <div style={{ padding: "16px 16px 96px", maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 4 }}>
          <button onClick={() => router.push("/garden")} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>‹</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#66BB6A" }}>🧬 Ecosystem</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{loading ? "Loading…" : `${total.toLocaleString()} strains`}</div>
          </div>
          <div style={{ width: 32 }} />
        </div>

        {/* Search */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, display: "flex", alignItems: "center", padding: "10px 16px", marginBottom: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 8, fontSize: 16 }}>🔍</span>
          <input type="text" placeholder="Search strains…" value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit" }} />
          {searchInput && <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {filters.map(({ label, value, emoji }) => {
            const active = typeFilter === value;
            const tc = value ? TYPE_COLORS[value as StrainType] : { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)", text: "#fff" };
            return (
              <button key={label} onClick={() => setTypeFilter(value)} style={{ padding: "6px 12px", borderRadius: 10, cursor: "pointer", background: active ? tc.bg : "rgba(255,255,255,0.03)", border: `1px solid ${active ? tc.border : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", gap: 4, color: active ? tc.text : "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600 }}>
                {emoji} {label}
              </button>
            );
          })}
          <button onClick={() => setSort(sort === "popular" ? "name" : "popular")} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600 }}>
            {sort === "popular" ? "🔥 Popular" : "🔤 A–Z"}
          </button>
        </div>

        {/* List */}
        <div ref={scrollRef} onScroll={handleScroll} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 260px)", overflowY: "auto", paddingRight: 4 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>Loading strains…
            </div>
          ) : strains.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No strains found</div>
            </div>
          ) : (
            <>
              {strains.map((s) => <StrainCard key={s.id} strain={s} onTap={() => setSelected(s)} />)}
              {loadingMore && <div style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading more…</div>}
              {page >= totalPages && strains.length > 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, padding: 16 }}>That's all {total.toLocaleString()} strains</div>}
            </>
          )}
        </div>
      </div>
      {selected && <DetailModal strain={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
