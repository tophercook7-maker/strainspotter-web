"use client";

import { motion } from "framer-motion";

type StrainNode = {
  name: string;
  short: string;
  x: string; // e.g. "50%"
  y: string; // e.g. "10%"
  delay?: number;
};

const NODES: StrainNode[] = [
  { name: "Sour Patch Kids", short: "SPK", x: "50%", y: "4%", delay: 0 },
  { name: "Debauchery", short: "DBT", x: "12%", y: "26%", delay: 0.15 },
  { name: "Ocean Storm", short: "OST", x: "82%", y: "28%", delay: 0.3 },
  { name: "Commerce City Kush", short: "CCK", x: "16%", y: "70%", delay: 0.45 },
  { name: "Spirit Mountain", short: "SPM", x: "84%", y: "68%", delay: 0.6 },
];

interface StrainNodeClusterProps {
  onSelectStrain?: (name: string) => void;
  locked?: boolean;
}

export function StrainNodeCluster({ onSelectStrain, locked = false }: StrainNodeClusterProps) {
  return (
    <div className="strain-node-cluster relative">
      {NODES.map((node, index) => (
        <motion.button
          key={node.name}
          type="button"
          className="strain-node breathe"
          style={{
            left: node.x,
            top: node.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.9,
            delay: node.delay ?? index * 0.1,
            ease: "easeOut",
          }}
          whileHover={{ scale: 1.08 }}
          onClick={() => onSelectStrain?.(node.name)}
        >
          <div className="strain-node-inner">
            <span>{node.short}</span>
          </div>
          <span className="strain-node-label">{node.name}</span>
        </motion.button>
      ))}
    </div>
  );
}
