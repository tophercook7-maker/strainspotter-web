import Link from "next/link";
import { gardenGroups } from "./gardenButtons";

export default function GardenPage() {
  return (
    <div className="space-y-8 md:space-y-14 p-4 md:p-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          The Garden
        </h1>
        <p className="text-sm text-white/85 mt-1">
          Everything related to your grow, tools, and cannabis knowledge.
        </p>
      </div>

      {/* Groups - Mobile-first: single column, larger touch targets */}
      {gardenGroups.map((group) => (
        <section key={group.id} className="space-y-3 md:space-y-4">
          <h2 className="text-base md:text-lg font-medium text-white">
            {group.label}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {group.buttons.map((btn) => (
              <Link
                key={btn.id}
                href={btn.href}
                className="
                  rounded-xl
                  bg-white/20
                  backdrop-blur-lg
                  p-4 md:p-4
                  min-h-[80px] md:min-h-auto
                  hover:bg-white/30
                  active:bg-white/25
                  transition
                  flex flex-col justify-center
                "
              >
                <div className="text-base md:text-base font-medium text-white">
                  {btn.label}
                </div>
                <div className="text-sm text-white/80 mt-1">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
