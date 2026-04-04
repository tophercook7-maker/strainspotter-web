"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import SpaIcon from "@mui/icons-material/Spa";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LightModeIcon from "@mui/icons-material/LightMode";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

// ─── Types ───────────────────────────────────────────────────────────────────
type Stage = "seed" | "seedling" | "veg" | "flower" | "dry" | "cure" | "harvested";

interface Grow {
  id: string;
  name: string;
  strain_name: string;
  stage: Stage;
  started_at: string;
  created_at: string;
  logs: GrowLog[];
}

interface GrowLog {
  id: string;
  note: string;
  stage: Stage;
  photo_url: string | null;
  created_at: string;
}

interface CoachTip {
  title: string;
  body: string;
  icon: "water" | "light" | "temp" | "nutrient" | "general";
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STAGES: { key: Stage; label: string; emoji: string; color: string }[] = [
  { key: "seed", label: "Seed", emoji: "🌰", color: "#8B6914" },
  { key: "seedling", label: "Seedling", emoji: "🌱", color: "#4CAF50" },
  { key: "veg", label: "Vegetative", emoji: "🌿", color: "#2E7D32" },
  { key: "flower", label: "Flowering", emoji: "🌸", color: "#E91E63" },
  { key: "dry", label: "Drying", emoji: "🍂", color: "#FF9800" },
  { key: "cure", label: "Curing", emoji: "🫙", color: "#795548" },
  { key: "harvested", label: "Harvested", emoji: "✅", color: "#607D8B" },
];

const STAGE_TIPS: Record<Stage, CoachTip[]> = {
  seed: [
    { title: "Germination", body: "Keep seeds warm (75-85°F) and moist. Paper towel method works great — place seeds between damp paper towels in a warm, dark spot.", icon: "temp" },
    { title: "Patience", body: "Seeds typically crack within 24-72 hours. Don't overhandle them. Once the taproot is ½ inch, plant root-down in pre-moistened soil.", icon: "general" },
  ],
  seedling: [
    { title: "Light Schedule", body: "18/6 light cycle. Keep lights 24-30 inches away to prevent stretching. Seedlings need gentle, indirect light at first.", icon: "light" },
    { title: "Watering", body: "Mist lightly — seedlings have tiny root systems. Overwatering is the #1 killer at this stage. Let the top inch dry between waterings.", icon: "water" },
    { title: "Temperature", body: "Keep 70-80°F with 65-70% humidity. A dome or humidity tray helps maintain moisture for delicate seedlings.", icon: "temp" },
  ],
  veg: [
    { title: "Nitrogen Boost", body: "Vegetative plants are hungry for nitrogen. Start feeding at ¼ strength and increase weekly. Watch for dark green, healthy leaves.", icon: "nutrient" },
    { title: "Training Time", body: "LST (Low Stress Training) and topping are best done now. Bend and tie branches to create an even canopy for maximum light exposure.", icon: "general" },
    { title: "Light Schedule", body: "18/6 is standard. Some growers run 20/4. Ensure strong, full-spectrum light coverage across the entire canopy.", icon: "light" },
    { title: "Humidity & Airflow", body: "Keep 40-60% humidity with good air circulation. Oscillating fans strengthen stems and prevent mold.", icon: "temp" },
  ],
  flower: [
    { title: "12/12 Flip", body: "Switch to 12/12 light schedule to trigger flowering. No light leaks! Even brief interruptions can cause stress or hermaphroditism.", icon: "light" },
    { title: "Phosphorus & Potassium", body: "Reduce nitrogen, increase P and K. A bloom-specific nutrient formula will support bud development. Watch for deficiency signs.", icon: "nutrient" },
    { title: "Humidity Control", body: "Lower humidity to 40-50% to prevent bud rot. Increase airflow around colas. Defoliate strategically to improve air circulation.", icon: "temp" },
    { title: "Trichome Watch", body: "Around week 6-8, start checking trichomes with a jeweler's loupe. Cloudy = peak THC. Amber = more body/sedative effect.", icon: "general" },
  ],
  dry: [
    { title: "Slow Dry", body: "Hang whole plants or branches in a dark room at 60°F, 60% humidity. Slow drying (7-14 days) preserves terpenes and smoothness.", icon: "temp" },
    { title: "Airflow", body: "Gentle air circulation — never point fans directly at buds. You want slow, even moisture removal without creating harsh, hay-smelling flower.", icon: "general" },
  ],
  cure: [
    { title: "Mason Jar Cure", body: "Trim and place buds in mason jars at 62% humidity. Burp jars 2-3 times daily for the first week, then once daily for 2-3 more weeks.", icon: "general" },
    { title: "Humidity Packs", body: "Boveda 62% packs are a grower's best friend. They maintain perfect humidity inside cure jars. Check buds for any signs of mold regularly.", icon: "water" },
  ],
  harvested: [
    { title: "Enjoy & Document", body: "Rate the final product. Note the effects, taste, and yield. This data helps you optimize future grows of this strain.", icon: "general" },
  ],
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

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = "strainspotter_grows";

function loadGrows(): Grow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGrows(grows: Grow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grows));
}

