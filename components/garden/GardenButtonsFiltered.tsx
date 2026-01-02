'use client';

import Link from 'next/link';
import { gardenCategories } from '@/app/garden/gardenButtons';

export default function GardenButtonsFiltered() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {gardenCategories.map((category) => {
        const isPrimary = category.id === 'scan';
        return (
          <Link
            key={category.id}
            href={category.href}
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
                {category.title}
              </h3>
              <p className="mt-1.5 text-sm text-white/70">
                {category.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
