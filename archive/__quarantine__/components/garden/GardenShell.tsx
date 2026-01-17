"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Garden shell (disabled).
 * Redirects to canonical App Router Garden at /garden.
 */
export default function GardenShell() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/garden");
  }, [router]);

  return null;
}

