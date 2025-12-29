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
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {gardenFeatures.map((feature) => {
          const isPrimary = feature.priority === "primary";
          return (
            <Link
              key={feature.id}
              href={feature.href}
              className="
                group
                relative
                flex
                flex-col
                justify-center
                h-16
                px-5
                rounded-2xl
                border
                transition-all
                duration-200
              "
              style={{
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.55)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(34, 197, 94, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.45)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {feature.title}
                </h2>
                {isPrimary && (
                  <span className="opacity-0 group-hover:opacity-100 transition text-emerald-400/70 text-xs">
                    →
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {feature.description}
              </p>
            </Link>
          );
        })}
      </div>

    </main>
  );
}

