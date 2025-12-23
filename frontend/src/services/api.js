const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';

/**
 * Upload an image
 * @param {File} file - Image file to upload
 * @returns {Promise<Object>} Upload result with scan_id and image_url
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/uploads`, {
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
 * Process a scan
 * @param {string} scanId - Scan ID
 * @returns {Promise<Object>} Process result with vision_results
 */
export async function processScan(scanId) {
  const response = await fetch(`${API_BASE_URL}/api/scans/${scanId}/process`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Processing failed');
  }

  return response.json();
}

/**
 * Get visual match for an image
 * @param {string} imageUrl - Image URL
 * @param {string} scanId - Optional scan ID
 * @returns {Promise<Object>} Match result with match and alternatives
 */
export async function getVisualMatch(imageUrl, scanId = null) {
  const response = await fetch(`${API_BASE_URL}/api/visual-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl, scan_id: scanId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Visual match failed');
  }

  return response.json();
}

/**
 * Get all scans
 * @returns {Promise<Array>} Array of scans
 */
export async function getScans() {
  const response = await fetch(`${API_BASE_URL}/api/scans`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch scans');
  }

  const data = await response.json();
  return data.scans || [];
}

/**
 * Get scan by ID
 * @param {string} scanId - Scan ID
 * @returns {Promise<Object>} Scan data
 */
export async function getScan(scanId) {
  const response = await fetch(`${API_BASE_URL}/api/scans/${scanId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch scan');
  }

  const data = await response.json();
  return data.scan;
}

