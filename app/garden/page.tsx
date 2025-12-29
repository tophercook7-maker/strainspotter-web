"use client";

import Link from "next/link";
import { gardenGroups } from "./gardenButtons";
import MembershipGate from "@/components/MembershipGate";

export default function GardenPage() {
  return (
    <MembershipGate>
      <div className="space-y-6 md:space-y-8 p-4 md:p-6 pb-24 md:pb-8 safe-area-bottom overflow-x-hidden">
      {/* Header */}
      <div className="max-w-4xl mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          The Garden
        </h1>
        <p className="text-sm text-white/85 mt-1">
          Everything related to your grow, tools, and cannabis knowledge.
        </p>
      </div>

      {/* Grouped Sections */}
      {gardenGroups.map((group) => {
        return (
          <section 
            key={group.id} 
            className="space-y-4"
          >
            <div className="px-1">
              <h2 className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-wider">
                {group.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full">
              {group.buttons.map((btn) => {
                const isPrimary = (btn as any).isPrimary === true;
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
    </MembershipGate>
  );
}
