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
      {/* ALWAYS VISIBLE TITLE */}
      <h1 className="text-2xl font-semibold text-white tracking-tight">
        Your Garden
      </h1>
      <p className="mt-1 text-white/60 text-sm max-w-xl">
        Your personal hub for scanning, saving, discovering, and growing knowledge.
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
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {gardenFeatures.map((feature) => (
          <Link
            key={feature.id}
            href={feature.href}
            className="
              group
              relative
              rounded-xl
              px-5 py-4
              border border-white/15
              bg-white/10
              backdrop-blur-xl
              shadow-[0_8px_30px_rgba(0,0,0,0.25)]
              hover:bg-white/15
              hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)]
              transition-all
              duration-300
            "
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {feature.title}
              </h2>
              <span className="opacity-0 group-hover:opacity-100 transition text-white/50">
                →
              </span>
            </div>

            <p className="mt-1 text-sm text-white/65 leading-snug">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>

    </main>
  );
}

