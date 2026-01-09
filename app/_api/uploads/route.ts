import "server-only";
/**
 * POST /api/uploads
 * Upload an image and create a scan record
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createScan } from '@/app/api/_utils/supabaseAdmin';
import { uploadScanImage } from '@/app/api/_utils/storage';
import { getUser } from '@/lib/auth';
import { checkScanQuota, ScanType, formatLimitReachedResponse } from '@/app/api/_utils/scanQuota';

export async function POST(req: NextRequest) {
  try {
    console.log('[uploads] Starting upload');
    
    // Authentication required for quota checking
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required for scans' },
        { status: 401 }
      );
    }

    // SCAN REQUEST FLOW: Check quota before allowing upload
    let file: File;
    let contentType: string;
    let scanType: ScanType = 'id'; // Default to 'id' for regular scans

    // Handle both FormData and base64
    const contentTypeHeader = req.headers.get('content-type') || '';

    if (contentTypeHeader.includes('application/json')) {
      // Base64 encoded
      const body = await req.json();
      const { image, filename, mimeType, scan_type } = body;

      if (!image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }

      scanType = scan_type === 'doctor' ? 'doctor' : 'id';

      // Decode base64
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create File-like object
      file = new File([buffer], filename || 'image.jpg', { type: mimeType || 'image/jpeg' });
      contentType = mimeType || 'image/jpeg';
    } else {
      // FormData
      const formData = await req.formData();
      file = formData.get('image') as File;
      const scanTypeParam = formData.get('scan_type') as string;
      scanType = scanTypeParam === 'doctor' ? 'doctor' : 'id';

      if (!file) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }

      contentType = file.type;
    }

    // SCAN REQUEST FLOW: Check quota before allowing upload
    const quotaCheck = await checkScanQuota(user.id, scanType);
    
    if (!quotaCheck.allowed) {
      console.log(`[uploads] Quota check failed: ${quotaCheck.reason}`);
      
      // Return structured limit_reached response
      const limitResponse = formatLimitReachedResponse(quotaCheck, scanType);
      return NextResponse.json(
        {
          ...limitResponse,
          error: 'limit_reached', // Keep for backward compatibility
          message: quotaCheck.reason === 'not_allowed'
            ? 'Doctor scans are not available for your membership tier.'
            : quotaCheck.reason === 'quota_exceeded'
            ? 'Scan quota exceeded. Please wait for monthly reset or upgrade your membership.'
            : 'Scan not allowed',
        },
        { status: 403 }
      );
    }

    console.log(`[uploads] Quota check passed, proceeding with upload`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const scanId = randomUUID();
    const fileExt = file.name.split('.').pop() || 'jpg';

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    let imagePath: string;
    let imageUrl: string;
    try {
      const uploadResult = await uploadScanImage(buffer, contentType, fileExt);
      imagePath = uploadResult.image_path;
      imageUrl = uploadResult.image_url;
      console.log(`[uploads] Uploaded to ${imagePath}`);
    } catch (uploadError: any) {
      console.error('[uploads] Storage upload error:', uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Create scan record
    try {
      await createScan({
        id: scanId,
        image_path: imagePath,
        image_url: imageUrl,
        status: 'uploaded',
        user_id: user.id,
        scan_type: scanType, // Store scan type for processing
      });
      console.log(`[uploads] Created scan record: ${scanId}`);

      // SCAN REQUEST FLOW: Atomically increment usage after successful upload
      // Note: We already checked quota above, but incrementScanUsage does atomic check+increment
      // This ensures no race conditions if multiple requests come in simultaneously
      const { incrementScanUsage } = await import("@/app/api/_utils/scanQuota");
      const incrementResult = await incrementScanUsage(user.id, scanType);
      
      if (!incrementResult.success) {
        // This should not happen since we checked above, but handle it
        console.error(`[uploads] Failed to increment usage after upload: ${incrementResult.reason}`);
        // Rollback: Delete the scan record since we couldn't increment usage
        try {
          const { supabaseAdmin } = await import("@/app/api/_utils/supabaseAdmin");
          await supabaseAdmin?.from('scans').delete().eq('id', scanId);
        } catch (rollbackError) {
          console.error('[uploads] Failed to rollback scan record:', rollbackError);
        }
        // Re-check quota to get current state for response
        const recheck = await checkScanQuota(user.id, scanType);
        const limitResponse = formatLimitReachedResponse(recheck, scanType);
        return NextResponse.json(
          {
            ...limitResponse,
            error: 'limit_reached', // Keep for backward compatibility
            message: 'Scan quota exceeded. Please try again.',
          },
          { status: 403 }
        );
      }
      console.log(`[uploads] Incremented ${scanType} scan usage`);
    } catch (dbError: any) {
      console.error('[uploads] Database error:', dbError);
      // If the table doesn't exist, provide helpful error message
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        throw new Error('Scans table does not exist. Please run the migration in Supabase.');
      }
      throw dbError;
    }

    return NextResponse.json({
      scan_id: scanId,
      image_url: imageUrl,
      status: 'uploaded',
    });
  } catch (error: any) {
    console.error('[uploads] Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
