"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { gardenFeatures } from "@/lib/gardenFeatures";

type MembershipStatus = "unknown" | "none" | "member";

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg"
      style={{ marginTop: 16 }}
    >
      <h2 className="text-lg font-semibold text-white">{props.title}</h2>
      <div className="mt-2 text-white/80">{props.children}</div>
    </section>
  );
}

export default function GardenShell() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipStatus>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!mounted) return;

        setEmail(user?.email ?? null);
        setUid(user?.id ?? null);

        // Membership check placeholder — DO NOT BLOCK UI
        // Replace this with your real membership logic later.
        // For now, treat logged-in users as "member" to prevent empty Garden.
        if (user) setMembership("member");
        else setMembership("none");
      } catch (e) {
        // If anything fails, still render Garden UI.
        setMembership("none");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <main className="min-h-screen px-4 py-8">
      {/* DEBUG PANEL */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80">
        <div className="text-sm">
          <div><span className="text-white/60">Garden Debug:</span></div>
          <div>loading: {String(loading)}</div>
          <div>email: {email ?? "null"}</div>
          <div>uid: {uid ?? "null"}</div>
          <div>membership: {membership}</div>
        </div>
      </div>

      {/* ALWAYS VISIBLE TITLE */}
      <h1 className="mt-6 text-2xl font-bold text-white">Your Garden</h1>
      <p className="mt-2 text-white/70">
        This is your hub: scanner, saved strains, community, and tools.
      </p>

      {/* MEMBERSHIP GATE (SOFT) */}
      {membership !== "member" ? (
        <SectionCard title="Membership Required">
          <p>
            You're logged out or not a member yet. Once membership is enabled, this will route to the upgrade flow.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white"
            >
              Sign in
            </Link>
            <Link
              href="/account"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white"
            >
              Upgrade
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {/* FEATURE GRID */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {gardenFeatures.map((feature) => (
          <Link
            key={feature.id}
            href={feature.href}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg hover:bg-white/10 transition"
          >
            <h2 className="text-lg font-semibold text-white">
              {feature.title}
            </h2>
            <p className="mt-2 text-white/70 text-sm">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>

      {/* SAFETY: NEVER EMPTY */}
      <div className="mt-8 text-white/50 text-sm">
        If you ever see an empty Garden, it's a bug — GardenShell should always render.
      </div>
    </main>
  );
}