// ─── Components ──────────────────────────────────────────────────────────────

function StageChip({ stage, size = "md" }: { stage: Stage; size?: "sm" | "md" }) {
  const s = STAGES.find((st) => st.key === stage) ?? STAGES[0];
  const px = size === "sm" ? "8px" : "12px";
  const py = size === "sm" ? "2px" : "4px";
  const fontSize = size === "sm" ? 11 : 13;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px,
        py,
        borderRadius: 99,
        fontSize,
        fontWeight: 600,
        background: `${s.color}33`,
        color: s.color,
        border: `1px solid ${s.color}55`,
      }}
    >
      {s.emoji} {s.label}
    </Box>
  );
}

function CoachTipCard({ tip }: { tip: CoachTip }) {
  const iconMap: Record<string, React.ReactNode> = {
    water: <WaterDropIcon sx={{ fontSize: 20, color: "#4FC3F7" }} />,
    light: <LightModeIcon sx={{ fontSize: 20, color: "#FFD54F" }} />,
    temp: <ThermostatIcon sx={{ fontSize: 20, color: "#FF8A65" }} />,
    nutrient: <SpaIcon sx={{ fontSize: 20, color: "#81C784" }} />,
    general: <AutoAwesomeIcon sx={{ fontSize: 20, color: "#CE93D8" }} />,
  };

  return (
    <Box sx={{ ...glassCard({ p: 2.5, mb: 1.5 }) }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {iconMap[tip.icon] || iconMap.general}
        <Typography sx={{ color: "white", fontWeight: 700, fontSize: 14 }}>
          {tip.title}
        </Typography>
      </Box>
      <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6 }}>
        {tip.body}
      </Typography>
    </Box>
  );
}

function NewGrowForm({ onAdd, onCancel }: { onAdd: (g: Grow) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [strain, setStrain] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const grow: Grow = {
      id: generateId(),
      name: name.trim(),
      strain_name: strain.trim() || "Unknown",
      stage: "seed",
      started_at: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      logs: [],
    };
    onAdd(grow);
  };

  return (
    <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
      <Typography sx={{ color: "white", fontWeight: 700, fontSize: 18, mb: 2 }}>
        🌱 New Grow
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
          Grow Name
        </Typography>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spring 2026 Indoor Run"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: 14,
            outline: "none",
          }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
          Strain
        </Typography>
        <input
          type="text"
          value={strain}
          onChange={(e) => setStrain(e.target.value)}
          placeholder="e.g. Blue Dream, Gorilla Glue"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: 14,
            outline: "none",
          }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1.5 }}>
        <ButtonBase
          onClick={handleSubmit}
          sx={{
            px: 3, py: 1.2,
            borderRadius: 2,
            background: "#4CAF50",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            "&:hover": { background: "#43A047" },
          }}
        >
          Start Grow
        </ButtonBase>
        <ButtonBase
          onClick={onCancel}
          sx={{
            px: 3, py: 1.2,
            borderRadius: 2,
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Cancel
        </ButtonBase>
      </Box>
    </Box>
  );
}

