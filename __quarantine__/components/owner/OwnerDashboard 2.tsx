'use client';

import { useEffect, useState } from 'react';

interface Metrics {
  scans: {
    id_scans_today: number;
    doctor_scans_today: number;
    id_scans_month: number;
    doctor_scans_month: number;
    failed_scans_today: number;
    avg_response_time_sec: number | null;
  };
  ai_health: {
    last_successful_call: string | null;
    last_error: string | null;
    feature_affected: string | null;
    fallback_used: boolean;
  };
  usage: {
    logbook_entries_today: number;
    grow_notes_created_today: number;
    tasks_created_today: number;
    community_saves_today: number;
  };
  monetization: {
    topup_purchases_today: number;
    topup_total_today: number;
    topup_purchases_month: number;
    topup_total_month: number;
    active_subscriptions: number;
    limits_hit_today: number;
  };
  pipeline: {
    scraper_running: boolean;
    last_scrape_timestamp: string | null;
    hero_generator_running: boolean;
    progress_percent: number | null;
  };
}

export default function OwnerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/owner/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setError(false);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">Owner Dashboard</h1>
          <p className="text-white/70">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">Owner Dashboard</h1>
          <p className="text-white/70">Error loading metrics. Please refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Owner Dashboard</h1>
          <p className="text-sm text-white/70 mt-1">System health and usage metrics</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* SCANS */}
          <MetricCard title="Scans">
            <MetricRow label="ID Scans Today" value={metrics.scans.id_scans_today} />
            <MetricRow label="Doctor Scans Today" value={metrics.scans.doctor_scans_today} />
            <MetricRow label="ID Scans This Month" value={metrics.scans.id_scans_month} />
            <MetricRow label="Doctor Scans This Month" value={metrics.scans.doctor_scans_month} />
            <MetricRow label="Failed Scans Today" value={metrics.scans.failed_scans_today} />
            {metrics.scans.avg_response_time_sec !== null && (
              <MetricRow label="Avg Response Time" value={`${metrics.scans.avg_response_time_sec}s`} />
            )}
          </MetricCard>

          {/* AI HEALTH */}
          <MetricCard title="AI Health">
            {metrics.ai_health.last_successful_call && (
              <MetricRow 
                label="Last Successful Call" 
                value={formatTimestamp(metrics.ai_health.last_successful_call)} 
              />
            )}
            {metrics.ai_health.last_error ? (
              <>
                <MetricRow label="Last Error" value={metrics.ai_health.last_error} />
                {metrics.ai_health.feature_affected && (
                  <MetricRow label="Feature Affected" value={metrics.ai_health.feature_affected} />
                )}
                <MetricRow label="Fallback Used" value={metrics.ai_health.fallback_used ? 'Yes' : 'No'} />
              </>
            ) : (
              <MetricRow label="Status" value="No errors" />
            )}
          </MetricCard>

          {/* USAGE */}
          <MetricCard title="Usage">
            <MetricRow label="Logbook Entries Today" value={metrics.usage.logbook_entries_today} />
            <MetricRow label="Grow Notes Created Today" value={metrics.usage.grow_notes_created_today} />
            <MetricRow label="Tasks Created Today" value={metrics.usage.tasks_created_today} />
            <MetricRow label="Community → Logbook Saves" value={metrics.usage.community_saves_today} />
          </MetricCard>

          {/* MONETIZATION */}
          <MetricCard title="Monetization">
            <MetricRow label="Top-ups Today" value={metrics.monetization.topup_purchases_today} />
            <MetricRow label="Top-up Revenue Today" value={`$${metrics.monetization.topup_total_today.toFixed(2)}`} />
            <MetricRow label="Top-ups This Month" value={metrics.monetization.topup_purchases_month} />
            <MetricRow label="Top-up Revenue Month" value={`$${metrics.monetization.topup_total_month.toFixed(2)}`} />
            <MetricRow label="Active Subscriptions" value={metrics.monetization.active_subscriptions} />
            <MetricRow label="Limits Hit Today" value={metrics.monetization.limits_hit_today} />
          </MetricCard>

          {/* PIPELINE STATUS */}
          <MetricCard title="Pipeline Status">
            <MetricRow 
              label="Scraper Running" 
              value={metrics.pipeline.scraper_running ? 'Yes' : 'No'} 
            />
            {metrics.pipeline.last_scrape_timestamp && (
              <MetricRow 
                label="Last Scrape" 
                value={formatTimestamp(metrics.pipeline.last_scrape_timestamp)} 
              />
            )}
            <MetricRow 
              label="Hero Generator Running" 
              value={metrics.pipeline.hero_generator_running ? 'Yes' : 'No'} 
            />
            {metrics.pipeline.progress_percent !== null && (
              <MetricRow 
                label="Progress" 
                value={`${metrics.pipeline.progress_percent}%`} 
              />
            )}
          </MetricCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-white/70">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
