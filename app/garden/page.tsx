"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import GardenButtonsFiltered from "@/components/garden/GardenButtonsFiltered";
import GardenHeroShell from "@/components/garden/GardenHeroShell";

export default function GardenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return null;

  return (
    <ResponsiveShell>
      <GardenHeroShell>
        <h1 className="text-4xl font-semibold text-white mb-2">
          The Garden
        </h1>
        <p className="text-white/70 mb-10">
          Everything related to your grow, tools, and intelligence
        </p>

        <GardenButtonsFiltered />
      </GardenHeroShell>
    </ResponsiveShell>
  );
}
