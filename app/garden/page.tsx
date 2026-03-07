import Link from "next/link";
import { PageHeaderNav } from "@/app/_components/PageHeaderNav";

const tiles = [
  {
    title: "Scanner",
    desc: "Scan packaging or plant photos. AI-assisted results.",
    href: "/garden/scanner",
  },
  {
    title: "Log Book",
    desc: "Your scan history + notes across the grow cycle.",
    href: "/garden/history",
  },
  {
    title: "Grow Coach",
    desc: "Full grow-cycle guidance: seed → veg → flower → dry/cure.",
    href: "/garden/grow-coach",
  },
];

export default function GardenPage() {
  return (
    <main className="pb-[72px]">
      <PageHeaderNav title="StrainSpotter" hideHome />
      {/* Hero with branded background */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6 min-h-[180px] flex flex-col justify-end"
        style={{
          backgroundImage: "url(/hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        <div className="relative px-5 py-6">
          <h1 className="text-2xl font-black text-white tracking-tight">StrainSpotter</h1>
          <p className="text-white/90 text-sm mt-1 max-w-md">
            Scanner, Log Book, and Grow Coach — built for a cleaner cannabis workflow.
          </p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block p-4 min-h-[44px] rounded-xl border border-white/15 bg-white/[0.06] shadow-lg shadow-black/20 no-underline text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors"
          >
            <div className="text-lg font-extrabold mb-1.5">{t.title}</div>
            <div className="opacity-90 text-sm">{t.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
