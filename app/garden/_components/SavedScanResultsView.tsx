"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOptionalAuth } from "@/lib/auth/AuthProvider";
import { scheduleSyncSavedScanPlantToServer } from "@/lib/growlog/syncSavedScanPlantServer";
import { resolveGrowGroupLabelForPlant } from "@/lib/growlog/growGroupStorage";
import {
  getPlantById,
  listPlantsSortedByUpdated,
  reassignScanToPlant,
  unlinkScanFromPlant,
} from "@/lib/growlog/plantStorage";
import type { UnifiedScanUi } from "@/lib/scanner/savedScanMappers";
import {
  SECTION_GROW_COACH_SUB,
  SECTION_GROW_COACH_TITLE,
  SECTION_PLANT_INSIGHTS_SUB,
  SECTION_PLANT_INSIGHTS_TITLE,
  SECTION_STRAIN_SUB,
  SECTION_STRAIN_TITLE,
  TRUST_BLOCK_UNIFIED,
  UNIFIED_PAGE_HEADER,
  UNIFIED_SUMMARY_SUBTEXT,
} from "@/lib/scanner/rankedScanTypes";

type Props = {
  scanUi: UnifiedScanUi;
  poorImageMessage?: string;
  /** Saved scan route id (server uuid or local:…) */
  savedScanId: string;
  linkedGrowLogEntryIds?: string[];
  variant?: "embedded" | "fullscreen";
  linkedPlantId?: string | null;
  linkedPlantName?: string | null;
};

