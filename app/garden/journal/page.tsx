"use client";

// app/garden/journal/page.tsx
//
// Session Diary — log a consumption session: what strain, how, when, the
// vibe, the dose, the after-feel. localStorage-backed for now.
//
// This is the "Journal" zone in the consolidated 5-tab garden. Distinct
// from Grow Log (which is for cultivation events) — Journal is for
// consumption notes after the fact.

import { useState, useEffect } from "react";
import TopNav from "../_components/TopNav";
import ZoneNav from "../_components/ZoneNav";

type Method = "smoke" | "vape" | "edible" | "tincture" | "topical" | "other";
type Mood = "great" | "good" | "neutral" | "off" | "rough";

interface SessionEntry {
  id: string;
  createdAt: string; // ISO
  strain: string;
  method: Method;
  amount: string;     // free text — "0.3g joint", "10mg edible", "2 hits"
  setting: string;    // "evening at home", "movie night with friends"
  moodBefore: Mood;
  moodAfter: Mood;
  durationMinutes: number | null;
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

const STORAGE_KEY = "ss_session_diary";

const METHOD_OPTIONS: { value: Method; label: string; icon: string }[] = [
  { value: "smoke",   label: "Smoke",   icon: "🚬" },
  { value: "vape",    label: "Vape",    icon: "💨" },
  { value: "edible",  label: "Edible",  icon: "🍪" },
  { value: "tincture",label: "Tincture",icon: "💧" },
  { value: "topical", label: "Topical", icon: "🫙" },
  { value: "other",   label: "Other",   icon: "✨" },
];

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "great",   label: "Great",   emoji: "😄" },
  { value: "good",    label: "Good",    emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "off",     label: "Off",     emoji: "😕" },
  { value: "rough",   label: "Rough",   emoji: "😣" },
];

function loadEntries(): SessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionEntry[]) : [];
  } catch {
    return [];
  }
}
function saveEntries(entries: SessionEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function newId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
};

export default function JournalPage() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  const handleAdd = (entry: SessionEntry) => {
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this session?")) return;
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  if (!loaded) {
    return (
      <>
        <TopNav title="Journal" showBack />
        <main className="min-h-screen text-white flex items-center justify-center">
          <div style={{ color: "rgba(255,255,255,0.72)" }}>Loading…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav title="Journal" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>📓</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Session Diary</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.65 }}>
              Log how each session went — strain, method, dose, mood before
              and after, setting, and what you took away from it. Builds your
              own personal map of what works for you.
            </div>
          </div>

          {/* Add CTA */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%",
                padding: "16px 18px",
                marginBottom: 22,
                borderRadius: 14,
                border: "2px dashed rgba(76,175,80,0.40)",
                background: "rgba(76,175,80,0.06)",
                color: "#81C784",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              ➕ Log a session
            </button>
          )}

          {showForm && (
            <NewSessionForm
              onAdd={handleAdd}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* List */}
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🌿</div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, margin: "0 0 6px", fontWeight: 600 }}>
                No sessions logged yet
              </p>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, margin: 0 }}>
                Tap &ldquo;Log a session&rdquo; to start your diary.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.75)",
                  marginBottom: 10,
                }}
              >
                {entries.length} session{entries.length === 1 ? "" : "s"}
              </div>
              {entries.map((e) => (
                <SessionCard key={e.id} entry={e} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}

/* ─── Add form ─── */

function NewSessionForm({
  onAdd, onCancel,
}: {
  onAdd: (entry: SessionEntry) => void;
  onCancel: () => void;
}) {
  const [strain, setStrain] = useState("");
  const [method, setMethod] = useState<Method>("smoke");
  const [amount, setAmount] = useState("");
  const [setting, setSetting] = useState("");
  const [moodBefore, setMoodBefore] = useState<Mood>("neutral");
  const [moodAfter, setMoodAfter] = useState<Mood>("good");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);

  const handleSubmit = () => {
    if (!strain.trim()) return;
    const entry: SessionEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      strain: strain.trim(),
      method,
      amount: amount.trim(),
      setting: setting.trim(),
      moodBefore,
      moodAfter,
      durationMinutes: duration ? Math.max(0, parseInt(duration, 10) || 0) : null,
      notes: notes.trim(),
      rating,
    };
    onAdd(entry);
  };

  return (
    <div style={{ ...glass, padding: 22, marginBottom: 22 }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 18, marginBottom: 14 }}>
        New session
      </div>

      <Field label="Strain *">
        <input
          type="text"
          value={strain}
          onChange={(e) => setStrain(e.target.value.slice(0, 80))}
          placeholder="e.g. Blue Dream"
          style={inputStyle}
        />
      </Field>

      <Field label="Method">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {METHOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setMethod(o.value)}
              style={{
                ...pillButton,
                background: method === o.value ? "rgba(76,175,80,0.18)" : "rgba(255,255,255,0.04)",
                border: method === o.value
                  ? "1px solid rgba(76,175,80,0.45)"
                  : "1px solid rgba(255,255,255,0.10)",
                color: method === o.value ? "#81C784" : "rgba(255,255,255,0.75)",
              }}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Amount">
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value.slice(0, 60))}
          placeholder='e.g. "0.3g", "10mg edible", "2 hits"'
          style={inputStyle}
        />
      </Field>

      <Field label="Setting / occasion">
        <input
          type="text"
          value={setting}
          onChange={(e) => setSetting(e.target.value.slice(0, 80))}
          placeholder='e.g. "evening, alone", "BBQ with friends"'
          style={inputStyle}
        />
      </Field>

      <Field label="Mood — before">
        <MoodRow value={moodBefore} onChange={setMoodBefore} />
      </Field>
      <Field label="Mood — after">
        <MoodRow value={moodAfter} onChange={setMoodAfter} />
      </Field>

      <Field label="Duration (minutes)">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={1440}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 90"
          style={inputStyle}
        />
      </Field>

      <Field label="Rating">
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
              style={{
                fontSize: 24,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: n <= rating ? "#FFD54F" : "rgba(255,255,255,0.60)",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </Field>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          placeholder="What stood out? Did it match the label? Anything to remember for next time?"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 70, fontFamily: "inherit" }}
        />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 4, textAlign: "right" }}>
          {notes.length}/500
        </div>
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!strain.trim()}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: strain.trim()
              ? "linear-gradient(135deg, #43A047, #2E7D32)"
              : "rgba(255,255,255,0.08)",
            color: strain.trim() ? "#fff" : "rgba(255,255,255,0.72)",
            fontSize: 14, fontWeight: 700,
            cursor: strain.trim() ? "pointer" : "not-allowed",
          }}
        >Save session</button>
      </div>
    </div>
  );
}

