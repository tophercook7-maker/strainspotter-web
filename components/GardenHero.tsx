export default function GardenHero() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Hero Circle */}
      <div className="relative flex items-center justify-center w-36 h-36 rounded-full">
        {/* Pulsing green glow ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-[pulseGlow_4s_ease-in-out_infinite]" />

        {/* Inner black glass core */}
        <div className="relative z-10 flex items-center justify-center w-28 h-28 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
          {/* Real leaf SVG */}
          <svg
            viewBox="0 0 24 24"
            className="w-10 h-10 text-emerald-400"
            fill="currentColor"
          >
            <path d="M12 2C9 6 3 9 3 14c0 4.4 3.6 8 8 8 1.9 0 3.7-.7 5-1.8C18.3 21.3 20 18.8 20 16c0-6-6-9-8-14zm0 17c-3.3 0-6-2.7-6-6 0-3.2 3.5-5.5 6-9 2.5 3.5 6 5.8 6 9 0 3.3-2.7 6-6 6z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-semibold text-white">The Garden</h1>

      {/* Subtitle */}
      <p className="text-white/80 max-w-xl text-center">
        Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
      </p>
    </div>
  );
}