export default function SavedScanResultsView({
  scanUi,
  poorImageMessage,
  savedScanId,
  linkedGrowLogEntryIds = [],
  variant = "fullscreen",
  linkedPlantId = null,
  linkedPlantName = null,
}: Props) {
  const pad = variant === "fullscreen" ? "0 20px 100px" : "0";
  const maxW = variant === "fullscreen" ? 480 : "100%";
  const auth = useOptionalAuth();

  const [plantId, setPlantId] = useState<string | null>(linkedPlantId ?? null);
  const [plantName, setPlantName] = useState<string | null>(linkedPlantName ?? null);
  useEffect(() => {
    setPlantId(linkedPlantId ?? null);
    setPlantName(linkedPlantName ?? null);
  }, [linkedPlantId, linkedPlantName]);

  return (
    <div
      style={{
        padding: pad,
        maxWidth: maxW,
        margin: "0 auto",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(76,175,80,0.85)",
            marginBottom: 8,
          }}
        >
          Saved scan
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -0.3,
            color: "#fff",
          }}
        >
          {UNIFIED_PAGE_HEADER}
        </h1>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.45)",
            margin: "12px 0 0",
            padding: "0 4px",
          }}
        >
          {UNIFIED_SUMMARY_SUBTEXT}
        </p>
      </div>

      {scanUi.apiScanSummary?.trim() && (
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(76,175,80,0.07)",
            border: "1px solid rgba(76,175,80,0.22)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(165,214,167,0.8)",
              marginBottom: 8,
            }}
          >
            Scan summary
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}>
            {scanUi.apiScanSummary.trim()}
          </p>
        </div>
      )}

      {poorImageMessage && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(255,183,77,0.08)",
            border: "1px solid rgba(255,183,77,0.22)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,224,178,0.95)" }}>
            {poorImageMessage}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: 16,
          background: "rgba(76,175,80,0.08)",
          border: "1px solid rgba(76,175,80,0.22)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(165,214,167,0.85)",
            marginBottom: 10,
          }}
        >
          Linked plant
        </div>
        {plantId && (plantName || getPlantById(plantId)?.name) ? (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "rgba(230,255,230,0.95)", lineHeight: 1.5 }}>
            This scan is linked to{" "}
            <Link
              href={`/garden/plants/${encodeURIComponent(plantId)}`}
              style={{ color: "#A5D6A7", fontWeight: 700, textDecoration: "underline" }}
            >
              {plantName ?? getPlantById(plantId)?.name ?? "Plant"}
            </Link>
            .
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            Not linked to a plant — optional. Link to organize timelines and progression.
          </p>
        )}
        {plantId &&
          (() => {
            const p = getPlantById(plantId);
            const gl = p ? resolveGrowGroupLabelForPlant(p) : null;
            return gl ? (
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.45,
                }}
              >
                Group · {gl}
              </p>
            ) : null;
          })()}
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>
          Change plant
        </label>
        <select
          aria-label="Change plant"
          value={plantId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              unlinkScanFromPlant(savedScanId);
              setPlantId(null);
              setPlantName(null);
              scheduleSyncSavedScanPlantToServer(savedScanId, auth?.user?.id ?? null);
              return;
            }
            reassignScanToPlant(savedScanId, v);
            const p = getPlantById(v);
            setPlantId(v);
            setPlantName(p?.name ?? null);
            scheduleSyncSavedScanPlantToServer(savedScanId, auth?.user?.id ?? null);
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 13,
          }}
        >
          <option value="">Remove plant</option>
          {listPlantsSortedByUpdated().map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname ? `${p.name} (${p.nickname})` : p.name}
            </option>
          ))}
        </select>
        <Link
          href="/garden/plants"
          style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "rgba(129,199,132,0.9)", fontWeight: 600 }}
        >
          Create new plant →
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
          {SECTION_STRAIN_TITLE}
        </h2>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.38)", margin: "0 0 14px" }}>
          {SECTION_STRAIN_SUB}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {scanUi.matches.length === 0 && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            No strain matches stored for this scan.
          </p>
        )}
        {scanUi.matches.map((m) => (
          <div
            key={`${m.slug}-${m.rank}`}
            style={{
              borderRadius: 18,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
              {m.cardLabel}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{m.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(129,199,132,0.95)" }}>{m.confidence}%</div>
            <Link
              href={`/garden/strains?q=${encodeURIComponent(m.name)}`}
              style={{
                display: "block",
                marginTop: 10,
                textAlign: "center",
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            >
              View strain details
            </Link>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
          {SECTION_PLANT_INSIGHTS_TITLE}
        </h2>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.38)", margin: "0 0 10px" }}>
          {SECTION_PLANT_INSIGHTS_SUB}
        </p>
        {["typeEstimate", "growthStage", "health"].map((k) => {
          const block = scanUi.plantAnalysis[k as keyof typeof scanUi.plantAnalysis] as {
            label: string;
            confidence: number;
            confidenceLabel: string;
            reasons?: string[];
          } | null;
          if (!block) return null;
          return (
            <div
              key={k}
              style={{
                marginTop: 12,
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
                {k === "typeEstimate" ? "Type" : k === "growthStage" ? "Stage" : "Health"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{block.label}</div>
              <div style={{ fontSize: 13, color: "rgba(129,199,132,0.9)", marginTop: 4 }}>
                {block.confidence}% · {block.confidenceLabel}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 26 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
          {SECTION_GROW_COACH_TITLE}
        </h2>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.38)", margin: "0 0 12px" }}>
          {SECTION_GROW_COACH_SUB}
        </p>
        <div
          style={{
            borderRadius: 18,
            padding: "16px",
            background: "linear-gradient(160deg, rgba(46,125,50,0.14), rgba(10,20,12,0.92))",
            border: "1px solid rgba(76,175,80,0.28)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{scanUi.growCoach.headline}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8F5E9" }}>{scanUi.growCoach.confidence}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            {scanUi.growCoach.confidenceLabel}
          </div>
          {scanUi.growCoach.priorityActions.length > 0 && (
            <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              {scanUi.growCoach.priorityActions.map((a, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: 12,
          }}
        >
          Next steps
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {linkedGrowLogEntryIds.length > 0 ? (
            <Link
              href={`/garden/grow-log/entry/${linkedGrowLogEntryIds[0]}`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 16px",
                borderRadius: 14,
                fontWeight: 700,
                background: "linear-gradient(135deg, #81C784, #43A047)",
                color: "#0d1f0f",
                textDecoration: "none",
              }}
            >
              Open Grow Log entry
            </Link>
          ) : (
            <Link
              href={`/garden/grow-log/compose?scanId=${encodeURIComponent(savedScanId)}`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 16px",
                borderRadius: 14,
                fontWeight: 700,
                background: "linear-gradient(135deg, #81C784, #43A047)",
                color: "#0d1f0f",
                textDecoration: "none",
              }}
            >
              Save to Grow Log
            </Link>
          )}
          <Link
            href={
              plantId
                ? `/garden/scanner?plantId=${encodeURIComponent(plantId)}`
                : "/garden/scanner"
            }
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {plantId ? "Scan this plant again" : "Scan again"}
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 22, padding: "14px 16px", borderRadius: 16, background: "rgba(79,195,247,0.06)", border: "1px solid rgba(79,195,247,0.15)" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(129,212,250,0.95)", marginBottom: 8 }}>Why not 100%?</div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.5)" }}>{TRUST_BLOCK_UNIFIED}</p>
      </div>
    </div>
  );
}
