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
      <div className="p-4 flex flex-col gap-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block p-4 rounded-xl border border-white/10 bg-white/[0.03] no-underline text-white"
          >
            <div className="text-lg font-extrabold mb-1.5">{t.title}</div>
            <div className="opacity-85">{t.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
