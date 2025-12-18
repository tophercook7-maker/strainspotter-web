"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface IntelligenceSettings {
  enabled: boolean;
  weekly_summaries: boolean;
  pattern_signals: boolean;
  what_you_missed: boolean;
}

export default function CommunityIntelligenceSettingsPage() {
  const [settings, setSettings] = useState<IntelligenceSettings>({
    enabled: true,
    weekly_summaries: true,
    pattern_signals: true,
    what_you_missed: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/community/intelligence-settings");
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/community/intelligence-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/settings" className="text-emerald-400 mb-4 inline-block text-sm">
          ← Back to Settings
        </Link>
        <h1 className="text-3xl font-semibold text-white mb-2">Community Intelligence</h1>
        <p className="text-white/80">
          Control how Community Intelligence appears in your experience.
        </p>
      </div>

      {/* Global Toggle */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Community Intelligence</h2>
            <p className="text-sm text-white/70">
              Enable or disable all intelligence features
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </section>

      {/* Per-Section Toggles */}
      {settings.enabled && (
        <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Section Controls</h2>

          {/* Weekly Summaries */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-white mb-1">Weekly Summaries</h3>
              <p className="text-sm text-white/70">
                Show weekly summaries on group pages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.weekly_summaries}
                onChange={(e) => setSettings({ ...settings, weekly_summaries: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Pattern Signals */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-white mb-1">Pattern Signals</h3>
              <p className="text-sm text-white/70">
                Show cross-group pattern insights on Dashboard
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pattern_signals}
                onChange={(e) => setSettings({ ...settings, pattern_signals: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* What You Missed */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-white mb-1">What You Missed</h3>
              <p className="text-sm text-white/70">
                Show missed items on Community Home
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.what_you_missed}
                onChange={(e) => setSettings({ ...settings, what_you_missed: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </section>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
        {saved && (
          <span className="text-emerald-400 text-sm">✓ Preferences saved</span>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl bg-white/5 backdrop-blur-lg p-4 border border-white/10">
        <p className="text-sm text-white/70">
          Community Intelligence provides quiet, read-only insights. You can ignore it completely with no penalty.
        </p>
      </div>
    </div>
  );
}
