/**
 * Garden Hero Component
 * Displays the hero badge (leaf icon) with title and subtitle
 */

export default function GardenHero() {
  return (
    <div className="flex flex-col items-center">
      {/* 1. Page Title */}
      <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4 text-center">
        The Garden
      </h1>
      
      {/* 2. Hero Badge - Positioned UNDER title */}
      <div className="garden-hero-wrapper">
        <img
          src="/brand/core/hero.png"
          alt="StrainSpotter AI Leaf"
          className="garden-hero"
        />
      </div>
      
      {/* 3. Subtitle - Under hero badge */}
      <p className="text-base text-white/70 text-center max-w-md mt-3 font-normal">
        Everything related to your grow, tools, and intelligence
      </p>
    </div>
  );
}
