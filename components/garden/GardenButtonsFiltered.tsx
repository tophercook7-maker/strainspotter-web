'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gardenGroups } from '@/app/garden/gardenButtons';
import { isFeatureEnabled, type FeatureFlagKey } from '@/lib/featureFlags';

interface Button {
  id: string;
  href: string;
  label: string;
  description: string;
  isPrimary?: boolean;
}

interface Group {
  id: string;
  label: string;
  buttons: Button[];
}

/**
 * Feature flag mapping for garden buttons
 * Maps button IDs to feature flag keys
 */
const BUTTON_FEATURE_FLAGS: Record<string, string> = {
  'notes': 'enable_grow_notes',
  // Add more mappings as needed
};

/**
 * Filter garden buttons based on feature flags
 */
export default function GardenButtonsFiltered() {
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  useEffect(() => {
    async function filterButtons() {
      const filtered: Group[] = [];

      for (const group of gardenGroups) {
        const filteredButtons: Button[] = [];

        for (const button of group.buttons) {
          const flagKey = BUTTON_FEATURE_FLAGS[button.id];
          
          if (flagKey) {
            // Check feature flag
            const enabled = await isFeatureEnabled(flagKey as FeatureFlagKey, false);
            if (!enabled) {
              // Skip this button if flag is disabled
              continue;
            }
          }

          // Include button if no flag or flag is enabled
          filteredButtons.push(button);
        }

        // Only include group if it has buttons
        if (filteredButtons.length > 0) {
          filtered.push({
            ...group,
            buttons: filteredButtons,
          });
        }
      }

      setFilteredGroups(filtered);
      setFlagsLoaded(true);
    }

    filterButtons();
  }, []);

  // Show loading state or empty state while flags load
  if (!flagsLoaded) {
    return (
      <div className="space-y-6 md:space-y-8">
        {gardenGroups.map((group) => (
          <section key={group.id} className="space-y-4">
            <div className="px-1">
              <h2 className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-wider">
                {group.label}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {group.buttons.map((btn: Button) => (
                <div
                  key={btn.id}
                  className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6 min-h-[100px] animate-pulse"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {filteredGroups.map((group) => {
        const isNews = group.id === 'news';
        
        // Skip news group - it's rendered separately
        if (isNews) {
          return null;
        }

        return (
          <section key={group.id} className="space-y-4">
            <div className="px-1">
              <h2 className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-wider">
                {group.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {group.buttons.map((btn) => {
                const isPrimary = btn.isPrimary === true;
                return (
                  <Link
                    key={btn.id}
                    href={btn.href}
                    className="block group"
                  >
                    <div
                      className={`
                        relative h-full rounded-xl
                        backdrop-blur-md
                        border
                        ${isPrimary ? 'bg-white/18 border-white/20' : 'bg-white/10 border-white/10'}
                        ${isPrimary ? 'p-7 min-h-[120px]' : 'p-6 min-h-[100px]'}
                        hover:bg-white/15
                        hover:border-white/20
                        ${isPrimary ? 'hover:scale-[1.02] hover:bg-white/22' : 'hover:-translate-y-0.5'}
                        hover:shadow-xl
                        active:bg-white/12
                        transition-all
                        flex flex-col justify-center
                      `}
                    >
                      <h3 className={`${isPrimary ? 'text-lg font-semibold' : 'text-base font-medium'} text-white`}>
                        {btn.label}
                      </h3>
                      <p className="mt-1.5 text-sm text-white/70">
                        {btn.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
