"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";
import ZoneNav from "../_components/ZoneNav";
import DiagnosticDialog from "./DiagnosticDialog";

// ─── Types ───────────────────────────────────────────────────────────────────
type Stage =
  | "sourcing"
  | "seed"
  | "seedling"
  | "veg"
  | "flower"
  | "dry"
  | "cure"
  | "harvested"
  | "partake";

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
  icon: "water" | "light" | "temp" | "nutrient" | "general" | "shop" | "use";
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STAGES: { key: Stage; label: string; emoji: string; color: string }[] = [
  { key: "sourcing", label: "Sourcing", emoji: "🛒", color: "#9C27B0" },
  { key: "seed", label: "Germination", emoji: "🌰", color: "#8B6914" },
  { key: "seedling", label: "Seedling", emoji: "🌱", color: "#4CAF50" },
  { key: "veg", label: "Vegetative", emoji: "🌿", color: "#2E7D32" },
  { key: "flower", label: "Flowering", emoji: "🌸", color: "#E91E63" },
  { key: "dry", label: "Drying", emoji: "🍂", color: "#FF9800" },
  { key: "cure", label: "Curing", emoji: "🫙", color: "#795548" },
  { key: "harvested", label: "Harvested", emoji: "✅", color: "#607D8B" },
  { key: "partake", label: "Partake", emoji: "🌿", color: "#00ACC1" },
];

