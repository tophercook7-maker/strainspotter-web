"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FEATURE_MAP } from "@/lib/monetization/featureMap";
import { canAccess, UserTier } from "@/lib/monetization/guard";

export default function GardenPage() {
  const router = useRouter();
  const userTier: UserTier = "app"; // TEMP — will be dynamic later

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-16">
        {/* HERO */}
        <div className="mb-3">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={64}
            height={64}
            className="object-contain"
            draggable={false}
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-12">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div
          className="
            mt-14
            grid
            grid-cols-3
            gap-x-20
            gap-y-16
            place-items-center
          "
        >
          {Object.entries(FEATURE_MAP).map(([key, feature]) => {
            const allowed = canAccess(key as any, userTier);

            return (
              <button
                key={key}
                onClick={() => allowed && router.push(feature.route)}
                disabled={!allowed}
                className={`
                  flex flex-col items-center justify-center
                  w-44 h-44
                  rounded-[32px]
                  bg-white/25
                  backdrop-blur-2xl
                  border border-white/40
                  shadow-[0_20px_50px_rgba(0,0,0,0.35)]
                  transition-all duration-200
                  ${
                    allowed
                      ? "hover:bg-white/35 hover:scale-[1.03] cursor-pointer"
                      : "bg-white/10 opacity-50 cursor-not-allowed"
                  }
                `}
                type="button"
              >
                <div className="text-6xl mb-4">{feature.icon}</div>
                <div className="text-lg font-semibold tracking-wide text-white">
                  {feature.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
