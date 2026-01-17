"use client";

import Image from "next/image";
import React from "react";

type AppEmblemProps = {
  size?: number;
  className?: string;
};

export const AppEmblem: React.FC<AppEmblemProps> = ({ size = 96, className }) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    >
      <Image
        src="/emblem/StrainSpotterEmblem.png"
        alt="StrainSpotter emblem"
        fill
        sizes={`${size}px`}
        style={{ objectFit: "contain" }}
        priority
      />
    </div>
  );
};

