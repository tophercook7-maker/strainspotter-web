"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SpaIcon from "@mui/icons-material/Spa";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TouchAppIcon from "@mui/icons-material/TouchApp";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StrainNode {
  id: string;
  name: string;
  type: "sativa" | "indica" | "hybrid";
  thc: string;
  effects: string[];
  parents?: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  from: string;
  to: string;
}

// ─── Strain Data ─────────────────────────────────────────────────────────────
const STRAIN_DATA: Omit<StrainNode, "x" | "y" | "vx" | "vy">[] = [
  // Foundational Strains
  { id: "og-kush", name: "OG Kush", type: "hybrid", thc: "20-25%", effects: ["Euphoric", "Relaxed", "Happy"], parents: [] },
  { id: "sour-diesel", name: "Sour Diesel", type: "sativa", thc: "19-25%", effects: ["Energetic", "Creative", "Uplifted"], parents: [] },
  { id: "girl-scout-cookies", name: "Girl Scout Cookies", type: "hybrid", thc: "25-28%", effects: ["Euphoric", "Happy", "Creative"], parents: ["og-kush", "durban-poison"] },
  { id: "durban-poison", name: "Durban Poison", type: "sativa", thc: "15-25%", effects: ["Energetic", "Uplifted", "Creative"], parents: [] },
  { id: "granddaddy-purple", name: "Granddaddy Purple", type: "indica", thc: "17-23%", effects: ["Relaxed", "Sleepy", "Happy"], parents: ["purple-urkle", "big-bud"] },
  { id: "purple-urkle", name: "Purple Urkle", type: "indica", thc: "18-21%", effects: ["Relaxed", "Sleepy", "Hungry"], parents: [] },
  { id: "big-bud", name: "Big Bud", type: "indica", thc: "15-20%", effects: ["Relaxed", "Sleepy", "Happy"], parents: [] },
  { id: "blue-dream", name: "Blue Dream", type: "hybrid", thc: "21-28%", effects: ["Creative", "Euphoric", "Relaxed"], parents: ["blueberry", "haze"] },
  { id: "blueberry", name: "Blueberry", type: "indica", thc: "17-24%", effects: ["Relaxed", "Happy", "Euphoric"], parents: [] },
  { id: "haze", name: "Haze", type: "sativa", thc: "17-21%", effects: ["Creative", "Energetic", "Uplifted"], parents: [] },
  { id: "gorilla-glue", name: "Gorilla Glue #4", type: "hybrid", thc: "25-30%", effects: ["Relaxed", "Euphoric", "Happy"], parents: ["sour-dubb", "chem-sister"] },
  { id: "sour-dubb", name: "Sour Dubb", type: "hybrid", thc: "21-26%", effects: ["Relaxed", "Euphoric"], parents: ["sour-diesel"] },
  { id: "chem-sister", name: "Chem Sister", type: "hybrid", thc: "20-24%", effects: ["Euphoric", "Uplifted"], parents: [] },
  { id: "gelato", name: "Gelato", type: "hybrid", thc: "20-25%", effects: ["Relaxed", "Euphoric", "Happy"], parents: ["girl-scout-cookies", "sunset-sherbet"] },
  { id: "sunset-sherbet", name: "Sunset Sherbet", type: "hybrid", thc: "18-24%", effects: ["Relaxed", "Happy", "Euphoric"], parents: ["girl-scout-cookies"] },
  { id: "wedding-cake", name: "Wedding Cake", type: "hybrid", thc: "25-27%", effects: ["Relaxed", "Euphoric", "Happy"], parents: ["girl-scout-cookies", "cherry-pie"] },
  { id: "cherry-pie", name: "Cherry Pie", type: "hybrid", thc: "16-24%", effects: ["Happy", "Euphoric", "Relaxed"], parents: ["granddaddy-purple", "durban-poison"] },
  { id: "runtz", name: "Runtz", type: "hybrid", thc: "24-29%", effects: ["Euphoric", "Happy", "Relaxed"], parents: ["gelato", "zkittlez"] },
  { id: "zkittlez", name: "Zkittlez", type: "indica", thc: "15-23%", effects: ["Relaxed", "Happy", "Sleepy"], parents: ["grape-ape", "grapefruit"] },
  { id: "grape-ape", name: "Grape Ape", type: "indica", thc: "15-23%", effects: ["Relaxed", "Sleepy", "Happy"], parents: [] },
  { id: "grapefruit", name: "Grapefruit", type: "sativa", thc: "18-22%", effects: ["Energetic", "Uplifted", "Happy"], parents: [] },
  { id: "white-widow", name: "White Widow", type: "hybrid", thc: "18-25%", effects: ["Creative", "Euphoric", "Energetic"], parents: [] },
  { id: "jack-herer", name: "Jack Herer", type: "sativa", thc: "18-23%", effects: ["Creative", "Energetic", "Focused"], parents: ["haze"] },
  { id: "northern-lights", name: "Northern Lights", type: "indica", thc: "16-21%", effects: ["Relaxed", "Sleepy", "Happy"], parents: [] },
];

