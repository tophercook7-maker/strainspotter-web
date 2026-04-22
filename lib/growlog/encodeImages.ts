/** Browser-only: compress uploads to JPEG data URLs for Grow Log storage */

export async function filesToJpegDataUrls(
  files: File[],
  maxSide = 1200,
  quality = 0.82
): Promise<string[]> {
  const out: string[] = [];
  for (const f of files.slice(0, 5)) {
    if (!f.type.startsWith("image/")) continue;
    const u = await fileToJpegDataUrl(f, maxSide, quality);
    if (u) out.push(u);
  }
  return out;
}

function fileToJpegDataUrl(
  file: File,
  maxSide: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const s = maxSide / Math.max(width, height);
        width = Math.round(width * s);
        height = Math.round(height * s);
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(c.toDataURL("image/jpeg", quality));
      } catch {
        resolve("");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve("");
    };
    img.src = blobUrl;
  });
}
