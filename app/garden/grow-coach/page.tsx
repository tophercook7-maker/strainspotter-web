"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";

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
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

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
  const px = size === "sm" ? 8 : 12;
  const py = size === "sm" ? 2 : 4;
  const fontSize = size === "sm" ? 11 : 13;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: `${py}px ${px}px`, borderRadius: 99, fontSize, fontWeight: 600,
      background: `${s.color}33`, color: s.color, border: `1px solid ${s.color}55`,
    }}>
      {s.emoji} {s.label}
    </span>
  );
}

const TIP_ICONS: Record<string, string> = {
  water: "💧", light: "☀️", temp: "🌡️", nutrient: "🌿", general: "✨",
};

function CoachTipCard({ tip }: { tip: CoachTip }) {
  return (
    <div style={{ ...glass, padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{TIP_ICONS[tip.icon] || "✨"}</span>
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{tip.title}</span>
      </div>
      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6 }}>{tip.body}</div>
    </div>
  );
}

function NewGrowForm({ onAdd, onCancel }: { onAdd: (g: Grow) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [strain, setStrain] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const grow: Grow = {
      id: generateId(), name: name.trim(), strain_name: strain.trim() || "Unknown",
      stage: "seed", started_at: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(), logs: [],
    };
    onAdd(grow);
  };

  return (
    <div style={{ ...glass, padding: 24, marginBottom: 24 }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>🌱 New Grow</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
          Grow Name
        </div>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spring 2026 Indoor Run"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)",
            color: "white", fontSize: 14, outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
          Strain
        </div>
        <input
          type="text" value={strain} onChange={(e) => setStrain(e.target.value)}
          placeholder="e.g. Blue Dream, Gorilla Glue"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)",
            color: "white", fontSize: 14, outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSubmit} style={{
          padding: "10px 24px", borderRadius: 8, background: "#4CAF50", color: "white",
          fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
        }}>
          Start Grow
        </button>
        <button onClick={onCancel} style={{
          padding: "10px 24px", borderRadius: 8, background: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddLogForm({ grow, onAdd, onCancel }: { grow: Grow; onAdd: (log: GrowLog) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>(grow.stage);

  const handleSubmit = () => {
    if (!note.trim()) return;
    onAdd({
      id: generateId(), note: note.trim(), stage, photo_url: null,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div style={{ ...glass, padding: 20, marginTop: 16 }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📝 New Log Entry</div>

      <div style={{ marginBottom: 12 }}>
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} style={{
          width: "100%", padding: "8px 12px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)",
          color: "white", fontSize: 13,
        }}>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
        </select>
      </div>

      <textarea
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="What's happening with your plant today? Watering, feeding, training, observations..."
        rows={3}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)",
          color: "white", fontSize: 13, lineHeight: 1.5, resize: "vertical", outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSubmit} style={{
          padding: "8px 20px", borderRadius: 8, background: "#4CAF50",
          color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
        }}>
          Save Entry
        </button>
        <button onClick={onCancel} style={{
          padding: "8px 20px", borderRadius: 8, background: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function GrowCard({ grow, onUpdate, onDelete }: { grow: Grow; onUpdate: (g: Grow) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const days = daysSince(grow.started_at);
  const stageInfo = STAGES.find((s) => s.key === grow.stage) ?? STAGES[0];
  const tips = STAGE_TIPS[grow.stage] || [];

  const handleAddLog = (log: GrowLog) => {
    onUpdate({ ...grow, logs: [log, ...grow.logs], stage: log.stage });
    setShowLogForm(false);
  };

  const handleStageChange = (newStage: Stage) => {
    onUpdate({ ...grow, stage: newStage });
    setShowStageSelect(false);
  };

  return (
    <div style={{ ...glass, marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          background: `${stageInfo.color}22`, border: `1px solid ${stageInfo.color}44`,
          display: "grid", placeItems: "center", fontSize: 24, flexShrink: 0,
        }}>
          {stageInfo.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {grow.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{grow.strain_name}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>•</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Day {days}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>•</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{grow.logs.length} log{grow.logs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <StageChip stage={grow.stage} size="sm" />
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setShowStageSelect(!showStageSelect)} style={{
              padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer",
            }}>
              🌿 Update Stage
            </button>
            <button onClick={() => setShowLogForm(true)} style={{
              padding: "6px 12px", borderRadius: 6, background: "rgba(76,175,80,0.2)",
              color: "#81C784", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer",
            }}>
              📝 Add Log
            </button>
            <button onClick={() => { if (confirm("Delete this grow and all its logs?")) onDelete(grow.id); }} style={{
              padding: "6px 12px", borderRadius: 6, background: "rgba(244,67,54,0.15)",
              color: "#EF5350", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer",
            }}>
              🗑️ Delete
            </button>
          </div>

          {/* Stage selector */}
          {showStageSelect && (
            <div style={{ ...glass, padding: 12, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => handleStageChange(s.key)} style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: grow.stage === s.key ? `${s.color}33` : "rgba(255,255,255,0.05)",
                  color: grow.stage === s.key ? s.color : "rgba(255,255,255,0.6)",
                  border: `1px solid ${grow.stage === s.key ? `${s.color}55` : "rgba(255,255,255,0.1)"}`,
                }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Coach tips */}
          {tips.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Grow Coach Tips — {stageInfo.label} Stage
                </span>
              </div>
              {tips.map((tip, i) => <CoachTipCard key={i} tip={tip} />)}
            </div>
          )}

          {/* Log form */}
          {showLogForm && <AddLogForm grow={grow} onAdd={handleAddLog} onCancel={() => setShowLogForm(false)} />}

          {/* Log entries */}
          {grow.logs.length > 0 && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Grow Log ({grow.logs.length})
              </div>
              {grow.logs.map((log) => {
                const logStage = STAGES.find((s) => s.key === log.stage);
                return (
                  <div key={log.id} style={{
                    ...glass, padding: 16, marginBottom: 8,
                    borderLeft: `3px solid ${logStage?.color || "#666"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <StageChip stage={log.stage} size="sm" />
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {log.note}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
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
          <div style={{
            width: 32, height: 32, border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "rgba(255,255,255,0.5)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav title="Grow Coach" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>✨</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Grow Coach</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Track your grows from seed to harvest. Get stage-specific coaching tips,
              log daily progress, and build a complete grow history for every plant.
            </div>
          </div>

          {/* New grow button */}
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                width: "100%", padding: "16px 0", marginBottom: 24, borderRadius: 12,
                border: "2px dashed rgba(76,175,80,0.4)", background: "rgba(76,175,80,0.08)",
                color: "#81C784", fontWeight: 700, fontSize: 15,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}
            >
              ➕ Start New Grow
            </button>
          )}

          {showNewForm && <NewGrowForm onAdd={handleAdd} onCancel={() => setShowNewForm(false)} />}

          {/* Grows list */}
          {grows.length === 0 && !showNewForm ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No grows yet</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Start tracking your first grow to get personalized coaching tips</div>
            </div>
          ) : (
            <>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                Your Grows ({grows.length})
              </div>
              {grows.map((grow) => (
                <GrowCard key={grow.id} grow={grow} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
