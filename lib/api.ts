/**
 * API Client Service
 * Handles all API calls to backend routes
 */

export interface ScanUploadResponse {
  scan_id: string;
  image_url: string;
  status: string;
}

export interface ScanRecord {
  id: string;
  image_url: string;
  status: string;
  vision_results?: any;
  match_result?: any;
  created_at: string;
  processed_at?: string;
}

export interface VisualMatchResponse {
  match: {
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
    breakdown: {
      color: number;
      text: number;
      label: number;
      web: number;
    };
  };
  alternatives: Array<{
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
  }>;
  vision_results: any;
}

/**
 * Upload an image and create a scan record
 */
export async function uploadImage(file: File): Promise<ScanUploadResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Process a scan with Vision API
 */
export async function processScan(scanId: string): Promise<{ scan_id: string; status: string; vision_results: any }> {
  const response = await fetch(`/api/scans/${scanId}/process`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Processing failed');
  }

  return response.json();
}

/**
 * Get visual match for an image (uses v2 with fallback to v1)
 */
export async function getVisualMatch(
  imageUrl: string,
  scanId?: string
): Promise<VisualMatchResponse> {
  // Try v2 first
  try {
    const response = await fetch('/api/visual-match/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl, scan_id: scanId }),
    });

    if (response.ok) {
      const data = await response.json();
      // Transform v2 response to match v1 format
      return {
        match: {
          name: data.match.strain,
          slug: data.match.strain,
          confidence: data.match.score,
          reasoning: data.match.reasoning,
          breakdown: {
            color: data.match.breakdown.color,
            text: data.match.breakdown.labelText,
            label: data.match.breakdown.labelText,
            web: 0
          }
        },
        alternatives: data.alternatives.map((a: any) => ({
          name: a.strain,
          slug: a.strain,
          confidence: a.score,
          reasoning: a.reasoning
        })),
        vision_results: null
      };
    }
  } catch (v2Error) {
    console.warn('V2 matcher failed, falling back to v1:', v2Error);
  }

  // Fallback to v1
  const response = await fetch('/api/visual-match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl, scan_id: scanId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Visual matching failed');
  }

  return response.json();
}

/**
 * Get all scans
 */
export async function getScans(limit = 100, offset = 0): Promise<ScanRecord[]> {
  const response = await fetch(`/api/scans?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch scans');
  }

  const data = await response.json();
  return data.scans || [];
}

/**
 * Get scan by ID
 */
export async function getScan(scanId: string): Promise<ScanRecord> {
  const response = await fetch(`/api/scans/${scanId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch scan');
  }

  const data = await response.json();
  return data.scan;
}

