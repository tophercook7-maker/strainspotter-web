/**
 * Golden-style regression tests for scanner **image prep geometry** (crop + scale).
 * Pixel/JPEG output is browser-specific; geometry is stable and gates visual accuracy.
 */

import { describe, it, expect } from "vitest";
import {
  computeCenterAspectCrop,
  scaleToMaxDimension,
  scannerPrepGeometryFingerprint,
  SCANNER_JPEG_MAX_EDGE,
} from "@/lib/scanner/scannerImageGeometry";

/** Golden fingerprints — update only when intentionally changing crop/scale rules. */
const GOLDEN = {
  /** 4032×3024 (4:3 camera) — no crop, scale to long edge 1536 */
  standard_4032x3024: '{"sx":0,"sy":0,"cw":4032,"ch":3024,"outW":1536,"outH":1152}',
  /** Ultra-wide 4000×1000 — center crop to 4:3 (crop wider than tall → no downscale past max edge) */
  wide_4000x1000: '{"sx":1333.333333,"sy":0,"cw":1333.333333,"ch":1000,"outW":1333,"outH":1000}',
  /** Tall portrait 900×2000 — center crop to 3:4; short edge under 1536 → no scale-up */
  tall_900x2000: '{"sx":0,"sy":400,"cw":900,"ch":1200,"outW":900,"outH":1200}',
} as const;

describe("scanner golden geometry", () => {
  it("matches golden: 4:3 camera frame", () => {
    expect(scannerPrepGeometryFingerprint(4032, 3024, { centerCropEnabled: true })).toBe(
      GOLDEN.standard_4032x3024
    );
  });

  it("matches golden: ultra-wide phone panorama", () => {
    expect(scannerPrepGeometryFingerprint(4000, 1000, { centerCropEnabled: true })).toBe(
      GOLDEN.wide_4000x1000
    );
  });

  it("matches golden: tall portrait", () => {
    expect(scannerPrepGeometryFingerprint(900, 2000, { centerCropEnabled: true })).toBe(
      GOLDEN.tall_900x2000
    );
  });

  it("disables center crop when centerCropEnabled is false", () => {
    const crop = computeCenterAspectCrop(4000, 1000, false);
    expect(crop).toEqual({ sx: 0, sy: 0, cw: 4000, ch: 1000 });
    const { outW, outH } = scaleToMaxDimension(4000, 1000, SCANNER_JPEG_MAX_EDGE);
    expect(outW).toBe(1536);
    expect(outH).toBe(384);
  });
});
