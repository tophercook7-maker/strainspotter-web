"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import GardenButtonsFiltered from "@/components/garden/GardenButtonsFiltered";

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
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_#0b2f1a,_#020b05)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-4xl font-semibold text-white mb-2">
            The Garden
          </h1>
          <p className="text-white/70 mb-10">
            Everything related to your grow, tools, and intelligence
          </p>

          <GardenButtonsFiltered />
        </div>
      </div>
    </ResponsiveShell>
  );
}
