'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMembership } from '@/lib/hooks/useMembership';
import { Plant, PlantHealth, PlantMedium, PlantStage, usePlants } from '@/lib/hooks/usePlants';

const stagePillClasses: Record<string, string> = {
  seedling: 'bg-emerald-500/15 text-emerald-200 border border-emerald-700/60',
  veg: 'bg-green-500/15 text-green-200 border border-green-700/60',
  flower: 'bg-violet-500/15 text-violet-200 border border-violet-700/60',
  dry: 'bg-amber-500/15 text-amber-200 border border-amber-700/60',
  cure: 'bg-amber-500/15 text-amber-200 border border-amber-700/60',
  harvested: 'bg-slate-500/15 text-slate-200 border border-slate-600/60',
  archived: 'bg-slate-800 text-slate-300 border border-slate-700',
};

const healthDot: Record<string, string> = {
  healthy: 'bg-emerald-400',
  watching: 'bg-amber-400',
  stressed: 'bg-orange-500',
  critical: 'bg-rose-500',
};

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}

function daysInGrow(start?: string | null) {
  if (!start) return '—';
  const startDate = new Date(start);
  const now = new Date();
  const diff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return `${diff}d`;
}

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plantId = params?.id as string;

  const { membership, loading: membershipLoading } = useMembership();
  const { getPlant, updatePlant, archivePlant } = usePlants();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'journal' | 'photos' | 'lab'>('overview');
  const [form, setForm] = useState<Partial<Plant>>({});

  const loadPlant = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlant(plantId);
      setPlant(data);
      setForm({
        name: data?.name,
        strain_name: data?.strain_name || '',
        stage: data?.stage,
        room: data?.room || '',
        medium: data?.medium,
        start_date: data?.start_date?.slice(0, 10),
        expected_harvest: data?.expected_harvest?.slice(0, 10),
        notes: data?.notes || '',
        tags: data?.tags || [],
        health_status: data?.health_status || 'healthy',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load plant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (membership?.tier && membership.tier !== 'free' && plantId) {
      loadPlant();
    }
  }, [membership?.tier, plantId]);

  const updateField = (field: keyof Plant, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!plant) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        tags: (form.tags as string[] | undefined)?.filter(Boolean) ?? [],
        room: form.room || null,
        strain_name: form.strain_name || null,
        notes: form.notes || null,
      };
      const updated = await updatePlant(plant.id, payload);
      setPlant(updated);
      setEditMode(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update plant');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (stage: PlantStage) => {
    if (!plant) return;
    try {
      setSaving(true);
      const updated = await updatePlant(plant.id, { stage });
      setPlant(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!plant) return;
    try {
      setSaving(true);
      await archivePlant(plant.id);
      router.push('/garden/plants');
    } catch (err: any) {
      setError(err?.message || 'Failed to archive plant');
    } finally {
      setSaving(false);
    }
  };

  const uniqueTags = useMemo(() => form.tags as string[] | undefined, [form.tags]);

  if (membershipLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading plant...</p>
        </div>
      </div>
    );
  }

  if (!membership || membership.tier === 'free') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-emerald-300 mb-2">Plant Manager</h1>
          <p className="text-slate-400 mb-6">Track every plant, from seed to cure.</p>
          <div className="p-4 mb-4 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-200">
            Join the Garden to unlock Plant Manager and the full grow experience for $9.99/month.
          </div>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="bg-rose-900/40 border border-rose-700 text-rose-100 rounded-lg p-3 text-sm">
            {error || 'Plant not found'}
          </div>
          <Link href="/garden/plants" className="text-emerald-300 hover:text-emerald-200 text-sm">
            ← Back to Plant Manager
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-emerald-300">{plant.name}</h1>
              {plant.stage && (
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${stagePillClasses[plant.stage] || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                  {plant.stage}
                </span>
              )}
              {plant.health_status && (
                <span className="flex items-center gap-2 text-sm text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${healthDot[plant.health_status] || 'bg-emerald-400'}`} />
                  <span className="capitalize">{plant.health_status}</span>
                </span>
              )}
            </div>
            <p className="text-slate-400">
              Strain: {plant.strain_name || 'Unknown strain'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStageChange('harvested')}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:border-slate-500"
            >
              Mark as Harvested
            </button>
            <button
              onClick={() => setEditMode((v) => !v)}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {editMode ? 'Close Edit' : 'Edit'}
            </button>
            <button
              onClick={handleArchive}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-rose-700/80 border border-rose-600 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              Archive
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-900/40 border border-rose-700 text-rose-100 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2">
          {(['seedling', 'veg', 'flower', 'dry', 'cure', 'harvested'] as PlantStage[]).map((stage) => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              className={`px-3 py-1 rounded-full text-xs capitalize border ${
                plant.stage === stage
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="border-b border-slate-800 flex overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'journal', label: 'Journal' },
              { key: 'photos', label: 'Photos' },
              { key: 'lab', label: 'COAs / Lab' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-semibold ${
                  activeTab === tab.key
                    ? 'text-emerald-300 border-b-2 border-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Room</div>
                  <div className="text-sm text-slate-100">{plant.room || 'Not set'}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Medium</div>
                  <div className="text-sm text-slate-100">{plant.medium || 'Not set'}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Start Date</div>
                  <div className="text-sm text-slate-100">{formatDate(plant.start_date)}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Expected Harvest</div>
                  <div className="text-sm text-slate-100">{formatDate(plant.expected_harvest)}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Days in Grow</div>
                  <div className="text-sm text-emerald-300 font-semibold">{daysInGrow(plant.start_date)}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Tags</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(uniqueTags || []).length === 0 ? (
                      <span className="text-sm text-slate-400">No tags</span>
                    ) : (
                      uniqueTags!.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-slate-700 text-slate-100 text-xs rounded-full">
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-2">Notes</div>
                <div className="text-sm text-slate-100 whitespace-pre-line">
                  {plant.notes || 'No notes yet.'}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="p-4 text-slate-400 text-sm">
              {activeTab === 'journal' && 'Journal coming soon.'}
              {activeTab === 'photos' && 'Photos coming soon.'}
              {activeTab === 'lab' && 'COAs / Lab coming soon.'}
            </div>
          )}
        </div>

        {editMode && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Plant Name</label>
                <input
                  value={form.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Strain</label>
                <input
                  value={(form.strain_name as string) || ''}
                  onChange={(e) => updateField('strain_name', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Stage</label>
                <select
                  value={form.stage || ''}
                  onChange={(e) => updateField('stage', e.target.value as PlantStage)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {(['seedling', 'veg', 'flower', 'dry', 'cure', 'harvested'] as PlantStage[]).map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Room</label>
                <input
                  value={(form.room as string) || ''}
                  onChange={(e) => updateField('room', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Medium</label>
                <select
                  value={form.medium || ''}
                  onChange={(e) => updateField('medium', e.target.value as PlantMedium)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {(['soil', 'coco', 'hydro', 'rockwool', 'other'] as PlantMedium[]).map((medium) => (
                    <option key={medium} value={medium}>
                      {medium}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Health</label>
                <select
                  value={form.health_status || 'healthy'}
                  onChange={(e) => updateField('health_status', e.target.value as PlantHealth)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {(['healthy', 'watching', 'stressed', 'critical'] as PlantHealth[]).map((health) => (
                    <option key={health} value={health}>
                      {health}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={(form.start_date as string) || ''}
                  onChange={(e) => updateField('start_date', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Expected Harvest</label>
                <input
                  type="date"
                  value={(form.expected_harvest as string) || ''}
                  onChange={(e) => updateField('expected_harvest', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Tags</label>
                <input
                  value={(uniqueTags || []).join(', ')}
                  onChange={(e) =>
                    updateField(
                      'tags',
                      e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Notes</label>
                <textarea
                  value={(form.notes as string) || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setEditMode(false)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm text-slate-500">
          <Link href="/garden/plants" className="hover:text-emerald-300">
            ← Back to Plant Manager
          </Link>
          <span>Last updated {formatDate(plant.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

