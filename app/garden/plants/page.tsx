'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMembership } from '@/lib/hooks/useMembership';
import { Plant, PlantStage, usePlants } from '@/lib/hooks/usePlants';

const stageOptions: { label: string; value: PlantStage | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Seedling', value: 'seedling' },
  { label: 'Veg', value: 'veg' },
  { label: 'Flower', value: 'flower' },
  { label: 'Dry', value: 'dry' },
  { label: 'Cure', value: 'cure' },
  { label: 'Harvested', value: 'harvested' },
];

const stagePillClasses: Record<string, string> = {
  seedling: 'bg-emerald-500/15 text-emerald-200 border border-emerald-700/60',
  veg: 'bg-green-500/15 text-green-200 border border-green-700/60',
  flower: 'bg-violet-500/15 text-violet-200 border border-violet-700/60',
  dry: 'bg-amber-500/15 text-amber-200 border border-amber-700/60',
  cure: 'bg-amber-500/15 text-amber-200 border border-amber-700/60',
  harvested: 'bg-slate-500/15 text-slate-200 border border-slate-600/60',
  archived: 'bg-slate-800 text-slate-300 border border-slate-700',
  all: 'bg-slate-800 text-slate-200 border border-slate-700',
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

export default function PlantsPage() {
  const router = useRouter();
  const { membership, loading: membershipLoading } = useMembership();
  const { listPlants } = usePlants();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<PlantStage | 'all'>('all');
  const [roomFilter, setRoomFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listPlants({
        stage: stageFilter,
        room: roomFilter || undefined,
        search: searchTerm || undefined,
      });
      setPlants(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (membership?.tier && membership.tier !== 'free') {
      loadPlants();
    }
  }, [stageFilter, roomFilter, searchTerm, membership?.tier]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => {
      if (p.room) set.add(p.room);
    });
    return Array.from(set);
  }, [plants]);

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
        <div className="max-w-5xl mx-auto">
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Plant Manager</h1>
            <p className="text-slate-400">Track every plant, from seed to cure.</p>
          </div>
          <Link
            href="/garden/plants/new"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
          >
            Add Plant
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {stageOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStageFilter(option.value)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  stageFilter === option.value
                    ? `${stagePillClasses[option.value]}`
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex-1">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or strain..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="w-full lg:w-64">
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">All Rooms</option>
                {roomOptions.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-900/40 border border-rose-700 text-rose-100 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
            Loading plants...
          </div>
        ) : plants.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-300 mb-3">No plants yet.</p>
            <p className="text-slate-500 text-sm mb-4">Add your first plant to start tracking.</p>
            <Link
              href="/garden/plants/new"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
            >
              Add your first plant
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {plants.map((plant) => (
              <button
                key={plant.id}
                onClick={() => router.push(`/garden/plants/${plant.id}`)}
                className="text-left w-full bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold text-slate-100">{plant.name}</div>
                    <div className="text-sm text-slate-400">{plant.strain_name || 'Unknown strain'}</div>
                  </div>
                  {plant.stage && (
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${stagePillClasses[plant.stage] || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                      {plant.stage}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${healthDot[plant.health_status || 'healthy'] || 'bg-emerald-400'}`} />
                    <span className="capitalize">{plant.health_status || 'healthy'}</span>
                  </div>
                  <div className="text-slate-400">{plant.room || 'No room set'}</div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Started: {formatDate(plant.start_date)}</span>
                  <span className="text-emerald-300 font-medium">{daysInGrow(plant.start_date)} in grow</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

