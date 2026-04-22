"use client";

import type { ReactNode } from "react";
import type { HybridScanPresentation } from "@/lib/scanner/scanOrchestrator";
import { SCAN_DISPLAY_HIGH_CONFIDENCE_MIN } from "@/lib/scanner/scanUiConfidence";

/** Display tiers for 0–100 confidence — neutral, not overclaiming. */
export function matchConfidenceTier(
  n: number
): "High confidence" | "Moderate confidence" | "Low confidence" {
  if (!Number.isFinite(n)) return "Low confidence";
  if (n >= SCAN_DISPLAY_HIGH_CONFIDENCE_MIN) return "High confidence";
  if (n >= 40) return "Moderate confidence";
  return "Low confidence";
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.38)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function Card({
  children,
  emphasized,
}: {
  children: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: emphasized ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.04)",
        border: emphasized
          ? "1px solid rgba(76,175,80,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function LabeledBlock({
  label,
  value,
  reasons,
  issues,
}: {
  label: string;
  value?: string;
  reasons?: string[];
  issues?: string[];
}) {
  if (!value && !(reasons && reasons.length) && !(issues && issues.length)) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.45)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {value ? (
        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>{value}</div>
      ) : null}
      {reasons && reasons.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5 }}>
          {reasons.slice(0, 5).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {issues && issues.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "rgba(255,183,77,0.85)", fontSize: 13, lineHeight: 1.5 }}>
          {issues.slice(0, 5).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function parseEstimate(obj: unknown): { label?: string; reasons?: string[] } | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label : undefined;
  const reasons = Array.isArray(o.reasons)
    ? o.reasons.filter((r): r is string => typeof r === "string")
    : undefined;
  if (!label && !(reasons && reasons.length)) return null;
  return { label, reasons };
}

function PlantAnalysisCard({ plantAnalysis }: { plantAnalysis: unknown }) {
  if (plantAnalysis == null || typeof plantAnalysis !== "object") return null;
  const pa = plantAnalysis as Record<string, unknown>;
  const typeEstimate = parseEstimate(pa.typeEstimate);
  const growthStage = parseEstimate(pa.growthStage);
  let healthLabel: string | undefined;
  let healthReasons: string[] | undefined;
  let healthIssues: string[] | undefined;
  if (pa.health && typeof pa.health === "object") {
    const h = pa.health as Record<string, unknown>;
    healthLabel = typeof h.label === "string" ? h.label : undefined;
    healthReasons = Array.isArray(h.reasons)
      ? h.reasons.filter((r): r is string => typeof r === "string")
      : undefined;
    healthIssues = Array.isArray(h.issues)
      ? h.issues.filter((r): r is string => typeof r === "string")
      : undefined;
  }

  const subKeys = [
    "deficiencyAnalysis",
    "harvestTiming",
    "sexEstimate",
    "stressAnalysis",
  ] as const;

  const subBlocks: React.ReactNode[] = [];
  for (const key of subKeys) {
    const v = pa[key];
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) {
      subBlocks.push(
        <div key={key} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {key.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>{v}</div>
        </div>
      );
    } else if (typeof v === "object" && !Array.isArray(v)) {
      const entries = Object.entries(v as Record<string, unknown>).filter(
        ([, val]) => val != null && String(val).length > 0
      );
      if (entries.length === 0) continue;
      subBlocks.push(
        <div key={key} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {key.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              color: "rgba(255,255,255,0.65)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(v, null, 2)}
          </pre>
        </div>
      );
    }
  }

  const hasCore =
    !!typeEstimate ||
    !!growthStage ||
    !!healthLabel ||
    !!(healthReasons && healthReasons.length) ||
    !!(healthIssues && healthIssues.length);
  if (!hasCore && subBlocks.length === 0) return null;

  return (
    <Card>
      <SectionTitle>Plant analysis</SectionTitle>
      {typeEstimate ? (
        <LabeledBlock label="Type estimate" value={typeEstimate.label} reasons={typeEstimate.reasons} />
      ) : null}
      {growthStage ? (
        <LabeledBlock label="Growth stage" value={growthStage.label} reasons={growthStage.reasons} />
      ) : null}
      {healthLabel || healthReasons?.length || healthIssues?.length ? (
        <LabeledBlock
          label="Health"
          value={healthLabel}
          reasons={healthReasons}
          issues={healthIssues}
        />
      ) : null}
      {subBlocks}
    </Card>
  );
}

function GrowCoachCard({ growCoach }: { growCoach: unknown }) {
  if (growCoach == null || typeof growCoach !== "object") return null;
  const gc = growCoach as Record<string, unknown>;
  const headline = typeof gc.headline === "string" ? gc.headline.trim() : "";
  const priorityActions = Array.isArray(gc.priorityActions)
    ? gc.priorityActions.filter((s): s is string => typeof s === "string")
    : [];
  const suggestions = Array.isArray(gc.suggestions)
    ? gc.suggestions.filter((s): s is string => typeof s === "string")
    : [];
  const watchFor = Array.isArray(gc.watchFor)
    ? gc.watchFor.filter((s): s is string => typeof s === "string")
    : [];
  const cautions = Array.isArray(gc.cautions)
    ? gc.cautions.filter((s): s is string => typeof s === "string")
    : [];

  if (
    !headline &&
    priorityActions.length === 0 &&
    suggestions.length === 0 &&
    watchFor.length === 0 &&
    cautions.length === 0
  ) {
    return null;
  }

  const list = (title: string, items: string[], tone: "default" | "warn") =>
    items.length > 0 ? (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.42)", marginBottom: 8 }}>{title}</div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            lineHeight: 1.55,
            color: tone === "warn" ? "rgba(255,183,77,0.9)" : "rgba(255,255,255,0.78)",
          }}
        >
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <Card>
      <SectionTitle>Grow coach</SectionTitle>
      {headline ? (
        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.95)", lineHeight: 1.4 }}>{headline}</div>
      ) : null}
      {list("Priority actions", priorityActions, "default")}
      {list("Suggestions", suggestions, "default")}
      {list("Watch for", watchFor, "default")}
      {list("Cautions", cautions, "warn")}
    </Card>
  );
}

