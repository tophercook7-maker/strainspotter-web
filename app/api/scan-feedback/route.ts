import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

/**
 * POST /api/scan-feedback
 * Submit feedback on a scan result
 * 
 * Body:
 * {
 *   scan_id: string (uuid)
 *   primary_strain_slug: string
 *   confidence_level_at_scan: 'LOW' | 'MEDIUM' | 'HIGH'
 *   feedback_type: 'RIGHT' | 'UNSURE' | 'WRONG'
 *   optional_note?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { scan_id, primary_strain_slug, confidence_level_at_scan, feedback_type, optional_note } = body;

    // Validation
    if (!scan_id || !primary_strain_slug || !confidence_level_at_scan || !feedback_type) {
      return NextResponse.json(
        { error: 'Missing required fields: scan_id, primary_strain_slug, confidence_level_at_scan, feedback_type' },
        { status: 400 }
      );
    }

    if (!['LOW', 'MEDIUM', 'HIGH'].includes(confidence_level_at_scan)) {
      return NextResponse.json(
        { error: 'confidence_level_at_scan must be LOW, MEDIUM, or HIGH' },
        { status: 400 }
      );
    }

    if (!['RIGHT', 'UNSURE', 'WRONG'].includes(feedback_type)) {
      return NextResponse.json(
        { error: 'feedback_type must be RIGHT, UNSURE, or WRONG' },
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

    // Insert feedback (immutable, no updates)
    const { data, error } = await supabaseAdmin
      .from('scan_feedback')
      .insert({
        scan_id,
        user_id: user.id,
        primary_strain_slug,
        confidence_level_at_scan,
        feedback_type,
        optional_note: optional_note || null,
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

