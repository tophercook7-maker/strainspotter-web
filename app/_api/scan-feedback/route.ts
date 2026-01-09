import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

/**
 * POST /api/scan-feedback
 * Submit feedback signal on a scan result
 * 
 * Signal-collection system for pattern recognition improvement.
 * Users express confidence alignment, not ground truth validation.
 * 
 * Body:
 * {
 *   scan_id: string (uuid)
 *   confidence_level: 'LOW' | 'MEDIUM' | 'HIGH'
 *   feedback_signal: 'ALIGNED' | 'UNSURE' | 'MISMATCH'
 *   optional_note?: string (private, for review only)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { scan_id, confidence_level, feedback_signal, optional_note } = body;

    // Validation
    if (!scan_id || !confidence_level || !feedback_signal) {
      return NextResponse.json(
        { error: 'Missing required fields: scan_id, confidence_level, feedback_signal' },
        { status: 400 }
      );
    }

    if (!['LOW', 'MEDIUM', 'HIGH'].includes(confidence_level)) {
      return NextResponse.json(
        { error: 'confidence_level must be LOW, MEDIUM, or HIGH' },
        { status: 400 }
      );
    }

    if (!['ALIGNED', 'UNSURE', 'MISMATCH'].includes(feedback_signal)) {
      return NextResponse.json(
        { error: 'feedback_signal must be ALIGNED, UNSURE, or MISMATCH' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if feedback already exists (enforced by unique constraint, but check for better error)
    const { data: existing } = await supabaseAdmin
      .from('scan_feedback')
      .select('id')
      .eq('scan_id', scan_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this scan' },
        { status: 409 }
      );
    }

    // Insert feedback (immutable, signal collection only)
    const { data, error } = await supabaseAdmin
      .from('scan_feedback')
      .insert({
        scan_id,
        user_id: user.id,
        confidence_level,
        feedback_signal,
        optional_note: optional_note || null,
        // Note: image_quality_bucket and phenotype_cluster_id would be set server-side
        // based on scan metadata, not from user input
      })
      .select()
      .single();

    if (error) {
      console.error('[scan-feedback] Insert error:', error);
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Feedback already submitted for this scan' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback_id: data.id,
    });
  } catch (error: any) {
    console.error('[scan-feedback] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
