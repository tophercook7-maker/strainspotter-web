"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function GardenPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let alive = true;

    async function resolveAuth() {
      const { data, error } = await supabase.auth.getUser();

      if (!alive) return;

      if (error || !data?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    resolveAuth();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // ⏳ HARD BLOCK — no render, no redirect
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.6,
        }}
      >
        Entering the garden…
      </div>
    );
  }

  if (!user) return null;

  return (
    <main style={{ padding: 24 }}>
      {/* 🌿 ALL GARDEN CONTENT GOES HERE */}
    </main>
  );
}
