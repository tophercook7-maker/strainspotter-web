import Link from "next/link";
import { PageHeaderNav } from "@/app/_components/PageHeaderNav";

const BG_ASSET = "/strainspotter-bg.jpeg";
const HERO_MARK_ASSET = "/StrainSpotterEmblem.png";

const cards = [
  { title: "Scanner", subtitle: "Scan plants & packaging", href: "/garden/scanner", icon: "/icons/scan.svg" },
  { title: "Log Book", subtitle: "Track your grows", href: "/garden/history", icon: "/icons/logbook.svg" },
  { title: "Grow Coach", subtitle: "Seed → harvest tips", href: "/garden/grow-coach", icon: "/icons/doctor.svg" },
] as const;

export default function GardenPage() {
  return (
    <main className="pb-6">
      <PageHeaderNav title="StrainSpotter" hideHome showBack={false} />

      {/* Hero: branded marijuana-photo background, circular leaf mark — compact layout */}
      <section
        className="relative rounded-xl overflow-hidden mb-4 min-h-[100px] flex flex-col items-center justify-center py-4 px-4"
        style={{
          backgroundImage: `url(${BG_ASSET})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Light gradient for text contrast; keep background photo visible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
          }}
        />
        {/* Dark circular backdrop ensures hero mark is always visible */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="rounded-full bg-black/50 p-2 mb-1.5 ring-2 ring-white/30 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_MARK_ASSET} alt="StrainSpotter" width={64} height={64} className="w-16 h-16 drop-shadow-[0_0_8px_rgba(0,255,174,0.6)]" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight drop-shadow-md">StrainSpotter</h1>
          <p className="text-white/90 text-sm mt-0.5 drop-shadow-md">Your personal cannabis companion</p>
        </div>
      </section>

      {/* Compact cards — use img for reliable icon rendering (avoids Next/Image SVG issues) */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/15 bg-white/6 no-underline text-white hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.icon} alt="" width={32} height={32} className="w-8 h-8 shrink-0" />
            <span className="font-semibold text-sm">{c.title}</span>
            <span className="text-xs text-white/75">{c.subtitle}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
