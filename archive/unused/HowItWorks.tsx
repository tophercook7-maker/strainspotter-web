"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("animate-section");
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={clsx(
        "relative py-28 w-full overflow-hidden",
        "transition-all duration-700 opacity-0 translate-y-12",
        "animate-section:opacity-100 animate-section:translate-y-0"
      )}
    >
      {/* Fog Divider */}
      <div className="section-divider">
        <div className="fog animate" />
        <div className="light-rays" />
        <div className="cluster-ripple" />
      </div>

      {/* Title */}
      <h2 className="text-center text-4xl md:text-5xl font-bold text-gold mb-16 drop-shadow-lg">
        How It Works
      </h2>

      {/* 3 Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto px-6">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full border border-gold flex items-center justify-center holo-step">
            <img
              src="/icons/scan-icon.png"
              alt="Scan Icon"
              className="w-20 h-20 opacity-90 animate-float"
            />
          </div>
          <h3 className="text-2xl text-gold mt-6 mb-2">Scan</h3>
          <p className="text-green-200 max-w-xs opacity-90">
            Upload a photo of your bud, plant, or package. Our AI instantly begins analyzing.
          </p>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full border border-gold flex items-center justify-center holo-step">
            <img
              src="/icons/identify-icon.png"
              alt="Identify Icon"
              className="w-20 h-20 opacity-90 animate-pulse-slow"
            />
          </div>
          <h3 className="text-2xl text-gold mt-6 mb-2">Identify</h3>
          <p className="text-green-200 max-w-xs opacity-90">
            StrainSpotter reveals strain name, genetics, lineage, terpene profile, and grow health status.
          </p>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full border border-gold flex items-center justify-center holo-step">
            <img
              src="/icons/learn-icon.png"
              alt="Learn Icon"
              className="w-20 h-20 opacity-90 animate-float"
            />
          </div>
          <h3 className="text-2xl text-gold mt-6 mb-2">Learn</h3>
          <p className="text-green-200 max-w-xs opacity-90">
            Dive into detailed strain data, effects, potency, grow tips, AI grow doctor,
            and a community-powered learning ecosystem.
          </p>
        </div>
      </div>
    </section>
  );
}
