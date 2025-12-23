/**
 * POST /api/scans/[scan_id]/process
 * Process a scan with Vision API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScan, updateScan } from '@/app/api/_utils/supabaseAdmin';
import { analyzeImage } from '@/app/api/_utils/vision';
import { getUser } from '@/lib/auth';
import { checkScanQuota, incrementScanUsage, ScanType, formatLimitReachedResponse } from '@/app/api/_utils/scanQuota';
import { enrichDoctorScanResult } from '@/lib/scan/enrichment';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const { scan_id } = await params;
    console.log(`[process] Processing scan: ${scan_id}`);

    // Load scan row
    const scan = await getScan(scan_id);
    if (!scan) {
      console.error(`[process] Scan not found: ${scan_id}`);
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // SCAN REQUEST FLOW: Check quota if user is authenticated
    if (scan.user_id) {
      const scanType: ScanType = (scan.scan_type === 'doctor' ? 'doctor' : 'id');
      const quotaCheck = await checkScanQuota(scan.user_id, scanType);
      
      if (!quotaCheck.allowed) {
        console.log(`[process] Quota check failed for user ${scan.user_id}: ${quotaCheck.reason}`);
        await updateScan(scan_id, {
          status: 'quota_exceeded',
        });
        
        // Return structured limit_reached response
        const limitResponse = formatLimitReachedResponse(quotaCheck, scanType);
        return NextResponse.json(
          {
            ...limitResponse,
            error: 'limit_reached', // Keep for backward compatibility
          },
          { status: 403 }
        );
      }

      // Atomically increment usage before processing
      const incrementResult = await incrementScanUsage(scan.user_id, scanType);
      if (!incrementResult.success) {
        console.error(`[process] Failed to increment usage: ${incrementResult.reason}`);
        // This should not happen since we checked above, but handle it gracefully
        await updateScan(scan_id, {
          status: 'quota_exceeded',
        });
        
        // Re-check quota to get current state for response
        const recheck = await checkScanQuota(scan.user_id, scanType);
        const limitResponse = formatLimitReachedResponse(recheck, scanType);
        return NextResponse.json(
          {
            ...limitResponse,
            error: 'limit_reached', // Keep for backward compatibility
          },
          { status: 403 }
        );
      }
      console.log(`[process] Incremented ${scanType} scan usage for user ${scan.user_id}`);
    }

    // Update status to processing
    await updateScan(scan_id, {
      status: 'processing',
    });

    // Run analyzeImage (it handles downloading from URL internally)
    console.log(`[process] Running vision analysis on: ${scan.image_url}`);
    const visionResults = await analyzeImage(scan.image_url);
    console.log(`[process] Vision results: ${visionResults.text.length} text lines, ${visionResults.labels.length} labels`);

    // Enrich doctor scans with health analysis
    let enrichment = null;
    if (scan.scan_type === 'doctor') {
      enrichment = enrichDoctorScanResult(visionResults, visionResults.labels);
      console.log(`[process] Doctor scan enriched: ${enrichment.explanation}`);
    }

    // Update scan row
    const updateData: any = {
      status: 'processed',
      vision: visionResults,
    };
    
    if (enrichment) {
      updateData.enrichment = enrichment;
    }
    
    await updateScan(scan_id, updateData);

    return NextResponse.json({
      scan_id,
      status: 'processed',
      vision: visionResults,
      ...(enrichment && { enrichment }),
    });
  } catch (error: any) {
    console.error('[process] Process error:', error);
    
    // Update scan status to error
    try {
      const { scan_id } = await params;
      await updateScan(scan_id, {
        status: 'error',
      });
    } catch (updateError) {
      console.error('[process] Failed to update scan status to error:', updateError);
    }

    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

