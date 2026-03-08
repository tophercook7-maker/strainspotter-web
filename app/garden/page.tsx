import Image from "next/image";
import Link from "next/link";
import { PageHeaderNav } from "@/app/_components/PageHeaderNav";

const cards = [
  { title: "Scanner", subtitle: "Scan plants & packaging", href: "/garden/scanner", icon: "/brand/icons/scanner/scan.svg" },
  { title: "Log Book", subtitle: "Track your grows", href: "/garden/history", icon: "/brand/icons/garden/grow-logs.svg" },
  { title: "Grow Coach", subtitle: "Seed → harvest tips", href: "/garden/grow-coach", icon: "/brand/icons/garden/grow-coach.svg" },
];

export default function GardenPage() {
  return (
    <main className="pb-6">
      <PageHeaderNav title="StrainSpotter" hideHome showBack={false} />

      {/* Hero: branded marijuana-photo background, circular leaf mark */}
      <section
        className="relative rounded-xl overflow-hidden mb-5 min-h-[120px] flex flex-col items-center justify-center py-5 px-4"
        style={{
          backgroundImage: "url(/brand/core/strainspotter-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
          }}
        />
        <Image
          src="/emblem/hero-brand-mark.svg"
          alt="StrainSpotter"
          width={72}
          height={72}
          priority
          className="relative z-10 mb-1.5"
        />
        <h1 className="relative z-10 text-xl font-bold text-white tracking-tight">StrainSpotter</h1>
        <p className="relative z-10 text-white/85 text-sm mt-0.5">Your personal cannabis companion</p>
      </section>

      {/* Compact cards */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/15 bg-white/6 no-underline text-white hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            <Image src={c.icon} alt="" width={32} height={32} />
            <span className="font-semibold text-sm">{c.title}</span>
            <span className="text-xs text-white/75">{c.subtitle}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
