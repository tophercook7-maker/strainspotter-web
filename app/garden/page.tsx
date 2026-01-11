export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-16">
        {/* HERO */}
        <div className="flex flex-col items-center mb-14">
          <div className="relative w-32 h-32 mb-6">
            <img
              src="/hero.png"
              alt="StrainSpotter Hero"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>

          <h1 className="text-5xl font-extrabold text-white drop-shadow-lg mb-3">
            The Garden
          </h1>

          <p className="text-white/80 text-center max-w-xl">
            Your personal cannabis ecosystem.
          </p>
        </div>
      </div>
    </main>
  );
}
