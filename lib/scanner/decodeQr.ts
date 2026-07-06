// lib/scanner/decodeQr.ts — read QR codes (COA / lab-cert links) out of a scan
// photo, client-side. A package's COA QR is the honest jackpot: it points at the
// official lab certificate for that exact batch.
//
// Strategy: try the native BarcodeDetector first (fast, finds MULTIPLE codes —
// great for packages with 2+ QRs), then fall back to jsQR (single-code, so we
// run it over the whole image + quadrants to catch side-by-side codes). jsQR is
// dynamically imported so it never touches the initial bundle.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dedupe(vals: string[]): string[] {
  return Array.from(new Set(vals.map((v) => v.trim()).filter(Boolean)));
}

export async function decodeQrCodes(dataUrl?: string): Promise<string[]> {
  if (typeof window === "undefined" || !dataUrl) return [];
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return [];
  }

  // 1) Native BarcodeDetector — returns every code in the frame.
  try {
    const BD = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
    if (BD) {
      const supported: string[] | undefined = await BD.getSupportedFormats?.();
      if (!supported || supported.includes("qr_code")) {
        const det = new BD({ formats: ["qr_code"] });
        const codes = await det.detect(img);
        const vals = (codes as Array<{ rawValue?: string }>).map((c) => c.rawValue ?? "");
        const hits = dedupe(vals);
        if (hits.length) return hits;
      }
    }
  } catch {
    /* fall through to jsQR */
  }

  // 2) jsQR fallback — one code per call, so sweep whole image + quadrants.
  try {
    const jsQR = (await import("jsqr")).default;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (!canvas.width || !canvas.height) return [];
    ctx.drawImage(img, 0, 0);

    const W = canvas.width, H = canvas.height;
    const regions: [number, number, number, number][] = [
      [0, 0, W, H],
      [0, 0, Math.ceil(W / 2), H],
      [Math.floor(W / 2), 0, Math.ceil(W / 2), H],
      [0, 0, W, Math.ceil(H / 2)],
      [0, Math.floor(H / 2), W, Math.ceil(H / 2)],
    ];
    const found = new Set<string>();
    for (const [x, y, w, h] of regions) {
      if (w < 1 || h < 1) continue;
      const data = ctx.getImageData(x, y, w, h);
      const r = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (r?.data) found.add(r.data.trim());
    }
    return Array.from(found).filter(Boolean);
  } catch {
    return [];
  }
}

/** Decode across several photos and merge unique results. */
export async function decodeQrFromMany(dataUrls: string[]): Promise<string[]> {
  const all: string[] = [];
  for (const u of dataUrls) all.push(...(await decodeQrCodes(u)));
  return dedupe(all);
}
