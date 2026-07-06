// lib/scanner/coaParser.ts — pull REAL, printed cannabinoid + terpene numbers
// out of a package's label / Certificate of Analysis (COA) text.
//
// This is the honest counterpart to the model's "typical terpene" guess: when a
// dispensary package prints a lab panel ("Myrcene 0.94%  Limonene 0.41%"), we
// extract those measured values instead of guessing. Pure + deterministic (runs
// on the OCR text the scan already returns) — no AI, no cost, fully testable.
//
// Conservative by design: only emits a value when a known compound sits next to
// a number in a plausible range. Names-only lists (no %) are ignored — those
// aren't measurements.

export type CoaEntry = { name: string; pct: number; unit: "%" };
export type CoaResult = {
  cannabinoids: CoaEntry[];
  terpenes: CoaEntry[];
  totalTerpenes: number | null;
};

// Longest aliases first so "total thc" wins over "thc", "thca" over "thc".
const CANNABINOIDS: { display: string; aliases: string[]; min: number; max: number }[] = [
  { display: "Total THC", aliases: ["total thc"], min: 0.05, max: 45 },
  { display: "Total CBD", aliases: ["total cbd"], min: 0.02, max: 30 },
  { display: "THCA", aliases: ["thca", "thc-a"], min: 0.05, max: 45 },
  { display: "CBDA", aliases: ["cbda", "cbd-a"], min: 0.02, max: 30 },
  { display: "THCV", aliases: ["thcv"], min: 0.01, max: 10 },
  { display: "CBG", aliases: ["cbga", "cbg"], min: 0.01, max: 15 },
  { display: "CBN", aliases: ["cbn"], min: 0.01, max: 10 },
  { display: "CBC", aliases: ["cbc"], min: 0.01, max: 10 },
  { display: "THC", aliases: ["thc", "d9-thc", "delta-9-thc", "delta 9 thc", "δ9-thc"], min: 0.05, max: 45 },
  { display: "CBD", aliases: ["cbd"], min: 0.02, max: 30 },
];

const TERPENES = [
  "myrcene", "limonene", "caryophyllene", "pinene", "linalool", "humulene",
  "terpinolene", "ocimene", "bisabolol", "nerolidol", "eucalyptol", "guaiol",
  "terpineol", "valencene", "geraniol", "camphene", "borneol", "fenchol",
  "farnesene", "phellandrene", "carene", "sabinene", "pulegone", "isopulegol",
];
const TERP_MIN = 0.004, TERP_MAX = 6;

// Normalize: lowercase, greek→latin, unify separators/whitespace.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/β/g, "b").replace(/α/g, "a").replace(/γ/g, "g").replace(/δ/g, "d")
    .replace(/[|•·\t]+/g, " ")
    .replace(/ /g, " ");
}

// Optional stereo/isomer prefix in front of a compound name.
const PFX = "(?:(?:alpha|beta|gamma|delta|trans|cis|d9|d)[-\\s]*)?";

// A number that may carry a % or mg/g unit, in either order relative to the name.
// Returns the value (as a %) AND the exact matched substring so the caller can
// blank it out — preventing "THC" from re-reading the number inside "Total THC".
function findValue(
  text: string, name: string, min: number, max: number
): { pct: number; matched: string } | null {
  const n = name.replace(/[-\s]/g, "[-\\s]?");
  const num = "([0-9]{1,3}(?:\\.[0-9]{1,3})?)";
  const unit = "(%|mg\\s*/\\s*g|mg/g)?";
  // name → number. The gap MUST NOT cross a comma/pipe/semicolon/newline, or it
  // would reach into the next compound's value ("Myrcene, 0.41% Limonene").
  const after = new RegExp(`${PFX}${n}\\b[^0-9%,|;\\n]{0,8}${num}\\s*${unit}`);
  // number → name  (e.g. "0.94% Myrcene")
  const before = new RegExp(`${num}\\s*${unit}\\s*${PFX}${n}\\b`);

  for (const re of [after, before]) {
    const m = text.match(re);
    if (!m) continue;
    let v = parseFloat(m[1]);
    if (!isFinite(v)) continue;
    if (m[2] && /mg/.test(m[2])) v = v / 10; // mg/g → %  (10 mg/g = 1%)
    if (v >= min && v <= max) return { pct: Math.round(v * 1000) / 1000, matched: m[0] };
  }
  return null;
}

function blank(text: string, matched: string): string {
  const i = text.indexOf(matched);
  return i < 0 ? text : text.slice(0, i) + " ".repeat(matched.length) + text.slice(i + matched.length);
}

export function parseCoa(ocrText: string | undefined | null): CoaResult | null {
  if (!ocrText || ocrText.trim().length < 3) return null;
  // Work on a mutable copy so each match can be blanked out — this both prevents
  // "THC" from re-reading "Total THC"'s number and keeps compounds from sharing
  // a value. Longest cannabinoid aliases are tried first (see CANNABINOIDS order).
  let work = norm(ocrText);

  const cannabinoids: CoaEntry[] = [];
  for (const c of CANNABINOIDS) {
    for (const a of c.aliases) {
      const hit = findValue(work, a, c.min, c.max);
      if (hit) {
        cannabinoids.push({ name: c.display, pct: hit.pct, unit: "%" });
        work = blank(work, hit.matched);
        break;
      }
    }
  }

  const terpenes: CoaEntry[] = [];
  for (const t of TERPENES) {
    const hit = findValue(work, t, TERP_MIN, TERP_MAX);
    if (hit) {
      terpenes.push({ name: t.charAt(0).toUpperCase() + t.slice(1), pct: hit.pct, unit: "%" });
      work = blank(work, hit.matched);
    }
  }

  let totalTerpenes: number | null = null;
  const tt = norm(ocrText).match(/total\s*terpenes?\b[^0-9%]{0,8}([0-9]{1,2}(?:\.[0-9]{1,3})?)/);
  if (tt) {
    const v = parseFloat(tt[1]);
    if (v > 0 && v <= 15) totalTerpenes = Math.round(v * 1000) / 1000;
  }

  // Only a real hit if we actually measured something.
  if (cannabinoids.length === 0 && terpenes.length === 0 && totalTerpenes == null) {
    return null;
  }
  // Strongest terpenes first.
  terpenes.sort((a, b) => b.pct - a.pct);
  return { cannabinoids, terpenes, totalTerpenes };
}
