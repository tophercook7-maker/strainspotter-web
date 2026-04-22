/**
 * Pure geometry for scanner image prep (center-crop + max-edge scaling).
 * Used by `scanOrchestrator` (browser canvas) and golden regression tests (Node).
 */

export const SCANNER_JPEG_MAX_EDGE = 1536;

export function readCenterCropEnabledFromEnv(): boolean {
  if (typeof process === "undefined" || !process.env) return true;
  return process.env.NEXT_PUBLIC_SCANNER_CENTER_CROP !== "false";
}

/**
 * Center-crop toward 4:3 (landscape) or 3:4 (portrait) when the source is more extreme.
 */
export function computeCenterAspectCrop(
  sw: number,
  sh: number,
  centerCropEnabled: boolean = readCenterCropEnabledFromEnv()
): { sx: number; sy: number; cw: number; ch: number } {
  if (!centerCropEnabled || sw <= 0 || sh <= 0) {
    return { sx: 0, sy: 0, cw: sw, ch: sh };
  }
  const aspect = sw / sh;
  if (aspect > 4 / 3) {
    const cw = sh * (4 / 3);
    return { sx: Math.max(0, (sw - cw) / 2), sy: 0, cw, ch: sh };
  }
  if (aspect < 3 / 4) {
    const ch = sw * (4 / 3);
    return { sx: 0, sy: Math.max(0, (sh - ch) / 2), cw: sw, ch };
  }
  return { sx: 0, sy: 0, cw: sw, ch: sh };
}

export function scaleToMaxDimension(
  cw: number,
  ch: number,
  maxEdge: number = SCANNER_JPEG_MAX_EDGE
): { outW: number; outH: number } {
  let outW = Math.round(cw);
  let outH = Math.round(ch);
  if (outW > maxEdge || outH > maxEdge) {
    const sc = maxEdge / Math.max(outW, outH);
    outW = Math.max(1, Math.round(outW * sc));
    outH = Math.max(1, Math.round(outH * sc));
  }
  return { outW, outH };
}

/** Fingerprint for golden tests: crop + output dimensions after scaling. */
export function scannerPrepGeometryFingerprint(
  sw: number,
  sh: number,
  opts?: { centerCropEnabled?: boolean; maxEdge?: number }
): string {
  const crop = computeCenterAspectCrop(
    sw,
    sh,
    opts?.centerCropEnabled ?? readCenterCropEnabledFromEnv()
  );
  const { outW, outH } = scaleToMaxDimension(
    crop.cw,
    crop.ch,
    opts?.maxEdge ?? SCANNER_JPEG_MAX_EDGE
  );
  return JSON.stringify({
    sx: round6(crop.sx),
    sy: round6(crop.sy),
    cw: round6(crop.cw),
    ch: round6(crop.ch),
    outW,
    outH,
  });
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
