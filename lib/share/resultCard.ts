// lib/share/resultCard.ts
//
// Shareable "here's exactly what the AI saw" result cards — the honesty brand
// as a growth wedge. Competitors can't ship this because they'd have to admit
// uncertainty; we lead with it.
//
// Split for testability: buildStrainCardData / buildPlantCardData are pure
// (unit-tested), drawResultCard paints a canvas, shareCard handles the Web
// Share API with a download fallback.

export interface ResultCardData {
  kind: "strain" | "plant";
  /** Big headline — strain name or plant stage. */
  title: string;
  /** The number in the ring (calibrated confidence or health score). */
  score: number;
  scoreLabel: string; // "CONFIDENCE" | "HEALTH"
  /** One-line qualifier under the title (tier / vigor). */
  qualifier: string;
  /** "What the AI saw" — honest evidence bullets, max 4. */
  evidence: string[];
  footer: string;
}

const TIER_LABELS: Record<string, string> = {
  high: "High confidence — name read from the label",
  moderate: "Moderate confidence",
  low: "Low confidence — treat as a best guess",
  uncertain: "Uncertain — shortlist, not an ID",
};

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function buildStrainCardData(input: {
  strainName: string;
  confidence: number;
  confidenceTier: string;
  hasPrimaryPick: boolean;
  headline?: string;
  ocrText?: string;
  nameInImage?: boolean;
  visualTraitsMatchPercent?: number;
  imageType?: string;
}): ResultCardData {
  const evidence: string[] = [];
  if (input.nameInImage) {
    evidence.push("✓ Strain name read directly from the label");
  }
  if (input.ocrText && input.ocrText.trim()) {
    evidence.push(`Label text: “${truncate(input.ocrText.replace(/\s+/g, " "), 70)}”`);
  }
  if (!input.nameInImage && typeof input.visualTraitsMatchPercent === "number" && input.visualTraitsMatchPercent > 0) {
    evidence.push(`Visual traits match: ${Math.round(input.visualTraitsMatchPercent)}%`);
  }
  if (input.headline && input.headline.trim()) {
    evidence.push(truncate(input.headline, 80));
  }
  if (!input.nameInImage) {
    evidence.push("No label visible — visual ID of bud is honestly hard");
  }

  return {
    kind: "strain",
    title: input.strainName || "Unknown strain",
    score: Math.max(0, Math.min(100, Math.round(input.confidence))),
    scoreLabel: "CONFIDENCE",
    qualifier: TIER_LABELS[input.confidenceTier] ?? TIER_LABELS.uncertain,
    evidence: evidence.slice(0, 4),
    footer: "Honest AI · calibrated confidence · strainspotter.app",
  };
}

export function buildPlantCardData(input: {
  stageLabel: string;
  healthScore: number;
  vigor: string;
  ageLabel?: string | null;
  harvestLabel?: string | null;
  healthSummary?: string;
  topIssue?: string | null;
}): ResultCardData {
  const evidence: string[] = [];
  if (input.ageLabel) evidence.push(`Estimated age: ${input.ageLabel} from sprout`);
  if (input.harvestLabel) evidence.push(`Harvest window: in ${input.harvestLabel}`);
  if (input.topIssue) evidence.push(`Watch: ${truncate(input.topIssue, 60)}`);
  else evidence.push("No problems spotted");
  if (input.healthSummary) evidence.push(truncate(input.healthSummary, 80));

  return {
    kind: "plant",
    title: input.stageLabel,
    score: Math.max(0, Math.min(100, Math.round(input.healthScore))),
    scoreLabel: "HEALTH",
    qualifier: `${input.vigor.charAt(0).toUpperCase()}${input.vigor.slice(1)} plant`,
    evidence: evidence.slice(0, 4),
    footer: "Plant Doctor · strainspotter.app",
  };
}

/* ── Canvas rendering (browser only) ─────────────────────────────── */

const W = 1080;
const H = 1350;

function scoreColor(score: number, kind: "strain" | "plant"): string {
  if (kind === "plant") {
    if (score >= 90) return "#4CAF50";
    if (score >= 70) return "#8BC34A";
    if (score >= 40) return "#FF9800";
    return "#F44336";
  }
  if (score >= 70) return "#4CAF50";
  if (score >= 40) return "#8BC34A";
  return "#FF9800";
}

export function drawResultCard(canvas: HTMLCanvasElement, data: ResultCardData): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background — deep green-black gradient, brand glass feel.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c1410");
  bg.addColorStop(1, "#060a08");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft radial glow behind the ring.
  const glow = ctx.createRadialGradient(W / 2, 430, 60, W / 2, 430, 420);
  glow.addColorStop(0, "rgba(76,175,80,0.18)");
  glow.addColorStop(1, "rgba(76,175,80,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand header.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 52px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("🌿 StrainSpotter", W / 2, 110);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 30px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.kind === "plant" ? "PLANT DOCTOR SCAN" : "STRAIN SCAN", W / 2, 158);

  // Score ring.
  const cx = W / 2, cy = 430, r = 190;
  const color = scoreColor(data.score, data.kind);
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * data.score) / 100);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 150px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(String(data.score), cx, cy + 40);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "800 34px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.scoreLabel, cx, cy + 110);

  // Title + qualifier.
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 76px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.title.length > 22 ? `${data.title.slice(0, 21)}…` : data.title, W / 2, 760);
  ctx.fillStyle = color;
  ctx.font = "700 38px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.qualifier, W / 2, 822);

  // "What the AI saw" panel.
  const panelY = 890;
  const panelH = 330;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, 70, panelY, W - 140, panelH, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "800 30px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("WHAT THE AI SAW", 110, panelY + 62);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "500 33px -apple-system, 'Segoe UI', Roboto, sans-serif";
  data.evidence.forEach((line, i) => {
    ctx.fillText(`•  ${line.length > 52 ? `${line.slice(0, 51)}…` : line}`, 110, panelY + 125 + i * 56);
  });

  // Footer.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "600 30px -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.footer, W / 2, H - 60);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render + share via the Web Share API, falling back to a PNG download. */
export async function shareCard(data: ResultCardData): Promise<"shared" | "downloaded"> {
  const canvas = document.createElement("canvas");
  drawResultCard(canvas, data);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not render card");

  const file = new File([blob], "strainspotter-scan.png", { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My StrainSpotter scan" });
      return "shared";
    } catch (e) {
      // AbortError = user closed the sheet; treat anything else as fallback.
      if ((e as Error)?.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "strainspotter-scan.png";
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
