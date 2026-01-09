/**
 * Canary Alerting Utility
 * Evaluates canary vs control metrics and generates admin alerts
 * Read-only, non-intrusive, fire-and-forget
 */

import { supabaseAdmin } from './supabaseAdmin';

interface AlertMetrics {
  canary_samples?: number;
  control_samples?: number;
  disagree_canary?: number;
  disagree_control?: number;
  phenotype_agreement_delta?: number;
  shadow_better_rate?: number;
  days_analyzed?: number;
}

/**
 * Hash a string to determine if user is in canary (deterministic)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function isInCanary(userId: string): boolean {
  return (hashString(userId) % 100) < 10;
}

/**
 * Evaluate canary vs control feedback
 */
async function evaluateFeedbackAlerts(): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    // Get feedback from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: feedback, error } = await supabaseAdmin
      .from('scan_feedback')
      .select('scan_id, user_id, feedback_type, created_at, scans!inner(user_id)')
      .gte('created_at', sevenDaysAgo);

    if (error || !feedback || feedback.length === 0) {
      return; // No feedback to analyze
    }

    // Separate canary vs control
    let canaryDisagree = 0;
    let canaryTotal = 0;
    let controlDisagree = 0;
    let controlTotal = 0;

    for (const fb of feedback) {
      const userId = (fb.scans as any)?.user_id || fb.user_id;
      if (!userId) continue;

      const inCanary = isInCanary(userId);
      if (fb.feedback_type === 'disagree') {
        if (inCanary) canaryDisagree++;
        else controlDisagree++;
      }
      if (inCanary) canaryTotal++;
      else controlTotal++;
    }

    // Check if we have enough samples
    if (canaryTotal < 50 || controlTotal < 50) {
      return; // Not enough samples
    }

    const disagreeCanaryRate = canaryTotal > 0 ? canaryDisagree / canaryTotal : 0;
    const disagreeControlRate = controlTotal > 0 ? controlDisagree / controlTotal : 0;
    const delta = disagreeCanaryRate - disagreeControlRate;

    // Check if alert already exists today for this condition
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAlert } = await supabaseAdmin
      .from('admin_alerts')
      .select('alert_id')
      .eq('alert_type', 'canary_feedback')
      .gte('created_at', `${today}T00:00:00Z`)
      .maybeSingle();

    if (existingAlert) {
      return; // Already alerted today
    }

    // Trigger WARNING if canary disagree rate is significantly higher
    if (delta > 0.03) {
      await supabaseAdmin.from('admin_alerts').insert({
        alert_type: 'canary_feedback',
        severity: 'warning',
        message: `Canary disagree rate is ${(delta * 100).toFixed(1)}% higher than control (${(disagreeCanaryRate * 100).toFixed(1)}% vs ${(disagreeControlRate * 100).toFixed(1)}%)`,
        metrics: {
          canary_samples: canaryTotal,
          control_samples: controlTotal,
          disagree_canary: disagreeCanaryRate,
          disagree_control: disagreeControlRate,
        },
      });
    }

    // Trigger INFO if canary is stable or better
    if (delta <= 0 && canaryTotal >= 100) {
      await supabaseAdmin.from('admin_alerts').insert({
        alert_type: 'canary_feedback',
        severity: 'info',
        message: `Canary feedback stable: ${(disagreeCanaryRate * 100).toFixed(1)}% disagree (control: ${(disagreeControlRate * 100).toFixed(1)}%)`,
        metrics: {
          canary_samples: canaryTotal,
          control_samples: controlTotal,
          disagree_canary: disagreeCanaryRate,
          disagree_control: disagreeControlRate,
        },
      });
    }
  } catch (error) {
    console.warn('[canaryAlerts] Error evaluating feedback alerts:', error);
    // Fail silently - fire-and-forget
  }
}

/**
 * Evaluate canary vs control metrics from model_comparisons
 */
