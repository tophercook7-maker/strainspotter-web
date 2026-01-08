'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SelectedGrow = {
  id: string;
  name: string;
  stage?: string | null;
};

type SelectedGrowContextValue = {
  selectedGrow: SelectedGrow | null;
  setSelectedGrow: (grow: SelectedGrow | null) => void;
};

const SelectedGrowContext = createContext<SelectedGrowContextValue | undefined>(undefined);

export function SelectedGrowProvider({ children }: { children: React.ReactNode }) {
  const [selectedGrow, setSelectedGrowState] = useState<SelectedGrow | null>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('garden:selectedGrow');
      if (stored) {
        setSelectedGrowState(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('[SelectedGrow] restore failed', err);
    }
  }, []);

  const setSelectedGrow = (grow: SelectedGrow | null) => {
    setSelectedGrowState(grow);
    try {
      if (grow) {
        localStorage.setItem('garden:selectedGrow', JSON.stringify(grow));
      } else {
        localStorage.removeItem('garden:selectedGrow');
      }
    } catch (err) {
      console.warn('[SelectedGrow] persist failed', err);
    }
  };

  const value = useMemo(() => ({ selectedGrow, setSelectedGrow }), [selectedGrow]);

  return <SelectedGrowContext.Provider value={value}>{children}</SelectedGrowContext.Provider>;
}

export function useSelectedGrow() {
  const ctx = useContext(SelectedGrowContext);
  if (!ctx) {
    throw new Error('useSelectedGrow must be used within SelectedGrowProvider');
  }
  return ctx;
}

