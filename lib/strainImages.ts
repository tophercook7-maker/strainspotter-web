/**
 * Strain Images Utility
 * Loads scraped images from strain_images.json
 */

interface StrainImage {
  strain_slug: string;
  strain_name?: string;
  image_url: string;
  source: string;
  assigned_from?: string;
  assigned_at?: string;
}

let cachedImages: StrainImage[] | null = null;
let cacheLoadAttempted = false;

/**
 * Load strain images from JSON file
 * Caches result for performance
 */
export async function loadStrainImages(): Promise<StrainImage[]> {
  // Return cache if already loaded
  if (cachedImages !== null) {
    return cachedImages;
  }

  // Return empty if we've already tried and failed
  if (cacheLoadAttempted) {
    return [];
  }

  cacheLoadAttempted = true;

  try {
    // Try API route first (most reliable)
    try {
      const response = await fetch('/api/strain-images', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          cachedImages = data;
          return data;
        }
      }
    } catch (apiErr) {
      // Fall through to direct file paths
    }

    // Fallback: Try direct file paths
    const paths = [
      '/data/strain_images.json',
      '/strain_images.json',
    ];

    for (const path of paths) {
      try {
        const response = await fetch(path, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            cachedImages = data;
            return data;
          }
        }
      } catch (err) {
        // Try next path
        continue;
      }
    }

    // If all paths fail, return empty
    cachedImages = [];
    return [];
  } catch (error) {
    console.warn('[STRAIN IMAGES] Failed to load images:', error);
    cachedImages = [];
    return [];
  }
}

/**
 * Get images for a specific strain slug
 */
export async function getStrainImages(slug: string): Promise<StrainImage[]> {
  const allImages = await loadStrainImages();
  return allImages.filter(img => img.strain_slug === slug);
}

/**
 * Get primary image for a strain (first available)
 */
export async function getStrainPrimaryImage(slug: string): Promise<string | null> {
  const images = await getStrainImages(slug);
  return images.length > 0 ? images[0].image_url : null;
}