async function evaluateMetricsAlerts(): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    // Get comparisons from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: comparisons, error } = await supabaseAdmin
      .from('model_comparisons')
      .select('scan_id, delta_metrics, created_at, scans!inner(user_id)')
      .gte('created_at', sevenDaysAgo)
      .not('delta_metrics', 'is', null);

    if (error || !comparisons || comparisons.length === 0) {
      return;
    }

    // Separate canary vs control
    let canaryRegressions = 0;
    let canaryTotal = 0;
    let canaryImprovements = 0;

    for (const comp of comparisons) {
      const userId = (comp.scans as any)?.user_id;
      if (!userId) continue;

      const inCanary = isInCanary(userId);
      if (!inCanary) continue; // Only analyze canary samples

      canaryTotal++;
      const delta = comp.delta_metrics as { phenotype_agreement_delta?: number } | null;
      if (delta?.phenotype_agreement_delta) {
        if (delta.phenotype_agreement_delta < -0.15) {
          canaryRegressions++;
        } else if (delta.phenotype_agreement_delta >= 0.05) {
          canaryImprovements++;
        }
      }
    }

    if (canaryTotal < 50) {
      return; // Not enough samples
    }

    const regressionRate = canaryTotal > 0 ? canaryRegressions / canaryTotal : 0;
    const improvementRate = canaryTotal > 0 ? canaryImprovements / canaryTotal : 0;

    // Check if alert already exists today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAlert } = await supabaseAdmin
      .from('admin_alerts')
      .select('alert_id')
      .eq('alert_type', 'canary_metrics')
      .gte('created_at', `${today}T00:00:00Z`)
      .maybeSingle();

    if (existingAlert) {
      return;
    }

    // Trigger WARNING if regression rate is high
    if (regressionRate > 0.15) {
      await supabaseAdmin.from('admin_alerts').insert({
        alert_type: 'canary_metrics',
        severity: 'warning',
        message: `High phenotype agreement regression in canary: ${(regressionRate * 100).toFixed(1)}% of samples regressed`,
        metrics: {
          canary_samples: canaryTotal,
          phenotype_agreement_regression: regressionRate,
        },
      });
    }

    // Trigger INFO if improvement rate is good
    if (improvementRate >= 0.05 && canaryTotal >= 100) {
      await supabaseAdmin.from('admin_alerts').insert({
        alert_type: 'canary_metrics',
        severity: 'info',
        message: `Phenotype agreement improvement in canary: ${(improvementRate * 100).toFixed(1)}% of samples improved`,
        metrics: {
          canary_samples: canaryTotal,
          phenotype_agreement_delta: improvementRate,
        },
      });
    }
  } catch (error) {
    console.warn('[canaryAlerts] Error evaluating metrics alerts:', error);
    // Fail silently
  }
}

/**
 * Evaluate trend alerts from promotion readiness data
 */
async function evaluateTrendAlerts(): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    // Get last 3 days of readiness data (simplified - would need to aggregate)
    // For now, check if shadow_better_rate has decreased 2 days in a row
    // This is a placeholder - would need actual time-series data
    
    // Check if alert already exists today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAlert } = await supabaseAdmin
      .from('admin_alerts')
      .select('alert_id')
      .eq('alert_type', 'canary_trend')
      .gte('created_at', `${today}T00:00:00Z`)
      .maybeSingle();

    if (existingAlert) {
      return;
    }

    // Placeholder: Would check actual trend data
    // For now, skip trend alerts until we have time-series aggregation
  } catch (error) {
    console.warn('[canaryAlerts] Error evaluating trend alerts:', error);
    // Fail silently
  }
}

/**
 * Run all canary alert evaluations
 * Fire-and-forget, non-blocking
 */
export async function evaluateCanaryAlerts(): Promise<void> {
  // Run all evaluations in parallel, ignore failures
  await Promise.allSettled([
    evaluateFeedbackAlerts(),
    evaluateMetricsAlerts(),
    evaluateTrendAlerts(),
  ]);
}

