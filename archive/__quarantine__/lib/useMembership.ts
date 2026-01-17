// File: lib/useMembership.ts

"use client";

import { useEffect, useState } from "react";

export function useMembershipLevel() {
  const [level, setLevel] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const stored = localStorage.getItem("membership-tier");
    if (stored) setLevel(Number(stored) as any);
  }, []);

  return level;
}