/** Warnings + ranked matches — shown above the strain hero. */
export function HybridScanLeadSections({ hybrid }: { hybrid: HybridScanPresentation | null }) {
  if (!hybrid) return null;

  const warnings = hybrid.scanWarnings?.length ? hybrid.scanWarnings : null;
  const top = hybrid.matches?.slice(0, 3) ?? [];
  if (!warnings && top.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {warnings && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(255,183,77,0.07)",
            border: "1px solid rgba(255,183,77,0.28)",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: "rgba(255,183,77,0.9)", marginBottom: 8 }}>
            Scan warnings
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {top.length > 0 && (
        <div style={{ marginBottom: 0 }}>
          <SectionTitle>Top matches</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {top.map((m, idx) => {
              const rank = idx + 1;
              const pct = Math.round(Math.min(100, Math.max(0, m.confidence)));
              const tier = matchConfidenceTier(m.confidence);
              const emphasized = rank === 1;
              return (
                <div
                  key={`${m.strainName}-${idx}`}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: emphasized ? "rgba(76,175,80,0.1)" : "rgba(255,255,255,0.04)",
                    border: emphasized
                      ? "1px solid rgba(76,175,80,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: emphasized ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.08)",
                        color: emphasized ? "#A5D6A7" : "rgba(255,255,255,0.5)",
                        fontWeight: 800,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {rank}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: emphasized ? "#fff" : "rgba(255,255,255,0.88)",
                          lineHeight: 1.3,
                        }}
                      >
                        {m.strainName}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{pct}%</span>
                        <span style={{ margin: "0 8px", opacity: 0.35 }}>·</span>
                        <span>{tier}</span>
                      </div>
                      {m.reasons && m.reasons.length > 0 && (
                        <ul
                          style={{
                            margin: "10px 0 0",
                            paddingLeft: 18,
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {m.reasons.slice(0, 4).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Poor image notice, plant analysis, grow coach, improve tips — below hero, before tabs. */
export function HybridScanDetailSections({ hybrid }: { hybrid: HybridScanPresentation | null }) {
  if (!hybrid) return null;

  const poor = hybrid.poorImageMessage;
  const tips = hybrid.improveTips?.length ? hybrid.improveTips : null;

  const hasAnything =
    poor ||
    hybrid.plantAnalysis != null ||
    hybrid.growCoach != null ||
    tips;

  if (!hasAnything) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      {poor && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(255,152,0,0.09)",
            border: "1px solid rgba(255,152,0,0.35)",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: "rgba(255,193,7,0.95)", marginBottom: 8 }}>
            Image quality
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}>{poor}</p>
        </div>
      )}

      {hybrid.plantAnalysis != null && <PlantAnalysisCard plantAnalysis={hybrid.plantAnalysis} />}

      {hybrid.growCoach != null && <GrowCoachCard growCoach={hybrid.growCoach} />}

      {tips && (
        <Card>
          <SectionTitle>How to improve your scan</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.75)" }}>
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