function AddLogForm({ grow, onAdd, onCancel }: { grow: Grow; onAdd: (log: GrowLog) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>(grow.stage);

  const handleSubmit = () => {
    if (!note.trim()) return;
    const log: GrowLog = {
      id: generateId(),
      note: note.trim(),
      stage,
      photo_url: null,
      created_at: new Date().toISOString(),
    };
    onAdd(log);
  };

  return (
    <Box sx={{ ...glassCard({ p: 2.5, mt: 2 }) }}>
      <Typography sx={{ color: "white", fontWeight: 700, fontSize: 14, mb: 1.5 }}>
        📝 New Log Entry
      </Typography>

      <Box sx={{ mb: 1.5 }}>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.4)",
            color: "white",
            fontSize: 13,
          }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </Box>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's happening with your plant today? Watering, feeding, training, observations..."
        rows={3}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          fontSize: 13,
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
        }}
      />

      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
        <ButtonBase
          onClick={handleSubmit}
          sx={{
            px: 2.5, py: 1,
            borderRadius: 2,
            background: "#4CAF50",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Save Entry
        </ButtonBase>
        <ButtonBase
          onClick={onCancel}
          sx={{
            px: 2.5, py: 1,
            borderRadius: 2,
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Cancel
        </ButtonBase>
      </Box>
    </Box>
  );
}

function GrowCard({
  grow,
  onUpdate,
  onDelete,
}: {
  grow: Grow;
  onUpdate: (g: Grow) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const days = daysSince(grow.started_at);
  const stageInfo = STAGES.find((s) => s.key === grow.stage) ?? STAGES[0];
  const tips = STAGE_TIPS[grow.stage] || [];

  const handleAddLog = (log: GrowLog) => {
    const updated = { ...grow, logs: [log, ...grow.logs], stage: log.stage };
    onUpdate(updated);
    setShowLogForm(false);
  };

  const handleStageChange = (newStage: Stage) => {
    onUpdate({ ...grow, stage: newStage });
    setShowStageSelect(false);
  };

  return (
    <Box sx={{ ...glassCard({ mb: 2, overflow: "hidden" }) }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 2.5,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 2,
          "&:hover": { background: "rgba(255,255,255,0.03)" },
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: `${stageInfo.color}22`,
            border: `1px solid ${stageInfo.color}44`,
            display: "grid",
            placeItems: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {stageInfo.emoji}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: "white", fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {grow.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              {grow.strain_name}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>•</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              Day {days}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>•</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              {grow.logs.length} log{grow.logs.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>

        <StageChip stage={grow.stage} size="sm" />
        {expanded ? (
          <ExpandLessIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
        ) : (
          <ExpandMoreIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
        )}
      </Box>

      {/* Expanded content */}
      {expanded && (
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          {/* Stage selector */}
          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <ButtonBase
              onClick={() => setShowStageSelect(!showStageSelect)}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: 1.5,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <SpaIcon sx={{ fontSize: 14 }} /> Update Stage
            </ButtonBase>
            <ButtonBase
              onClick={() => setShowLogForm(true)}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: 1.5,
                background: "rgba(76,175,80,0.2)",
                color: "#81C784",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <EditNoteIcon sx={{ fontSize: 14 }} /> Add Log
            </ButtonBase>
            <ButtonBase
              onClick={() => {
                if (confirm("Delete this grow and all its logs?")) onDelete(grow.id);
              }}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: 1.5,
                background: "rgba(244,67,54,0.15)",
                color: "#EF5350",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} /> Delete
            </ButtonBase>
          </Box>

          {/* Stage selector dropdown */}
          {showStageSelect && (
            <Box sx={{ ...glassCard({ p: 1.5, mb: 2 }), display: "flex", flexWrap: "wrap", gap: 1 }}>
              {STAGES.map((s) => (
                <ButtonBase
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: grow.stage === s.key ? `${s.color}33` : "rgba(255,255,255,0.05)",
                    color: grow.stage === s.key ? s.color : "rgba(255,255,255,0.6)",
                    border: `1px solid ${grow.stage === s.key ? `${s.color}55` : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {s.emoji} {s.label}
                </ButtonBase>
              ))}
            </Box>
          )}

          {/* AI Coaching Tips */}
          {tips.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 16, color: "#CE93D8" }} />
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Grow Coach Tips — {stageInfo.label} Stage
                </Typography>
              </Box>
              {tips.map((tip, i) => (
                <CoachTipCard key={i} tip={tip} />
              ))}
            </Box>
          )}

          {/* Log form */}
          {showLogForm && (
            <AddLogForm
              grow={grow}
              onAdd={handleAddLog}
              onCancel={() => setShowLogForm(false)}
            />
          )}

          {/* Log entries */}
          {grow.logs.length > 0 && (
            <Box>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 1.5 }}>
                Grow Log ({grow.logs.length})
              </Typography>
              {grow.logs.map((log) => (
                <Box
                  key={log.id}
                  sx={{
                    ...glassCard({ p: 2, mb: 1 }),
                    borderLeft: `3px solid ${STAGES.find((s) => s.key === log.stage)?.color || "#666"}`,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                    <StageChip stage={log.stage} size="sm" />
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {log.note}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function GrowCoachPage() {
  const [grows, setGrows] = useState<Grow[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGrows(loadGrows());
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: Grow[]) => {
    setGrows(updated);
    saveGrows(updated);
  }, []);

  const handleAdd = (grow: Grow) => {
    persist([grow, ...grows]);
    setShowNewForm(false);
  };

  const handleUpdate = (updated: Grow) => {
    persist(grows.map((g) => (g.id === updated.id ? updated : g)));
  };

  const handleDelete = (id: string) => {
    persist(grows.filter((g) => g.id !== id));
  };

  if (!loaded) {
    return (
      <>
        <TopNav title="Grow Coach" showBack />
        <main className="min-h-screen text-white flex items-center justify-center">
          <CircularProgress sx={{ color: "rgba(255,255,255,0.5)" }} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav title="Grow Coach" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero section */}
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 28, color: "#CE93D8" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Grow Coach
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Track your grows from seed to harvest. Get stage-specific coaching tips,
              log daily progress, and build a complete grow history for every plant.
            </Typography>
          </Box>

          {/* New grow button */}
          {!showNewForm && (
            <ButtonBase
              onClick={() => setShowNewForm(true)}
              sx={{
                width: "100%",
                py: 2,
                mb: 3,
                borderRadius: 3,
                border: "2px dashed rgba(76,175,80,0.4)",
                background: "rgba(76,175,80,0.08)",
                color: "#81C784",
                fontWeight: 700,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                "&:hover": { background: "rgba(76,175,80,0.15)", border: "2px dashed rgba(76,175,80,0.6)" },
              }}
            >
              <AddIcon sx={{ fontSize: 22 }} />
              Start New Grow
            </ButtonBase>
          )}

          {/* New grow form */}
          {showNewForm && <NewGrowForm onAdd={handleAdd} onCancel={() => setShowNewForm(false)} />}

          {/* Active grows */}
          {grows.length === 0 && !showNewForm ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>🌱</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, mb: 1 }}>
                No grows yet
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Start tracking your first grow to get personalized coaching tips
              </Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, mb: 1.5 }}>
                Your Grows ({grows.length})
              </Typography>
              {grows.map((grow) => (
                <GrowCard
                  key={grow.id}
                  grow={grow}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
