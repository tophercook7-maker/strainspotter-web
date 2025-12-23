'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gardenGroups } from '@/app/garden/gardenButtons';
import { isFeatureEnabled } from '@/lib/featureFlags';

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
            const enabled = await isFeatureEnabled(flagKey as any, false);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {group.buttons.map((btn) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {group.buttons.map((btn) => {
                const isPrimary = btn.isPrimary === true;
                return (
                  <Link
                    key={btn.id}
                    href={btn.href}
                    className={`
                      rounded-xl
                      backdrop-blur-md
                      ${isPrimary ? 'bg-white/18 border-white/20' : 'bg-white/10 border-white/10'}
                      border
                      ${isPrimary ? 'p-7 min-h-[120px]' : 'p-6 min-h-[100px]'}
                      hover:bg-white/15
                      hover:border-white/20
                      ${isPrimary ? 'hover:scale-[1.02] hover:bg-white/22' : ''}
                      active:bg-white/12
                      transition-all
                      flex flex-col justify-center
                    `}
                  >
                    <div className={`${isPrimary ? 'text-lg font-semibold' : 'text-base font-medium'} text-white`}>
                      {btn.label}
                    </div>
                    <div className="text-sm text-white/70 mt-1.5">
                      {btn.description}
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
