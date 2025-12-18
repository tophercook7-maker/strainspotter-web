/**
 * Storage Utilities
 * Helpers for uploading and retrieving images from Supabase Storage
 */

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Upload scan image to storage
 */
export async function uploadScanImage(
  buffer: Buffer,
  contentType: string,
  ext: string
): Promise<{ image_path: string; image_url: string }> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { randomUUID } = await import('crypto');
  const scanId = randomUUID();
  const imagePath = `scans/${scanId}.${ext}`;

  // Upload to storage
  const { data, error } = await supabaseAdmin.storage
    .from('scans')
    .upload(imagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get URL (public or signed)
  const imageUrl = await getPublicOrSignedUrl(imagePath);

  return {
    image_path: data.path,
    image_url: imageUrl,
  };
}

/**
 * Get public or signed URL for a storage path
 * If bucket is private, generates a signed URL (60 min expiry)
 * If bucket is public, returns public URL
 */
export async function getPublicOrSignedUrl(path: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Try to get public URL first
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('scans')
    .getPublicUrl(path);

  // Check if bucket is public by trying to access the URL
  // For now, we'll generate signed URLs for private buckets
  // In production, you might want to check bucket settings
  try {
    const testResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
    if (testResponse.ok) {
      return publicUrlData.publicUrl;
    }
  } catch {
    // If public URL doesn't work, generate signed URL
  }

  // Generate signed URL (60 minutes expiry)
  const { data: signedData, error } = await supabaseAdmin.storage
    .from('scans')
    .createSignedUrl(path, 3600); // 60 minutes

  if (error || !signedData) {
    // Fallback to public URL even if it might not work
    return publicUrlData.publicUrl;
  }

  return signedData.signedUrl;
}