const STAGE_TIPS: Record<Stage, CoachTip[]> = {
  sourcing: [
    { title: "Pick a strain that fits YOUR setup", body: "Indica strains finish faster (7-9 weeks flower) and stay shorter — great for tents and beginners. Sativas take longer (10-14 weeks) and stretch more. Auto-flowering strains finish in ~10 weeks total without needing a light-cycle change. Hybrids split the difference. Match the strain to your space, time, and patience.", icon: "shop" },
    { title: "Photoperiod vs. autoflower", body: "Photoperiod plants need a 12/12 light cycle to flower — you control when. Autoflowers flip on their own around week 4-5 regardless of light, which means faster harvests but less yield and no training tolerance. Beginners often start with autos to learn the cycle without timing complexity.", icon: "general" },
    { title: "Feminized seeds save trouble", body: "Regular seeds are 50/50 male/female — males have to be culled before they pollinate your flowers. Feminized seeds produce only female plants. Cost a bit more but eliminate the most stressful part of growing. For a first grow, feminized is almost always the right call.", icon: "shop" },
    { title: "Buy from established breeders", body: "Reputable seed banks publish strain lineage, expected flowering time, yield ranges, and germination guarantees. Look for stealth shipping if you're in a region where seeds are gray-market. Check growing forum reviews before ordering — bad genetics ruin a grow before it starts.", icon: "shop" },
    { title: "Seed quality check", body: "Healthy seeds are dark brown to nearly black with tiger-stripe patterns and a glossy, hard shell. Pale, green, or soft seeds are immature and germination rates drop. Squeeze gently — a good seed shouldn't crush. Store unused seeds in an airtight container in the fridge; they stay viable for years.", icon: "general" },
    { title: "Set your goals before buying", body: "Decide what you want from this plant before you order seeds: high yield? a specific terpene profile? CBD-dominant? short flowering window? mold-resistant for outdoor? The strain catalog in this app lists effect families and morphology — match those to what you want before committing 12+ weeks to a grow.", icon: "general" },
  ],
  seed: [
    { title: "Germination method", body: "Paper towel method is most reliable for beginners. Place seeds between two damp (not soaked) paper towels in a sealed plastic container, in a dark spot at 75-85°F. Most seeds crack and show a taproot within 24-72 hours. Direct-to-soil works too but you can't see what's happening.", icon: "temp" },
    { title: "When to plant", body: "Once the taproot is about ½ inch long, plant root-down in pre-moistened soil or a starter plug, ¼-½ inch deep. Don't bury the seed leaf. Cover loosely. The seedling should emerge within 2-7 days.", icon: "general" },
    { title: "Patience matters here", body: "Don't poke, peek, or replant. Don't water from above with force. Seeds that take 5-7 days aren't dead — they're just slow. Seeds that haven't shown signs by day 10 are usually duds.", icon: "general" },
    { title: "First moisture", body: "Spray the surface lightly with a mister, don't pour. The seedling's tiny root can't handle a flood. Aim for the soil staying like a wrung-out sponge — damp, not wet.", icon: "water" },
  ],
  seedling: [
    { title: "Light schedule", body: "18/6 light cycle (or 24/0 if you're worried about stretching). Keep LED lights at 50%% intensity and 24-30 inches away to prevent stretching and bleaching. Seedlings need gentle, indirect light for the first 1-2 weeks.", icon: "light" },
    { title: "Watering — the killer", body: "Overwatering kills more seedlings than anything else. Their root systems are tiny — a flood drowns them. Mist lightly or water in a small ring around (not on) the stem. Let the top inch of soil dry between waterings. Lift the pot — light = needs water, heavy = leave it.", icon: "water" },
    { title: "Temperature & humidity", body: "70-80°F with 65-70%% humidity is the sweet spot. A clear humidity dome or plastic bag with airholes helps newborn seedlings establish. Crack the dome a bit more each day to harden them off over a week.", icon: "temp" },
    { title: "Don't feed yet", body: "Seedlings have everything they need from their cotyledons (the round first leaves) for the first 2-3 weeks. Adding nutrients now causes burn — yellowing, crispy leaf tips. Plain water (slightly pH-adjusted to 6.0-6.5 for soil) is all you need until you see 4-5 sets of true leaves.", icon: "nutrient" },
    { title: "Watch for stretching", body: "Tall, thin, leaning seedlings = light is too far away or too weak. Bring the light closer (carefully — check leaf temp with the back of your hand) or bump intensity. A small fan on the lowest setting strengthens stems and prevents damping-off.", icon: "general" },
  ],
  veg: [
    { title: "Nitrogen is king now", body: "Vegetative plants are hungry for nitrogen — it builds leaf and stem mass. Start at ¼ strength with a veg-formula nutrient and ramp up over 2 weeks. Healthy vegetative plants have rich green leaves with a slight glossy shine. Pale = needs more N. Dark, clawing tips = too much.", icon: "nutrient" },
    { title: "Training time — biggest yield lever", body: "LST (Low Stress Training) — gently bend and tie down the main stem to expose lower bud sites. Topping — cut the main growing tip when 4-5 nodes have formed; this creates 2 main colas instead of 1. SCROG — train branches through a screen for an even canopy. Pick one, learn it well, double your yield.", icon: "general" },
    { title: "Light schedule", body: "18/6 is standard and effective. Some growers run 20/4 for slightly faster growth, but the extra electricity rarely pays off. What matters more is light intensity and coverage — a strong 18/6 beats a weak 24/0 every time. Aim for 400-600 PPFD across the canopy.", icon: "light" },
    { title: "Humidity & airflow", body: "Drop humidity to 40-60%% as plants get bigger. Constant gentle airflow over and under the canopy strengthens stems, prevents mold, and keeps pests from settling. An oscillating fan plus an exhaust fan covers most setups.", icon: "temp" },
    { title: "When to flip", body: "Flip to 12/12 when plants are about half the height you want them at harvest — they typically double in size during the stretch (first 2-3 weeks of flower). For a 4-foot final plant, flip at ~2 feet. Stronger genetics need less veg time; weaker plants benefit from extra weeks.", icon: "general" },
  ],
  flower: [
    { title: "The 12/12 flip", body: "Switch to 12/12 light schedule to trigger flowering in photoperiod plants. ZERO light leaks during the 12 dark hours — even brief interruptions cause stress, reduced yield, or hermaphroditism (which seeds your buds and ruins them). Tape any indicator LEDs in the room.", icon: "light" },
    { title: "The stretch", body: "Plants will double or triple in height in the first 2-3 weeks of 12/12. This is normal and expected. Make sure your light has the headroom. Mid-stretch is the last good chance to do any heavy training (super-cropping, defoliation).", icon: "general" },
    { title: "Switch to bloom nutrients", body: "Reduce nitrogen significantly, increase phosphorus and potassium (P-K). Bloom-formula nutrients support bud development and resin production. Most lines have a clear veg-to-bloom transition product. Watch for purple/red stems and yellowing lower leaves — early signs of P or K deficiency.", icon: "nutrient" },
    { title: "Humidity control = bud rot prevention", body: "Lower humidity to 40-50%% during flower, dropping to 35-45%% in the last 2 weeks. Dense, mature buds trap moisture and bud rot (botrytis) can ruin a harvest in days. Increase airflow around colas. Defoliate strategically — remove fan leaves shading bud sites, but don't strip the plant naked.", icon: "temp" },
    { title: "Trichome watch — when to harvest", body: "Around week 6-8 of flower, start checking trichomes with a 60x jeweler's loupe or USB microscope. Clear/glassy trichomes = not ready (high CBG, low THC). Mostly cloudy/milky = peak THC (most uplifting). 20-40%% amber mixed with cloudy = peak ripeness for fuller-body, more sedating effect. Don't go by pistil color alone — it's unreliable.", icon: "general" },
    { title: "Last-2-week flush", body: "Many growers stop nutrients and feed plain pH-adjusted water for the last 10-14 days. The plant uses up stored nutrients in the leaves (which yellow) and the resulting smoke is smoother. Some skip the flush — both camps have results — but new growers usually benefit from it.", icon: "water" },
  ],
  dry: [
    { title: "Slow and dark wins", body: "Hang whole plants or branches upside down in a dark room at 60°F and 60%% humidity (the 60/60 rule). Slow drying — 7-14 days — preserves terpenes and gives smoother smoke. Fast drying (3-4 days at higher temps) leaves a hay smell and harsh smoke that won't fully recover even with curing.", icon: "temp" },
    { title: "Airflow but not direct", body: "Gentle air circulation in the room — never point fans directly at buds. You want slow, even moisture removal from the inside out. Direct airflow dries the outside while the inside stays wet, leading to mold or uneven cure.", icon: "general" },
    { title: "When is it done", body: "Bend a small stem from a bud — it should snap with a slight crackle, not bend like green wood. Larger stems can stay slightly flexible. Buds should feel dry on the outside but still have a tiny bit of give when squeezed. Don't over-dry; you can rehydrate slightly during cure but you can't undo crispy.", icon: "general" },
    { title: "Trim now or later", body: "Wet trim (right after harvest) is faster and easier — leaves are turgid and easy to cut. Dry trim (after drying) keeps more terpenes and smells better. Either works; wet trim is the beginner choice. Dry-trim crowd swears by the smell. Personal preference.", icon: "general" },
  ],
  cure: [
    { title: "Mason jar cure", body: "Trim and place buds in mason jars, filled to 75%% full (don't pack them tight). Cure in a cool, dark, room-temperature spot. The first week is critical — buds release stored moisture into the air space. The next 3-4 weeks the cannabinoids and terpenes finish maturing.", icon: "general" },
    { title: "Burping — the rhythm", body: "First week: open jars 2-3 times per day for 5-10 minutes to release moisture and prevent mold. Second week: once a day. Third week and beyond: every few days. Smell each time — a fresh, complex aroma is good; ammonia or hay smells need more burping (or indicate mold).", icon: "general" },
    { title: "Humidity packs simplify it", body: "Boveda 62%% packs (or similar) inside jars maintain perfect humidity automatically. They're a one-time investment that pays off through the entire cure and storage. Don't skip burping in the first week even with packs — let the buds breathe.", icon: "water" },
    { title: "How long", body: "Minimum 2 weeks for smokable. 4 weeks is when most flavors lock in. 6-8 weeks is the connoisseur level — terpenes round out, harshness fades, and effects feel cleaner and more nuanced. Long cures separate good growers from great ones.", icon: "general" },
  ],
  harvested: [
    { title: "Document everything", body: "Rate the final product honestly: smell, taste, smoothness, effects, total yield (dry weight). Note what worked and what didn't — soil, lights, timing, training methods, problems you hit. The data lives in your grow log here. Future grows of this strain will be much better.", icon: "general" },
    { title: "Dial in your records", body: "Total grow time, time in each stage, peak height, final yield in grams, nutrient line and schedule used. The more you record, the more your next grow benefits from your own experience instead of generic internet advice.", icon: "general" },
    { title: "Save genetics if you loved it", body: "If a strain killed it, take a clone next time before flowering — that's how growers preserve a 'keeper' phenotype. You can't reproduce exact genetics from seed since each seed is genetically unique.", icon: "general" },
  ],
  partake: [
    { title: "Long-term storage", body: "Cured flower stays at peak quality for 6-12 months stored properly: airtight glass jars, with humidity packs (62%%), in a cool dark place. Vacuum-sealing or dark-tinted jars extends this further. Heat, light, and air are the enemies of terpenes and potency. Avoid plastic for long storage — terpenes plasticize the surface.", icon: "general" },
    { title: "Common consumption methods", body: "Inhalation (joint, pipe, dry herb vape) — onset 1-3 minutes, effects last 1-3 hours. Edibles (decarboxylated and infused into fat or oil) — onset 30 minutes to 2 hours, effects last 4-8 hours and feel more full-body. Tinctures (alcohol-based, sublingual) — onset 15-30 minutes, effects last 2-4 hours. Each method delivers cannabinoids differently and feels different.", icon: "use" },
    { title: "Decarboxylation 101", body: "Raw cannabis has THCA, not active THC. Heat converts (decarboxylates) THCA into THC. Smoking and vaping decarb instantly. For edibles, you decarb in the oven — typically 240°F for 30-40 minutes — before infusing into butter, oil, or fat. Skip the decarb and your edibles barely work.", icon: "use" },
    { title: "Start LOW, go SLOW (especially with edibles)", body: "Edibles hit hours later and last hours longer than expected — the most common bad experiences come from people taking a second dose before the first kicks in. A common starting dose is 2.5-5 mg THC for edibles; wait at least 2 hours before considering more. Inhalation is more dose-controllable since onset is fast and you can stop.", icon: "use" },
    { title: "Set, setting, and sense", body: "Effects depend heavily on your mood, environment, and what else is going on. The same flower hits differently after a hard day vs. a good one. Be in a comfortable place the first time you try a new strain or dose. Hydration helps. So does food. So does company you trust.", icon: "general" },
    { title: "Practical safety", body: "Don't drive or operate machinery impaired — same standard as alcohol. Be aware of the legal status where you are; cannabis remains a controlled substance federally in the US and laws vary by state and country. Avoid mixing with alcohol if you're not experienced — they amplify each other unpredictably. If you don't feel right, water + food + sleep is the standard reset.", icon: "general" },
    { title: "If you grew it, you know it", body: "One of the underrated benefits of home growing is full-stack knowledge: you know exactly what's in your flower (or not — no pesticide surprises), how it was cured, and how fresh it is. Take notes on how this batch hits, and the next grow you'll know how to dial it in even better.", icon: "general" },
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
  water: "💧", light: "☀️", temp: "🌡️", nutrient: "🌿", general: "✨", shop: "🛒", use: "🌬️",
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
      stage: "sourcing", started_at: new Date().toISOString().split("T")[0],
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
                  Grow Doctor — {stageInfo.label} Stage
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
  const [showDiagnostic, setShowDiagnostic] = useState(false);

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
        <TopNav title="Grow Doctor" showBack />
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
      <TopNav title="Grow Doctor" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          <ZoneNav zone="grow" zoneLabel="Grow" />
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🩺</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Grow Doctor</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Your full-lifecycle grow companion — from picking the right
              seeds, through every stage of cultivation, all the way to safe,
              informed enjoyment of what you grew. Track grows, log progress,
              and get stage-specific guidance every step of the way.
            </div>
          </div>

          {/* Diagnose CTA */}
          <button
            onClick={() => setShowDiagnostic(true)}
            style={{
              width: "100%",
              padding: "16px 18px",
              marginBottom: 24,
              borderRadius: 16,
              border: "1px solid rgba(76,175,80,0.40)",
              background: "linear-gradient(135deg, rgba(67,160,71,0.18), rgba(46,125,50,0.28))",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left" as const,
            }}
          >
            <span style={{
              fontSize: 28, lineHeight: 1, flexShrink: 0,
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(76,175,80,0.22)",
              display: "grid", placeItems: "center",
            }}>📷</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                Diagnose a Plant Problem
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                Photo of yellowing leaves, pests, weird buds — get an AI cultivation diagnosis with concrete next steps
              </div>
            </div>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.50)" }}>›</span>
          </button>

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
      {showDiagnostic && (
        <DiagnosticDialog onClose={() => setShowDiagnostic(false)} />
      )}
    </>
  );
}
