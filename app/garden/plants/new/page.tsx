'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMembership } from '@/lib/hooks/useMembership';
import { PlantCreateInput, PlantHealth, PlantMedium, PlantStage, usePlants } from '@/lib/hooks/usePlants';

const stageOptions: PlantStage[] = ['seedling', 'veg', 'flower', 'dry', 'cure', 'harvested'];
const mediumOptions: PlantMedium[] = ['soil', 'coco', 'hydro', 'rockwool', 'other'];
const healthOptions: PlantHealth[] = ['healthy', 'watching', 'stressed', 'critical'];

export default function NewPlantPage() {
  const router = useRouter();
  const { membership, loading: membershipLoading } = useMembership();
  const { createPlant } = usePlants();

  const [form, setForm] = useState<PlantCreateInput>({
    name: '',
    strain_name: '',
    stage: 'seedling',
    room: '',
    medium: 'soil',
    start_date: '',
    expected_harvest: '',
    notes: '',
    tags: [],
    health_status: 'healthy',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof PlantCreateInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Plant name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload: PlantCreateInput = {
        ...form,
        tags: form.tags?.filter(Boolean),
        strain_name: form.strain_name || undefined,
        room: form.room || undefined,
        medium: form.medium || undefined,
        start_date: form.start_date || undefined,
        expected_harvest: form.expected_harvest || undefined,
        notes: form.notes || undefined,
      };
      const plant = await createPlant(payload);
      router.push(`/garden/plants/${plant.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create plant');
    } finally {
      setSubmitting(false);
    }
  };

  if (membershipLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading membership...</p>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Add Plant</h1>
            <p className="text-slate-400">Create a new plant record for your garden.</p>
          </div>
          <Link href="/garden/plants" className="text-emerald-300 hover:text-emerald-200 text-sm">
            ← Back to Plant Manager
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          {error && (
            <div className="bg-rose-900/40 border border-rose-700 text-rose-100 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Plant Name *</label>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Strain</label>
              <input
                value={form.strain_name || ''}
                onChange={(e) => updateField('strain_name', e.target.value)}
                placeholder="e.g., Gelato 41"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Stage *</label>
              <select
                value={form.stage}
                onChange={(e) => updateField('stage', e.target.value as PlantStage)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Room</label>
              <input
                value={form.room || ''}
                onChange={(e) => updateField('room', e.target.value)}
                placeholder="Tent 1, Flower Room..."
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
                {mediumOptions.map((medium) => (
                  <option key={medium} value={medium}>
                    {medium}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Health Status</label>
              <select
                value={form.health_status}
                onChange={(e) => updateField('health_status', e.target.value as PlantHealth)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {healthOptions.map((health) => (
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
                value={form.start_date || ''}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Expected Harvest</label>
              <input
                type="date"
                value={form.expected_harvest || ''}
                onChange={(e) => updateField('expected_harvest', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300">Tags (comma-separated)</label>
              <input
                value={form.tags?.join(', ') || ''}
                onChange={(e) =>
                  updateField(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="pheno-hunt, keeper, test"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link
              href="/garden/plants"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

