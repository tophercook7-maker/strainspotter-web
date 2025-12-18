/**
 * OCR Service
 * Extracts text from packaging images using tesseract.js
 * Real OCR extraction - no placeholders
 */

import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";

/**
 * Extract text from images in a directory
 * Returns array of extracted text strings
 */
export async function extractTextFromImages(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(dir).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    if (files.length === 0) {
      return [];
    }

    const results: string[] = [];

    for (const f of files) {
      const imgPath = path.join(dir, f);

      try {
        const { data } = await Tesseract.recognize(
          imgPath,
          "eng",
          { logger: () => {} } // silence logs
        );

        const text = data.text
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 0) {
          results.push(text);
          console.log(`[ocr] Extracted ${text.length} chars from ${f}`);
        }
      } catch (err: any) {
        console.error(`[ocr] Error extracting text from ${f}:`, err.message);
        results.push(`[OCR_ERROR] ${f}`);
      }
    }

    return results;
  } catch (error) {
    console.error(`[ocr] Error extracting text from ${dir}:`, error);
    return [];
  }
}

/**
 * Check if OCR is available (tesseract.js installed)
 */
export async function isOCRAvailable(): Promise<boolean> {
  try {
    // Quick test - try to create a worker
    const worker = await Tesseract.createWorker("eng");
    await worker.terminate();
    return true;
  } catch {
    return false;
  }
}
