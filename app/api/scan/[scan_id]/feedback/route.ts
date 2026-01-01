import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { getUser } from '@/lib/auth';

/**
 * POST /api/scan/[scan_id]/feedback
 * Submit feedback for a scan analysis
 * Signal collection only - does not modify scan, report, or confidence
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const { scan_id } = await params;

    // Require authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { feedback_type, feedback_context } = body;

    // Validate feedback_type
    if (!feedback_type || !['agree', 'unsure', 'disagree'].includes(feedback_type)) {
      return NextResponse.json(
        { error: 'Invalid feedback_type. Must be: agree, unsure, or disagree' },
        { status: 400 }
      );
    }

    // Validate scan ownership
    const { data: scan, error: scanError } = await supabaseAdmin
      .from('scans')
      .select('id, user_id')
      .eq('id', scan_id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Check if user owns the scan (or scan is public)
    if (scan.user_id && scan.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - you can only provide feedback on your own scans' },
        { status: 403 }
      );
    }

    // Check if feedback already exists for this user and scan
    const { data: existingFeedback, error: checkError } = await supabaseAdmin
      .from('scan_feedback')
      .select('feedback_id')
      .eq('scan_id', scan_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[feedback] Error checking existing feedback:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing feedback' },
        { status: 500 }
      );
    }

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this scan' },
        { status: 409 }
      );
    }

    // Insert feedback (signal collection only)
    const { data: feedback, error: insertError } = await supabaseAdmin
      .from('scan_feedback')
      .insert({
        scan_id: scan_id,
        user_id: user.id,
        feedback_type: feedback_type,
        feedback_context: feedback_context || null,
      })
      .select('feedback_id, feedback_type, created_at')
      .single();

    if (insertError) {
      console.error('[feedback] Error inserting feedback:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback_id: feedback.feedback_id,
      message: 'Thank you for your feedback!',
    });
  } catch (error: unknown) {
    console.error('[feedback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

