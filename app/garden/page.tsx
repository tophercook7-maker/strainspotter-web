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
        <div className="grid grid-cols-3 gap-x-16 gap-y-16">
          {Object.entries(FEATURE_MAP).map(([key, feature]) => {
            const allowed = canAccess(key as any, userTier);

            return (
              <button
                key={key}
                onClick={() => allowed && router.push(feature.route)}
                disabled={!allowed}
                className={`
                  flex flex-col items-center justify-center
                  w-40 h-40
                  rounded-3xl
                  backdrop-blur-xl
                  border border-white/30
                  shadow-xl
                  transition
                  ${
                    allowed
                      ? "bg-white/20 hover:bg-white/30 cursor-pointer"
                      : "bg-white/10 opacity-50 cursor-not-allowed"
                  }
                `}
                type="button"
              >
                <div className="text-5xl mb-3">{feature.icon}</div>
                <div className="text-base font-semibold tracking-wide text-white">
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
