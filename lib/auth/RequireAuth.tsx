"use client";

// TEMPORARY: Auth disabled - using mock user
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { MOCK_USER } from "@/lib/supabaseBrowser";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // TEMPORARY: Use mock user instead of real auth
    // const supabase = getSupabaseBrowserClient();
    // supabase.auth.getSession().then(({ data }: { data: any }) => {
    //   if (!mounted) return;
    //   if (!data.session) {
    //     router.replace("/auth/login");
    //     return;
    //   }
    //   setReady(true);
    // });
    // const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    //   if (!session) router.replace("/auth/login");
    // });
    // return () => {
    //   mounted = false;
    //   sub.subscription.unsubscribe();
    // };
    
    // Mock: Always allow access
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
