"use client";

// Plant Doctor result panel — the scanner's live-plant mode readout.
// Shows the whole-plant assessment (health score, stage, age, harvest window)
// followed by problem diagnoses and actions. Unlike strain ID, these reads are
// photo-reliable, so the presentation is confident by design.

import { STAGE_LABELS, formatWeekRange, type PlantAssessment } from "@/lib/scanner/plantAssessment";
import type { PlantDoctorResult } from "@/lib/scanner/plantDoctorClient";
import { buildPlantCardData } from "@/lib/share/resultCard";
import ShareResultButton from "./ShareResultButton";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 16,
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
};

function healthColor(score: number): string {
  if (score >= 90) return "#4CAF50";
  if (score >= 70) return "#8BC34A";
  if (score >= 40) return "#FF9800";
  return "#F44336";
}

const VIGOR_LABELS: Record<PlantAssessment["vigor"], string> = {
  thriving: "Thriving",
  healthy: "Healthy",
  struggling: "Struggling",
  critical: "Critical",
};

const SEVERITY_STYLE: Record<string, { label: string; color: string }> = {
  low: { label: "Low — monitor", color: "#8BC34A" },
  moderate: { label: "Moderate — act this week", color: "#FF9800" },
  urgent: { label: "Urgent — act today", color: "#F44336" },
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 15, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function List({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ ...glass, padding: 18, marginBottom: 14 }}>
      <div style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{icon} {title}</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((s, i) => (
          <li key={i} style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.65, marginBottom: 6 }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export default function PlantDoctorPanel({
  result,
  onReset,
}: {
  result: PlantDoctorResult;
  onReset: () => void;
}) {
  const pa = result.plantAssessment;

  if (!result.imageAssessment.isCannabisPlant) {
    return (
      <div style={{ ...glass, padding: 24 }}>
        <div style={{ color: "white", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>🌱 Hmm — that doesn&apos;t look like a cannabis plant</div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7 }}>
          {result.notCannabisMessage || "Try a clear photo of the plant — whole plant or a close-up of the issue."}
        </div>
        <button onClick={onReset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 700, cursor: "pointer" }}>
          Scan another
        </button>
      </div>
    );
  }

  const sev = SEVERITY_STYLE[result.severity] ?? SEVERITY_STYLE.low;
  const hasProblems = result.diagnoses.length > 0;

  return (
    <div>
      {/* ── Whole-plant assessment ── */}
      {pa && (
        <div style={{ ...glass, padding: 22, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
            {/* Health score ring */}
            <div
              aria-label={`Health score ${pa.healthScore} of 100`}
              style={{
                width: 84, height: 84, borderRadius: "50%", flexShrink: 0,
                background: `conic-gradient(${healthColor(pa.healthScore)} ${pa.healthScore * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(20,30,20,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{pa.healthScore}</span>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700 }}>HEALTH</span>
              </div>
            </div>
            <div>
              <div style={{ color: healthColor(pa.healthScore), fontWeight: 900, fontSize: 20 }}>
                {VIGOR_LABELS[pa.vigor]}
              </div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                {STAGE_LABELS[pa.stage]}
              </div>
              {pa.healthSummary && (
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>{pa.healthSummary}</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14 }}>
            {formatWeekRange(pa.estimatedAgeWeeks) && (
              <Fact label="Plant age" value={`${formatWeekRange(pa.estimatedAgeWeeks)} from sprout`} />
            )}
            {formatWeekRange(pa.weeksIntoFlower) && (
              <Fact label="Into flower" value={formatWeekRange(pa.weeksIntoFlower)!} />
            )}
            {formatWeekRange(pa.estimatedWeeksToHarvest) && (
              <Fact label="Harvest window" value={`in ${formatWeekRange(pa.estimatedWeeksToHarvest)}`} />
            )}
            {pa.trichomes !== "not-visible" && (
              <Fact label="Trichomes" value={pa.trichomes} />
            )}
            {pa.morphology !== "unclear" && (
              <Fact label="Phenotype" value={pa.morphology.replace("-", " ")} />
            )}
          </div>
          {pa.morphologyNotes && (
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
              {pa.morphologyNotes} For the strain itself, scan the label or seed packet in Strain ID mode.
            </div>
          )}
        </div>
      )}

      {/* ── Problems ── */}
      {hasProblems ? (
        <div style={{ ...glass, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>🩺 What I&apos;m seeing</div>
            <span style={{ color: sev.color, fontWeight: 800, fontSize: 12, border: `1px solid ${sev.color}`, borderRadius: 999, padding: "3px 10px" }}>
              {sev.label}
            </span>
          </div>
          {result.diagnoses.map((d, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{d.cause}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{d.confidence}%</span>
              </div>
              {d.explanation && (
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{d.explanation}</div>
              )}
            </div>
          ))}
          {result.severityReasoning && (
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 8 }}>{result.severityReasoning}</div>
          )}
        </div>
      ) : (
        pa && pa.healthScore >= 70 && (
          <div style={{ ...glass, padding: 18, marginBottom: 14 }}>
            <div style={{ color: "#8BC34A", fontWeight: 800, fontSize: 15 }}>✅ No problems spotted</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
              Keep doing what you&apos;re doing — and rescan if anything changes.
            </div>
          </div>
        )
      )}

      <List title="Do this now" icon="⚡" items={result.immediateActions} />
      <List title="Watch over the next week" icon="👀" items={result.monitor} />
      <List title="Next grow" icon="🌱" items={result.prevention} />

      {result.advisoryNote && (
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
          ℹ️ {result.advisoryNote}
        </div>
      )}

      {pa && (
        <ShareResultButton
          data={buildPlantCardData({
            stageLabel: STAGE_LABELS[pa.stage],
            healthScore: pa.healthScore,
            vigor: pa.vigor,
            ageLabel: formatWeekRange(pa.estimatedAgeWeeks),
            harvestLabel: formatWeekRange(pa.estimatedWeeksToHarvest),
            healthSummary: pa.healthSummary,
            topIssue: result.diagnoses[0]?.cause ?? null,
          })}
        />
      )}
      <a
        href="/garden/grow-coach"
        style={{
          display: "block", textAlign: "center", width: "100%", padding: "14px 18px",
          borderRadius: 14, border: "none", marginBottom: 10,
          background: "linear-gradient(135deg, #43A047, #2E7D32)",
          color: "white", fontWeight: 800, fontSize: 15, textDecoration: "none",
        }}
      >
        🩺 Open Grow Doctor{pa && pa.stage !== "unclear" ? ` — ${STAGE_LABELS[pa.stage]} guidance` : ""}
      </a>
      <button
        onClick={onReset}
        style={{
          width: "100%", padding: "14px 18px", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)",
          color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer",
        }}
      >
        📷 Scan another plant
      </button>
    </div>
  );
}