/* ─── Session card ─── */

function SessionCard({
  entry, onDelete,
}: {
  entry: SessionEntry;
  onDelete: (id: string) => void;
}) {
  const m = METHOD_OPTIONS.find((x) => x.value === entry.method)!;
  const bef = MOOD_OPTIONS.find((x) => x.value === entry.moodBefore)!;
  const aft = MOOD_OPTIONS.find((x) => x.value === entry.moodAfter)!;
  const date = new Date(entry.createdAt);
  return (
    <div style={{ ...glass, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>
          {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span style={{ color: "#FFD54F", fontSize: 13 }}>
          {"★".repeat(entry.rating)}
          <span style={{ color: "rgba(255,255,255,0.55)" }}>{"★".repeat(5 - entry.rating)}</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{m.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.strain}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
            {m.label}{entry.amount ? ` · ${entry.amount}` : ""}
            {entry.durationMinutes ? ` · ${entry.durationMinutes}m` : ""}
          </div>
        </div>
      </div>

      {entry.setting && (
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6 }}>
          📍 {entry.setting}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 13 }}>
        <span title={`Before: ${bef.label}`}>{bef.emoji}</span>
        <span style={{ color: "rgba(255,255,255,0.72)" }}>→</span>
        <span title={`After: ${aft.label}`}>{aft.emoji}</span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginLeft: 4 }}>
          {bef.label} → {aft.label}
        </span>
      </div>

      {entry.notes && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.78)",
            whiteSpace: "pre-wrap" as const,
          }}
        >
          {entry.notes}
        </p>
      )}

      <button
        onClick={() => onDelete(entry.id)}
        style={{
          marginTop: 10,
          background: "transparent",
          border: "none",
          color: "rgba(244,67,54,0.65)",
          fontSize: 13,
          padding: 0,
          cursor: "pointer",
        }}
      >
        Delete
      </button>
    </div>
  );
}

/* ─── small UI helpers ─── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
function MoodRow({ value, onChange }: { value: Mood; onChange: (m: Mood) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {MOOD_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            ...pillButton,
            background: value === o.value ? "rgba(76,175,80,0.18)" : "rgba(255,255,255,0.04)",
            border: value === o.value
              ? "1px solid rgba(76,175,80,0.45)"
              : "1px solid rgba(255,255,255,0.10)",
            color: value === o.value ? "#81C784" : "rgba(255,255,255,0.75)",
          }}
        >
          {o.emoji} {o.label}
        </button>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.30)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};
const pillButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
