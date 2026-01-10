"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MiniStrain {
  name: string;
  initials: string;
  slug: string;
  x: number;
  y: number;
}

export default function StrainLandingCluster() {
  const [nodes, setNodes] = useState<MiniStrain[]>([]);

  useEffect(() => {
    const sample = [
      { name: "Ocean Grown", initials: "OG", slug: "ocean-grown" },
      { name: "Dream Star", initials: "DS", slug: "dream-star" },
      { name: "Northern Flame", initials: "NF", slug: "northern-flame" },
      { name: "Emerald Sky", initials: "ES", slug: "emerald-sky" },
      { name: "Lunar Kush", initials: "LK", slug: "lunar-kush" },
      { name: "Solar Mist", initials: "SM", slug: "solar-mist" },
    ];

    // Position the nodes in a randomized circle
    const radius = 160;
    const generated = sample.map((s, i) => {
      const angle = (i / sample.length) * Math.PI * 2;
      return {
        ...s,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    setNodes(generated);
  }, []);

  return (
    <section className="relative w-full flex flex-col items-center py-32">
      {/* SECTION TITLE */}
      <h2 className="text-gold text-3xl md:text-4xl font-bold mb-2 drop-shadow-[0_0_18px_rgba(255,215,0,0.5)]">
        Explore Strains in the Cluster
      </h2>

      <p className="text-green-200 opacity-80 mb-14 text-center max-w-xl">
        Interactive strain nodes glowing in the nebula. Click any strain to enter
        its holographic profile.
      </p>

      {/* CLUSTER FIELD */}
      <div className="relative strain-node-cluster">
        {nodes.map((node, i) => (
          <Link
            key={i}
            href={`/strain/${node.slug}`}
            className="strain-node breathe"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${node.x}px), calc(-50% + ${node.y}px))`,
            }}
          >
            <div className="strain-node-inner">{node.initials}</div>
            <div className="strain-node-label">{node.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
