import Image from "next/image";

export default function HomePage() {
  return (
    <main className="w-full flex flex-col items-center justify-start pt-24 px-6">

      {/* HERO IMAGE */}
      <div className="w-[420px] h-[420px] rounded-full overflow-hidden drop-shadow-2xl bg-transparent">
        <Image
          src="/brand/core/hero.png"
          alt="StrainSpotter Hero"
          width={420}
          height={420}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      {/* BRAND TITLE */}
      <h1 className="text-6xl font-bold mt-10 text-[#C4A259] tracking-wide text-center">
        STRAINSPOTTER
      </h1>

      {/* SUBHEADING */}
      <p className="mt-6 text-xl text-[#E6EFE9]/90 max-w-2xl text-center leading-relaxed">
        AI-powered strain identification, grow coaching, and cannabis intelligence —
        across mobile, desktop, and dispensary environments.
      </p>

      {/* BUTTON ROW */}
      <div className="flex gap-6 mt-10">
        <a
          href="/scanner"
          className="
            px-8 py-4 rounded-xl
            bg-[#42FFB2] text-black
            font-semibold text-lg shadow-lg
            hover:scale-105 hover:shadow-xl
            transition-all
          "
        >
          Scan
        </a>

        <a
          href="/garden/dashboard"
          className="
            px-8 py-4 rounded-xl
            border border-[#C4A259] text-[#C4A259]
            font-semibold text-lg shadow-lg
            hover:bg-[#C4A259] hover:text-black
            transition-all
          "
        >
          Enter the Garden
        </a>
      </div>

    </main>
  );
}
