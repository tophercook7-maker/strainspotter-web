"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--parallax-x", x.toString());
      document.documentElement.style.setProperty("--parallax-y", y.toString());
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative h-[100vh] w-full overflow-hidden flex flex-col items-center justify-center text-center select-none"
    >
      {/* Global Aurora + Fog + Particles */}
      <div className="absolute inset-0 aurora-wrapper pointer-events-none">
        <div className="aurora-layer" />
        <div className="particle-field particle-pulse" />
      </div>

      {/* Main Title */}
      <h1 className="text-6xl md:text-7xl font-bold text-gold drop-shadow-lg parallax-tilt">
        STRAINSPOTTER
      </h1>

      <p className="text-xl mt-4 max-w-xl text-green-200 opacity-95 parallax-tilt">
        AI-Powered Strain Identification, Grow Intelligence, and the Future of Cannabis Discovery.
      </p>

      {/* CTA */}
      <button
        className={clsx(
          "mt-8 px-10 py-4 rounded-full text-lg font-semibold",
          "border border-gold text-gold hover:bg-gold hover:text-black transition-all",
          "shadow-lg backdrop-blur-md parallax-shift"
        )}
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
      >
        Enter the Garden
      </button>

      {/* Strain Node Cluster */}
      <div className="strain-node-cluster animate-fade-in mt-20 pointer-events-none">
        {/* Node 1 */}
        <div className="strain-node breathe"
          style={{ top: "12%", left: "20%" }}>
          <div className="strain-node-inner">OG</div>
          <span className="strain-node-label">Ocean Grown</span>
        </div>

        {/* Node 2 */}
        <div className="strain-node breathe"
          style={{ top: "32%", right: "16%" }}>
          <div className="strain-node-inner">DS</div>
          <span className="strain-node-label">Dream Star</span>
        </div>

        {/* Node 3 */}
        <div className="strain-node breathe"
          style={{ bottom: "18%", left: "35%" }}>
          <div className="strain-node-inner">KP</div>
          <span className="strain-node-label">King Palm</span>
        </div>

        {/* Node 4 */}
        <div className="strain-node breathe"
          style={{ bottom: "10%", right: "28%" }}>
          <div className="strain-node-inner">HB</div>
          <span className="strain-node-label">Honey Breath</span>
        </div>
      </div>

      {/* Gradient Fade at Bottom */}
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/70 to-transparent" />
    </section>
  );
}
