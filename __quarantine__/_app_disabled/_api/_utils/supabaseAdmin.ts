/**
 * Supabase Admin Utilities
 * Server-side Supabase client with service role permissions
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase admin credentials not configured');
}

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

/**
 * Upload file to Supabase Storage
 */
export async function uploadToStorage(
  bucket: string,
  filePath: string,
  file: Buffer | ArrayBuffer,
  contentType: string
): Promise<{ publicUrl: string; path: string }> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Ensure bucket exists
  const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
  if (bucketsError) {
    console.warn('Error listing buckets:', bucketsError);
  } else {
    const bucketExists = buckets?.some(b => b.name === bucket);
    if (!bucketExists) {
      // Try to create the bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
      });
      if (createError) {
        console.warn(`Bucket ${bucket} does not exist and could not be created:`, createError);
      } else {
        console.log(`✅ Created bucket: ${bucket}`);
      }
    }
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Update scan record in database
 */
export async function updateScan(
  scanId: string,
  updates: {
    status?: string;
    vision?: any;
    match?: any;
    enrichment?: any; // Enriched scan result data
    vision_results?: any; // Legacy support
    match_result?: any; // Legacy support
    processed_at?: string;
  }
): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Map legacy fields to new schema
  const mappedUpdates: any = { ...updates };
  if (updates.vision_results !== undefined) {
    mappedUpdates.vision = updates.vision_results;
    delete mappedUpdates.vision_results;
  }
  if (updates.match_result !== undefined) {
    mappedUpdates.match = updates.match_result;
    delete mappedUpdates.match_result;
  }

  const { error } = await supabaseAdmin
    .from('scans')
    .update({
      ...mappedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) {
    throw new Error(`Failed to update scan: ${error.message}`);
  }
}

/**
 * Get scan record from database
 */
export async function getScan(scanId: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { data, error } = await supabaseAdmin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get scan: ${error.message}`);
  }

  return data;
}

/**
 * Save report to database
 */
export async function saveReport(
  scanId: string,
  reportJson: Record<string, unknown>,
  confidenceScore: number
): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { error } = await supabaseAdmin
    .from('reports')
    .upsert({
      scan_id: scanId,
      report_json: reportJson,
      confidence_score: confidenceScore,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'scan_id',
    });

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }
}

/**
 * Create scan record in database
 */
export async function createScan(data: {
  id: string;
  image_path: string;
  image_url: string;
  status: string;
  user_id?: string;
  scan_type?: string; // 'id' or 'doctor'
}): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { error } = await supabaseAdmin
    .from('scans')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to create scan: ${error.message}`);
  }
}

