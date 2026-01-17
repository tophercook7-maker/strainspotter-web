"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ScannerShowcase() {
  const [scanning, setScanning] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showEmblem, setShowEmblem] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const scanRingRef = useRef<HTMLDivElement>(null);

  const startScan = () => {
    setScanning(true);
    setShowFlash(false);
    setShowEmblem(false);
    setShowResults(false);

    // Flash effect at start
    setTimeout(() => setShowFlash(true), 100);
    setTimeout(() => setShowFlash(false), 300);

    // Emblem reveals after flash
    setTimeout(() => setShowEmblem(true), 500);

    // Scan ring animation starts
    if (scanRingRef.current) {
      scanRingRef.current.classList.add("scanning");
    }

    // Results panel slides up after scan completes
    setTimeout(() => {
      setScanning(false);
      setShowResults(true);
      if (scanRingRef.current) {
        scanRingRef.current.classList.remove("scanning");
      }
    }, 3500);
  };

  return (
    <section className="relative w-full py-20 overflow-hidden">
      {/* Background fog & aurora */}
      <div className="section-divider">
        <div className="fog animate" />
        <div className="light-rays" />
        <div className="cluster-ripple" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* SCANNER CONTAINER */}
        <div className="relative flex flex-col items-center">
          {/* Flash Effect Overlay */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-white z-50 pointer-events-none"
                style={{ mixBlendMode: "screen" }}
              />
            )}
          </AnimatePresence>

          {/* Scanner Ring - Animated */}
          <div
            ref={scanRingRef}
            className="scanner-ring-container relative w-80 h-80 flex items-center justify-center"
          >
            {/* Outer Ring */}
            <div className="absolute w-full h-full rounded-full border-4 border-green-400/50 scanner-ring-outer" />
            
            {/* Scanning Ring - Pulses when scanning */}
            <div className={`absolute w-full h-full rounded-full border-2 border-gold scanner-ring ${scanning ? "scanning" : ""}`} />
            
            {/* Inner Ring */}
            <div className="absolute w-3/4 h-3/4 rounded-full border border-green-400/30" />

            {/* Emblem - Reveals with animation */}
            <AnimatePresence>
              {showEmblem && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    duration: 0.8
                  }}
                  className="relative w-32 h-32 z-10"
                >
                  <Image
                    src="/emblem/emblem.png"
                    alt="StrainSpotter Emblem"
                    fill
                    className="object-contain drop-shadow-[0_0_40px_rgba(16,255,180,0.8)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scan Lines - Sweep effect when scanning */}
            {scanning && (
              <div className="absolute inset-0 scanner-sweep-lines">
                <div className="scanner-sweep-line" style={{ animationDelay: "0s" }} />
                <div className="scanner-sweep-line" style={{ animationDelay: "0.5s" }} />
                <div className="scanner-sweep-line" style={{ animationDelay: "1s" }} />
              </div>
            )}
          </div>

          {/* Start Scan Button */}
          {!scanning && !showResults && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={startScan}
              className="mt-8 px-10 py-4 rounded-full text-lg font-semibold border-2 border-gold text-gold hover:bg-gold hover:text-black transition-all shadow-lg backdrop-blur-md"
            >
              Start Scan Demo
            </motion.button>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center"
            >
              <p className="text-green-300 text-lg mb-2">Scanning...</p>
              <div className="w-64 h-1 bg-black/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-400 to-gold"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* DUAL RESULTS PANEL - Slides Up */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="mt-16 grid md:grid-cols-2 gap-8"
            >
              {/* Left Result Panel */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-xl backdrop-blur-xl bg-[rgba(0,0,0,0.6)] border border-[rgba(16,255,180,0.4)] shadow-[0_0_40px_rgba(16,255,180,0.3)]"
              >
                <h3 className="text-2xl font-bold text-gold mb-4">Strain Identified</h3>
                <div className="text-4xl font-bold text-green-300 mb-2">Galactic Sherbet</div>
                <div className="text-green-200 opacity-80 mb-4">Hybrid — 55% Indica</div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-green-400/70 mb-1">THC</div>
                    <div className="text-xl font-semibold text-gold">28%</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-400/70 mb-1">CBD</div>
                    <div className="text-xl font-semibold text-gold">1%</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-400/70 mb-1">Confidence</div>
                    <div className="text-xl font-semibold text-gold">94%</div>
                  </div>
                </div>
                <p className="text-sm text-green-200/80 leading-relaxed">
                  Known for its neon terpene profile, Galactic Sherbet delivers a euphoric uplift
                  followed by a deep, calm atmospheric body effect.
                </p>
              </motion.div>

              {/* Right Result Panel */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-xl backdrop-blur-xl bg-[rgba(0,0,0,0.6)] border border-[rgba(255,215,0,0.4)] shadow-[0_0_40px_rgba(255,215,0,0.3)]"
              >
                <h3 className="text-2xl font-bold text-gold mb-4">Grow Intelligence</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-green-400/70 mb-1">Health Status</div>
                    <div className="text-lg text-green-300">Excellent</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-400/70 mb-1">Terpene Profile</div>
                    <div className="text-lg text-green-300">Limonene, Myrcene, Pinene</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-400/70 mb-1">Recommended Actions</div>
                    <div className="text-sm text-green-200/80">
                      Continue current nutrient schedule. Monitor humidity levels.
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-4">
                  <Link
                    href="/scanner-demo"
                    className="flex-1 px-6 py-3 rounded-lg bg-[rgba(16,255,180,0.2)] border border-[rgba(16,255,180,0.5)] text-green-300 hover:bg-[rgba(16,255,180,0.3)] transition-all text-center text-sm font-semibold"
                  >
                    View Full Details
                  </Link>
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setShowEmblem(false);
                    }}
                    className="flex-1 px-6 py-3 rounded-lg bg-[rgba(255,215,0,0.2)] border border-[rgba(255,215,0,0.5)] text-gold hover:bg-[rgba(255,215,0,0.3)] transition-all text-sm font-semibold"
                  >
                    Scan Again
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature List - Below Scanner */}
        {!showResults && (
          <div className="mt-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gold mb-8 drop-shadow-lg">
              The Most Advanced Cannabis Scanner Ever Built
            </h2>
            <ul className="text-green-100 space-y-3 mb-10 max-w-2xl mx-auto">
              <li className="text-lg">🌿 35,000+ strain training dataset</li>
              <li className="text-lg">📸 Bud / Plant / Packaging identification</li>
              <li className="text-lg">🧬 Lineage + terpene prediction</li>
              <li className="text-lg">🩺 AI Grow Doctor built into every scan</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
