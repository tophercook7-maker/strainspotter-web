/**
 * Vision API Utilities
 * Wraps Google Cloud Vision API for image analysis
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient | null {
  if (visionClient) {
    return visionClient;
  }

  try {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      visionClient = new ImageAnnotatorClient({
        keyFilename: credentialsPath,
      });
      return visionClient;
    } else {
      console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set. Vision features will be limited.');
      return null;
    }
  } catch (error) {
    console.error('Failed to initialize Vision client:', error);
    return null;
  }
}

export interface VisionResults {
  text: string[];
  labels: string[];
  colors: {
    primary: string;
    secondary: string;
  };
  confidence: number;
}

/**
 * Analyze image from URL
 * Downloads image and analyzes with Vision API
 */
export async function analyzeImage(imageUrl: string): Promise<VisionResults> {
  const client = getVisionClient();

  if (!client) {
    // Return empty results instead of mock when Vision API is unavailable
    console.log('[vision] Vision API not available, returning empty results');
    return {
      text: [],
      labels: [],
      colors: { primary: '#4a5568', secondary: '#718096' },
      confidence: 0,
    };
  }

  try {
    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Run all detections in parallel
    const [textResult, labelResult, colorResult] = await Promise.all([
      client.textDetection({ image: { content: imageBuffer } }),
      client.labelDetection({ image: { content: imageBuffer } }),
      client.imageProperties({ image: { content: imageBuffer } }),
    ]);

    // Extract text
    const textAnnotations = textResult[0].textAnnotations || [];
    const detectedText =
      textAnnotations.length > 0 && textAnnotations[0]?.description
        ? textAnnotations[0].description
            .split('\n')
            .filter((t) => t.trim())
            .slice(1) // Skip first annotation (full text)
        : [];

    // Extract labels
    const labels = (labelResult[0].labelAnnotations || [])
      .map((l) => l.description)
      .filter((desc): desc is string => !!desc);

    // Extract dominant colors
    const colors = extractColors(colorResult[0].imagePropertiesAnnotation);

    return {
      text: detectedText,
      labels,
      colors,
      confidence: computeOverallConfidence(detectedText, labels),
    };
  } catch (error) {
    console.error('[vision] Vision API error:', error);
    // Return empty results on error instead of mock
    return {
      text: [],
      labels: [],
      colors: { primary: '#4a5568', secondary: '#718096' },
      confidence: 0,
    };
  }
}

/**
 * Extract dominant colors from vision results
 */
function extractColors(imageProperties: any): { primary: string; secondary: string } {
  if (!imageProperties || !imageProperties.dominantColors) {
    return { primary: '#4a5568', secondary: '#718096' };
  }

  const colors = imageProperties.dominantColors.colors || [];
  if (colors.length === 0) {
    return { primary: '#4a5568', secondary: '#718096' };
  }

  const primary = rgbToHex(
    colors[0].color.red || 0,
    colors[0].color.green || 0,
    colors[0].color.blue || 0
  );

  const secondary =
    colors.length > 1
      ? rgbToHex(
          colors[1].color.red || 0,
          colors[1].color.green || 0,
          colors[1].color.blue || 0
        )
      : primary;

  return { primary, secondary };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Compute overall confidence from results
 */
function computeOverallConfidence(text: string[], labels: string[]): number {
  let confidence = 0;
  if (text.length > 0) confidence += 30;
  if (labels.length > 3) confidence += 40;
  if (labels.some((l) => l.toLowerCase().includes('cannabis'))) confidence += 30;
  return Math.min(100, confidence);
}


