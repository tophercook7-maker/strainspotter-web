import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

/**
 * GET /api/owner/metrics
 * Get system metrics for owner dashboard
 * Strictly gated - only owners can access
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user is owner
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_owner')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (!profile || !profile.is_owner) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch metrics (with safe fallbacks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. SCANS
    const scansMetrics = await getScansMetrics(todayISO, monthStart);

    // 2. AI HEALTH
    const aiHealth = await getAIHealthMetrics();

    // 3. USAGE
    const usageMetrics = await getUsageMetrics(todayISO);

    // 4. MONETIZATION
    const monetizationMetrics = await getMonetizationMetrics(todayISO, monthStart);

    // 5. PIPELINE STATUS
    const pipelineStatus = await getPipelineStatus();

    return NextResponse.json({
      scans: scansMetrics,
      ai_health: aiHealth,
      usage: usageMetrics,
      monetization: monetizationMetrics,
      pipeline: pipelineStatus,
    });
  } catch (error) {
    console.error('Error fetching owner metrics:', error);
    // Fail safely - return empty metrics
    return NextResponse.json({
      scans: getEmptyScansMetrics(),
      ai_health: getEmptyAIHealth(),
      usage: getEmptyUsage(),
      monetization: getEmptyMonetization(),
      pipeline: getEmptyPipeline(),
    });
  }
}

async function getScansMetrics(todayISO: string, monthStart: string) {
  try {
    if (!supabaseAdmin) return getEmptyScansMetrics();

    // ID scans today
    const { count: idScansToday } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'id')
      .gte('created_at', todayISO);

    // Doctor scans today
    const { count: doctorScansToday } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'doctor')
      .gte('created_at', todayISO);

    // Monthly totals
    const { count: idScansMonth } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'id')
      .gte('created_at', monthStart);

    const { count: doctorScansMonth } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'doctor')
      .gte('created_at', monthStart);

    // Failed scans (status = 'error' or 'quota_exceeded')
    const { count: failedScans } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .in('status', ['error', 'quota_exceeded'])
      .gte('created_at', todayISO);

    // Avg response time (approximate - using created_at to processed_at)
    const { data: recentScans } = await supabaseAdmin
      .from('scans')
      .select('created_at, updated_at, status')
      .eq('status', 'processed')
      .gte('created_at', todayISO)
      .limit(100);

    let avgResponseTime = null;
    if (recentScans && recentScans.length > 0) {
      const times = recentScans
        .map(s => {
          const created = new Date(s.created_at).getTime();
          const updated = new Date(s.updated_at).getTime();
          return updated - created;
        })
        .filter(t => t > 0);
      
      if (times.length > 0) {
        avgResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000); // seconds
      }
    }

    return {
      id_scans_today: idScansToday || 0,
      doctor_scans_today: doctorScansToday || 0,
      id_scans_month: idScansMonth || 0,
      doctor_scans_month: doctorScansMonth || 0,
      failed_scans_today: failedScans || 0,
      avg_response_time_sec: avgResponseTime,
    };
  } catch (error) {
    console.error('Error fetching scans metrics:', error);
    return getEmptyScansMetrics();
  }
}

async function getAIHealthMetrics() {
  try {
    // Check for recent AI errors in logs or scan enrichment
    // For now, return placeholder - can be enhanced with actual AI error tracking
    return {
      last_successful_call: new Date().toISOString(), // Placeholder
      last_error: null,
      feature_affected: null,
      fallback_used: false,
    };
  } catch (error) {
    console.error('Error fetching AI health metrics:', error);
    return getEmptyAIHealth();
  }
}

async function getUsageMetrics(todayISO: string) {
  try {
    if (!supabaseAdmin) return getEmptyUsage();

    // Logbook entries today
    const { count: logbookEntries } = await supabaseAdmin
      .from('garden_logbook_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // Grow Notes created today
    const { count: growNotes } = await supabaseAdmin
      .from('grow_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // Tasks created today (if tasks table exists)
    let tasksCreated = 0;
    try {
      const { count } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);
      tasksCreated = count || 0;
    } catch {
      // Tasks table might not exist
    }

    // Community → Logbook saves (check logbook entries with community source)
    const { count: communitySaves } = await supabaseAdmin
      .from('garden_logbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'community')
      .gte('created_at', todayISO);

    return {
      logbook_entries_today: logbookEntries || 0,
      grow_notes_created_today: growNotes || 0,
      tasks_created_today: tasksCreated,
      community_saves_today: communitySaves || 0,
    };
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    return getEmptyUsage();
  }
}

async function getMonetizationMetrics(todayISO: string, monthStart: string) {
  try {
    if (!supabaseAdmin) return getEmptyMonetization();

    // Top-up purchases today
    const { data: topupsToday, count: topupCountToday } = await supabaseAdmin
      .from('transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'topup')
      .gte('created_at', todayISO);

    const topupTotalToday = topupsToday?.reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0) || 0;

    // Top-up purchases this month
    const { data: topupsMonth, count: topupCountMonth } = await supabaseAdmin
      .from('transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'topup')
      .gte('created_at', monthStart);

    const topupTotalMonth = topupsMonth?.reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0) || 0;

    // Active subscriptions (membership != 'free')
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('membership', 'free')
      .not('membership', 'is', null);

    // Limits hit today (quota_exceeded scans)
    const { count: limitsHitToday } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'quota_exceeded')
      .gte('created_at', todayISO);

    return {
      topup_purchases_today: topupCountToday || 0,
      topup_total_today: topupTotalToday,
      topup_purchases_month: topupCountMonth || 0,
      topup_total_month: topupTotalMonth,
      active_subscriptions: activeSubscriptions || 0,
      limits_hit_today: limitsHitToday || 0,
    };
  } catch (error) {
    console.error('Error fetching monetization metrics:', error);
    return getEmptyMonetization();
  }
}

async function getPipelineStatus() {
  try {
    // Check scraper state (if state files exist)
    // For now, return placeholder - can be enhanced with actual state file reading
    return {
      scraper_running: false,
      last_scrape_timestamp: null,
      hero_generator_running: false,
      progress_percent: null,
    };
  } catch (error) {
    console.error('Error fetching pipeline status:', error);
    return getEmptyPipeline();
  }
}

// Empty metric fallbacks
function getEmptyScansMetrics() {
  return {
    id_scans_today: 0,
    doctor_scans_today: 0,
    id_scans_month: 0,
    doctor_scans_month: 0,
    failed_scans_today: 0,
    avg_response_time_sec: null,
  };
}

function getEmptyAIHealth() {
  return {
    last_successful_call: null,
    last_error: null,
    feature_affected: null,
    fallback_used: false,
  };
}

function getEmptyUsage() {
  return {
    logbook_entries_today: 0,
    grow_notes_created_today: 0,
    tasks_created_today: 0,
    community_saves_today: 0,
  };
}

function getEmptyMonetization() {
  return {
    topup_purchases_today: 0,
    topup_total_today: 0,
    topup_purchases_month: 0,
    topup_total_month: 0,
    active_subscriptions: 0,
    limits_hit_today: 0,
  };
}

function getEmptyPipeline() {
  return {
    scraper_running: false,
    last_scrape_timestamp: null,
    hero_generator_running: false,
    progress_percent: null,
  };
}
