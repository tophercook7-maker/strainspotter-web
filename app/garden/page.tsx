"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function GardenPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return null;

  return (
    <div>
      {/* ALL GARDEN CONTENT GOES HERE */}
    </div>
  );
}
