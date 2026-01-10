import Link from "next/link";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Discover</h1>
        <p className="opacity-85">
          Explore strains, news, and educational content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strain Library */}
        <Link
          href="/garden/strain-library"
          className="p-6 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition"
        >
          <div className="text-2xl mb-2">🌿</div>
          <h2 className="text-xl font-semibold mb-2">Strain Library</h2>
          <p className="text-sm text-white/70">
            Browse 35,000+ cannabis strains with detailed profiles, effects, and terpene information.
          </p>
        </Link>

        {/* Cannabis News */}
        <Link
          href="/discover/news"
          className="p-6 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition"
        >
          <div className="text-2xl mb-2">📰</div>
          <h2 className="text-xl font-semibold mb-2">Cannabis News</h2>
          <p className="text-sm text-white/70">
            Latest updates from the cannabis industry, research, and regulations.
          </p>
        </Link>

        {/* Effects Finder */}
        <Link
          href="/garden/effects"
          className="p-6 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition"
        >
          <div className="text-2xl mb-2">✨</div>
          <h2 className="text-xl font-semibold mb-2">Effects</h2>
          <p className="text-sm text-white/70">
            Find strains by desired effects and experiences.
          </p>
        </Link>

        {/* Flavors */}
        <Link
          href="/garden/flavors"
          className="p-6 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition"
        >
          <div className="text-2xl mb-2">🍃</div>
          <h2 className="text-xl font-semibold mb-2">Flavors</h2>
          <p className="text-sm text-white/70">
            Explore terpene profiles and flavor characteristics.
          </p>
        </Link>

        {/* Seed Vendors */}
        <Link
          href="/seeds"
          className="p-6 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition"
        >
          <div className="text-2xl mb-2">🌱</div>
          <h2 className="text-xl font-semibold mb-2">Seed Vendors</h2>
          <p className="text-sm text-white/70">
            Reputable seed banks and breeders for your grow.
          </p>
        </Link>
      </div>
    </div>
  );
}
