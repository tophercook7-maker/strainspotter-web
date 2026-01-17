"use client";

import { motion } from "framer-motion";

export default function AuroraAtmosphere() {
  return (
    <div className="aurora-wrapper">
      {/* Aurora Core */}
      <motion.div
        className="aurora-layer"
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Particle Field */}
      <motion.div
        className="particle-field particle-pulse"
        animate={{
          opacity: [0.05, 0.13, 0.05],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
