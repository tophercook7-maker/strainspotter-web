'use client';

import { useCallback, useState } from 'react';

export type PlantStage = 'seedling' | 'veg' | 'flower' | 'dry' | 'cure' | 'harvested' | 'archived';
export type PlantMedium = 'soil' | 'coco' | 'hydro' | 'rockwool' | 'other';
export type PlantHealth = 'healthy' | 'watching' | 'stressed' | 'critical';

export interface Plant {
  id: string;
  user_id: string;
  name: string;
  strain_id?: string | null;
  strain_name?: string | null;
  stage?: PlantStage | null;
  room?: string | null;
  medium?: PlantMedium | null;
  start_date?: string | null;
  expected_harvest?: string | null;
  last_watered?: string | null;
  last_fed?: string | null;
  notes?: string | null;
  health_status?: PlantHealth | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean;
}

export interface PlantCreateInput {
  name: string;
  strain_id?: string | null;
  strain_name?: string | null;
  stage?: PlantStage;
  room?: string | null;
  medium?: PlantMedium | null;
  start_date?: string | null;
  expected_harvest?: string | null;
  notes?: string | null;
  tags?: string[];
  health_status?: PlantHealth;
}

export interface PlantListFilters {
  stage?: PlantStage | 'all';
  room?: string;
  search?: string;
  archived?: boolean;
}

export function usePlants() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = (filters?: PlantListFilters) => {
    const params = new URLSearchParams();
    if (filters?.stage && filters.stage !== 'all') params.set('stage', filters.stage);
    if (filters?.room) params.set('room', filters.room);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.archived) params.set('archived', 'true');
    return params.toString() ? `?${params.toString()}` : '';
  };

  const listPlants = useCallback(
    async (filters?: PlantListFilters): Promise<Plant[]> => {
      try {
        setLoading(true);
        setError(null);
        const query = buildQuery(filters);
        const res = await fetch(`/api/plants${query}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load plants');
        }
        return (data.plants || []) as Plant[];
      } catch (err: any) {
        setError(err?.message || 'Failed to load plants');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPlant = useCallback(async (id: string): Promise<Plant | null> => {
    const res = await fetch(`/api/plants/${id}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load plant');
    }
    return data.plant as Plant;
  }, []);

  const createPlant = useCallback(async (payload: PlantCreateInput): Promise<Plant> => {
    const res = await fetch('/api/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create plant');
    }
    return data.plant as Plant;
  }, []);

  const updatePlant = useCallback(async (id: string, payload: Partial<Plant>): Promise<Plant> => {
    const res = await fetch(`/api/plants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update plant');
    }
    return data.plant as Plant;
  }, []);

  const archivePlant = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/plants/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to archive plant');
    }
    return !!data.success;
  }, []);

  return {
    loading,
    error,
    listPlants,
    getPlant,
    createPlant,
    updatePlant,
    archivePlant,
  };
}