function buildEdges(): Edge[] {
  const edges: Edge[] = [];
  for (const s of STRAIN_DATA) {
    for (const p of s.parents ?? []) {
      if (STRAIN_DATA.find((d) => d.id === p)) {
        edges.push({ from: p, to: s.id });
      }
    }
  }
  return edges;
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  sativa: { bg: "rgba(255,213,79,0.2)", border: "#FFD54F", text: "#FFD54F", glow: "rgba(255,213,79,0.3)" },
  indica: { bg: "rgba(149,117,205,0.2)", border: "#9575CD", text: "#9575CD", glow: "rgba(149,117,205,0.3)" },
  hybrid: { bg: "rgba(102,187,106,0.2)", border: "#66BB6A", text: "#66BB6A", glow: "rgba(102,187,106,0.3)" },
};

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

// ─── Force-directed layout simulation ────────────────────────────────────────
function initializeNodes(): StrainNode[] {
  const W = 900;
  const H = 700;
  return STRAIN_DATA.map((s, i) => ({
    ...s,
    x: W / 2 + (Math.random() - 0.5) * W * 0.7,
    y: H / 2 + (Math.random() - 0.5) * H * 0.7,
    vx: 0,
    vy: 0,
  }));
}

function simulateForces(nodes: StrainNode[], edges: Edge[], iterations: number) {
  const W = 900;
  const H = 700;
  const repulsion = 8000;
  const attraction = 0.005;
  const damping = 0.85;
  const centerPull = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }

    // Attraction (edges)
    for (const e of edges) {
      const a = nodes.find((n) => n.id === e.from);
      const b = nodes.find((n) => n.id === e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = dist * attraction;
      a.vx += dx * force;
      a.vy += dy * force;
      b.vx -= dx * force;
      b.vy -= dy * force;
    }

    // Center pull
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * centerPull;
      n.vy += (H / 2 - n.y) * centerPull;
    }

    // Apply velocity
    for (const n of nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      // Bounds
      n.x = Math.max(60, Math.min(W - 60, n.x));
      n.y = Math.max(40, Math.min(H - 40, n.y));
    }
  }

  return nodes;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EcosystemPage() {
  const [nodes, setNodes] = useState<StrainNode[]>([]);
  const [edges] = useState<Edge[]>(buildEdges);
  const [selected, setSelected] = useState<StrainNode | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "sativa" | "indica" | "hybrid">("all");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const initial = initializeNodes();
    const settled = simulateForces(initial, edges, 200);
    setNodes([...settled]);
  }, [edges]);

  const filtered = filter === "all" ? nodes : nodes.filter((n) => n.type === filter);
  const searchMatch = search
    ? nodes.find((n) => n.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  const getConnected = (id: string) => {
    const connected = new Set<string>();
    for (const e of edges) {
      if (e.from === id) connected.add(e.to);
      if (e.to === id) connected.add(e.from);
    }
    return connected;
  };

  const selectedConnections = selected ? getConnected(selected.id) : new Set<string>();

  return (
    <>
      <TopNav title="Ecosystem" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[960px] px-4 py-6">
          {/* Hero */}
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <AccountTreeIcon sx={{ fontSize: 28, color: "#66BB6A" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Strain Ecosystem
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Explore how cannabis strains are connected through their genetics.
              Each node is a strain — lines show parent-child relationships.
              Tap any strain to see its details and lineage.
            </Typography>
          </Box>

          {/* Controls */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
            {/* Search */}
            <Box sx={{ position: "relative", flex: 1, minWidth: 200 }}>
              <SearchIcon sx={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) {
                    const match = nodes.find((n) =>
                      n.name.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    if (match) setSelected(match);
                  }
                }}
                placeholder="Search strains..."
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

            {/* Type filter */}
            {(["all", "sativa", "indica", "hybrid"] as const).map((t) => (
              <ButtonBase
                key={t}
                onClick={() => setFilter(t)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  background: filter === t
                    ? t === "all"
                      ? "rgba(255,255,255,0.15)"
                      : TYPE_COLORS[t as keyof typeof TYPE_COLORS].bg
                    : "rgba(255,255,255,0.06)",
                  color: filter === t
                    ? t === "all"
                      ? "white"
                      : TYPE_COLORS[t as keyof typeof TYPE_COLORS].text
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${filter === t
                    ? t === "all"
                      ? "rgba(255,255,255,0.3)"
                      : TYPE_COLORS[t as keyof typeof TYPE_COLORS].border + "66"
                    : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {t === "all" ? "All Strains" : t}
              </ButtonBase>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, justifyContent: "center" }}>
            {Object.entries(TYPE_COLORS).map(([type, colors]) => (
              <Box key={type} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: colors.border }} />
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "capitalize" }}>
                  {type}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Graph */}
          <Box sx={{ ...glassCard({ overflow: "hidden", mb: 3, position: "relative" }) }}>
            {nodes.length === 0 && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 10 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>Loading ecosystem...</Typography>
              </Box>
            )}

            <svg
              ref={svgRef}
              viewBox="0 0 900 700"
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {edges.map((e, i) => {
                const a = getNode(e.from);
                const b = getNode(e.to);
                if (!a || !b) return null;
                const isHighlighted =
                  selected && (selected.id === e.from || selected.id === e.to);
                const isVisible =
                  (filter === "all" || (a.type === filter && b.type === filter));
                if (!isVisible) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isHighlighted ? "#66BB6A" : "rgba(255,255,255,0.12)"}
                    strokeWidth={isHighlighted ? 2.5 : 1}
                    strokeDasharray={isHighlighted ? "none" : "4 4"}
                  />
                );
              })}

              {/* Nodes */}
              {filtered.map((n) => {
                const colors = TYPE_COLORS[n.type];
                const isSelected = selected?.id === n.id;
                const isConnected = selectedConnections.has(n.id);
                const dim = selected && !isSelected && !isConnected;
                const r = isSelected ? 22 : isConnected ? 18 : 15;

                return (
                  <g
                    key={n.id}
                    onClick={() => setSelected(isSelected ? null : n)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Glow ring */}
                    {(isSelected || isConnected) && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r + 6}
                        fill="none"
                        stroke={colors.border}
                        strokeWidth={1}
                        opacity={0.4}
                        filter="url(#glow)"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={dim ? "rgba(255,255,255,0.03)" : colors.bg}
                      stroke={dim ? "rgba(255,255,255,0.08)" : colors.border}
                      strokeWidth={isSelected ? 3 : 1.5}
                      opacity={dim ? 0.3 : 1}
                    />

                    {/* Label */}
                    <text
                      x={n.x}
                      y={n.y + r + 14}
                      textAnchor="middle"
                      fill={dim ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)"}
                      fontSize={isSelected ? 11 : 9}
                      fontWeight={isSelected ? 700 : 500}
                    >
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tap hint */}
            {!selected && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 2,
                  py: 0.75,
                  borderRadius: 99,
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <TouchAppIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }} />
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                  Tap a strain to see details
                </Typography>
              </Box>
            )}
          </Box>

          {/* Selected strain detail */}
          {selected && (
            <Box
              sx={{
                ...glassCard({ p: 3, mb: 3 }),
                borderColor: TYPE_COLORS[selected.type].border + "44",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: TYPE_COLORS[selected.type].bg,
                    border: `1px solid ${TYPE_COLORS[selected.type].border}55`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <SpaIcon sx={{ fontSize: 24, color: TYPE_COLORS[selected.type].text }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "white", fontWeight: 800, fontSize: 20 }}>
                    {selected.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.15,
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background: TYPE_COLORS[selected.type].bg,
                        color: TYPE_COLORS[selected.type].text,
                        border: `1px solid ${TYPE_COLORS[selected.type].border}55`,
                      }}
                    >
                      {selected.type}
                    </Box>
                    <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                      THC: {selected.thc}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Effects */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 0.75 }}>
                  Effects
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {selected.effects.map((e) => (
                    <Box
                      key={e}
                      sx={{
                        px: 1.5,
                        py: 0.35,
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {e}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Lineage */}
              {(selected.parents?.length ?? 0) > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 0.75 }}>
                    Parent Strains
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {selected.parents?.map((pid) => {
                      const parent = getNode(pid);
                      if (!parent) return null;
                      return (
                        <ButtonBase
                          key={pid}
                          onClick={() => setSelected(parent)}
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 99,
                            background: TYPE_COLORS[parent.type].bg,
                            color: TYPE_COLORS[parent.type].text,
                            fontSize: 12,
                            fontWeight: 600,
                            border: `1px solid ${TYPE_COLORS[parent.type].border}55`,
                          }}
                        >
                          {parent.name}
                        </ButtonBase>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Children */}
              {(() => {
                const children = STRAIN_DATA.filter((s) => s.parents?.includes(selected.id));
                if (children.length === 0) return null;
                return (
                  <Box>
                    <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 0.75 }}>
                      Child Strains
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {children.map((c) => {
                        const cNode = getNode(c.id);
                        if (!cNode) return null;
                        return (
                          <ButtonBase
                            key={c.id}
                            onClick={() => setSelected(cNode)}
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 99,
                              background: TYPE_COLORS[c.type].bg,
                              color: TYPE_COLORS[c.type].text,
                              fontSize: 12,
                              fontWeight: 600,
                              border: `1px solid ${TYPE_COLORS[c.type].border}55`,
                            }}
                          >
                            {c.name}
                          </ButtonBase>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          )}

          {/* Stats */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ ...glassCard({ p: 2, flex: 1, textAlign: "center" }) }}>
              <Typography sx={{ color: "#66BB6A", fontSize: 28, fontWeight: 800 }}>
                {STRAIN_DATA.length}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>
                Strains
              </Typography>
            </Box>
            <Box sx={{ ...glassCard({ p: 2, flex: 1, textAlign: "center" }) }}>
              <Typography sx={{ color: "#64B5F6", fontSize: 28, fontWeight: 800 }}>
                {edges.length}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>
                Connections
              </Typography>
            </Box>
            <Box sx={{ ...glassCard({ p: 2, flex: 1, textAlign: "center" }) }}>
              <Typography sx={{ color: "#CE93D8", fontSize: 28, fontWeight: 800 }}>3</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>
                Types
              </Typography>
            </Box>
          </Box>
        </div>
      </main>
    </>
  );
}
