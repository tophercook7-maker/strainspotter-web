import "server-only";
/**
 * POST /api/scans/[scan_id]/process
 * Process a scan with Vision API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScan, updateScan } from '@/app/api/_utils/supabaseAdmin';
import { analyzeImage } from '@/app/api/_utils/vision';
import { checkScanQuota, incrementScanUsage, ScanType, formatLimitReachedResponse } from '@/app/api/_utils/scanQuota';
import { enrichDoctorScanResult } from '@/lib/scan/enrichment';
import { assessImageQuality, extractVisualFeatures } from '@/app/api/_utils/imageIntelligence';
import { detectPackaging, extractLabelInfo, checkLabelConsistency } from '@/app/api/_utils/packagingIntelligence';

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

    // PHASE 2: Image Quality Assessment (before vision/matching)
    let imageQuality = null;
    let visualFeatures = null;
    try {
      console.log(`[process] Assessing image quality and extracting visual features`);
      const imageResponse = await fetch(scan.image_url);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        // Assess image quality
        imageQuality = await assessImageQuality(imageBuffer);
        console.log(`[process] Image quality: ${imageQuality.overall} (blur: ${imageQuality.blur}, exposure: ${imageQuality.exposure}, resolution: ${imageQuality.resolution})`);
        
        // Extract visual features
        visualFeatures = await extractVisualFeatures(imageBuffer);
        console.log(`[process] Visual features extracted:`, visualFeatures);
      }
    } catch (intelligenceError) {
      console.warn('[process] Image intelligence assessment failed (non-blocking):', intelligenceError);
      // Continue processing even if intelligence fails
    }

    // Run analyzeImage (it handles downloading from URL internally)
    console.log(`[process] Running vision analysis on: ${scan.image_url}`);
    const visionResults = await analyzeImage(scan.image_url);
    console.log(`[process] Vision results: ${visionResults.text.length} text lines, ${visionResults.labels.length} labels`);

    // PHASE 1 & 2: Packaging detection and label extraction
    let packagingDetected = false;
    let packagingLabel = null;
    let packagingConsistency = null;
    try {
      packagingDetected = detectPackaging(visionResults);
      console.log(`[process] Packaging detected: ${packagingDetected}`);
      
      if (packagingDetected) {
        packagingLabel = extractLabelInfo(visionResults);
        console.log(`[process] Label info extracted:`, packagingLabel);
        
        // PHASE 3: Check consistency with visual phenotype (if available)
        if (visualFeatures && packagingLabel.strain_label) {
          // Get phenotype families from visual features (simplified - will be enhanced by report generator)
          const phenotypeFamilies: string[] = []; // Will be populated by report generator
          packagingConsistency = checkLabelConsistency(packagingLabel, phenotypeFamilies, visualFeatures);
          console.log(`[process] Label consistency: ${packagingConsistency.consistency_score} - ${packagingConsistency.explanation}`);
        }
      }
    } catch (packagingError) {
      console.warn('[process] Packaging analysis failed (non-blocking):', packagingError);
      // Continue processing even if packaging analysis fails
    }

    // Enrich doctor scans with health analysis
    let existingEnrichment = scan.enrichment || null;
    if (scan.scan_type === 'doctor') {
      const doctorEnrichment = enrichDoctorScanResult(visionResults, visionResults.labels);
      console.log(`[process] Doctor scan enriched: ${doctorEnrichment.explanation}`);
      
      // Merge doctor enrichment with intelligence data
      existingEnrichment = {
        ...(existingEnrichment || {}),
        ...doctorEnrichment,
      };
    }

    // Build enrichment object with intelligence data
    const enrichment: Record<string, unknown> = existingEnrichment || {};
    if (imageQuality) {
      enrichment.image_quality = imageQuality;
    }
    if (visualFeatures) {
      enrichment.visual_features = visualFeatures;
    }
    if (packagingDetected) {
      enrichment.packaging_detected = true;
      if (packagingLabel) {
        enrichment.packaging_label = packagingLabel;
      }
      if (packagingConsistency) {
        enrichment.packaging_consistency = packagingConsistency;
      }
    }

    // Update scan row (preserve legacy vision and match fields)
    const updateData: {
      status: string;
      vision: typeof visionResults;
      enrichment?: Record<string, unknown>;
    } = {
      status: 'processed',
      vision: visionResults,
    };
    
    // Only add enrichment if we have data to add
    if (Object.keys(enrichment).length > 0) {
      updateData.enrichment = enrichment;
    }
    
    await updateScan(scan_id, updateData);

    return NextResponse.json({
      scan_id,
      status: 'processed',
      vision: visionResults,
      ...(Object.keys(enrichment).length > 0 && { enrichment }),
    });
  } catch (error: unknown) {
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

    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

