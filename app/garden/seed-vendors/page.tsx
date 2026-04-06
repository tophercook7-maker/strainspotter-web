"use client";

import { useState } from "react";
import TopNav from "../_components/TopNav";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SeedVendor {
  id: string;
  name: string;
  website: string;
  description: string;
  tags: string[];
  rating: number;
  shipping: string;
  featured: boolean;
}

// ─── Vendor Data ─────────────────────────────────────────────────────────────
const VENDORS: SeedVendor[] = [
  {
    id: "seed-1", name: "North Atlantic Seed Co", website: "https://northatlanticseed.com",
    description: "One of the most trusted US-based seed banks. Fast shipping, huge selection of feminized and autoflower seeds from top breeders.",
    tags: ["US-Based", "Fast Shipping", "Feminized", "Autoflower"], rating: 4.9, shipping: "US: 2-5 days", featured: true,
  },
  {
    id: "seed-2", name: "Strainly", website: "https://strainly.io",
    description: "Peer-to-peer marketplace connecting growers and breeders directly. Find rare genetics, clones, and seeds from independent breeders.",
    tags: ["Marketplace", "Rare Genetics", "Clones", "Breeders"], rating: 4.7, shipping: "Varies by seller", featured: true,
  },
  {
    id: "seed-3", name: "Mephisto Genetics", website: "https://www.mephistogenetics.com",
    description: "Premier autoflower breeder known for exceptional quality. Limited drops sell out fast. Their genetics produce incredible autos.",
    tags: ["Autoflower", "Premium", "Breeder Direct", "Limited Drops"], rating: 4.9, shipping: "US: 3-7 days", featured: true,
  },
  {
    id: "seed-4", name: "Multiverse Beans", website: "https://multiversebeans.com",
    description: "Wide selection with excellent customer service. Known for generous freebies with every order. Great for both beginners and experienced growers.",
    tags: ["US-Based", "Freebies", "Wide Selection", "Beginner Friendly"], rating: 4.8, shipping: "US: 2-4 days", featured: false,
  },
  {
    id: "seed-5", name: "ILGM (I Love Growing Marijuana)", website: "https://ilgm.com",
    description: "Beginner-friendly seed bank with grow guides and germination guarantee. Great starter packs and mix packs available.",
    tags: ["Beginner Friendly", "Germination Guarantee", "Guides", "Mix Packs"], rating: 4.5, shipping: "US: 5-10 days", featured: false,
  },
  {
    id: "seed-6", name: "Seedsman", website: "https://www.seedsman.com",
    description: "Massive international seed bank with 4000+ strains from 100+ breeders. One of the largest selections available anywhere.",
    tags: ["International", "Huge Selection", "Multiple Breeders", "Worldwide"], rating: 4.4, shipping: "US: 7-21 days", featured: false,
  },
  {
    id: "seed-7", name: "Hembra Genetics", website: "https://hembragenetics.com",
    description: "US-based seed bank specializing in feminized seeds. Fast domestic shipping and solid breeder partnerships.",
    tags: ["US-Based", "Feminized", "Fast Shipping"], rating: 4.6, shipping: "US: 2-5 days", featured: false,
  },
  {
    id: "seed-8", name: "DC Seed Exchange", website: "https://dcseedexchange.com",
    description: "Washington DC-based seed bank with a curated selection of premium genetics. Focus on quality over quantity.",
    tags: ["US-Based", "Curated", "Premium Genetics"], rating: 4.7, shipping: "US: 3-5 days", featured: false,
  },
  {
    id: "seed-9", name: "STRNG Seeds", website: "https://strngseeds.com",
    description: "Premium US-grown cannabis seeds from trusted American farmers. 100% federally legal with grow kits, feminized, autoflower, and platinum strains. Backed by 100,000+ happy customers.",
    tags: ["US-Based", "Premium", "Grow Kits", "Feminized", "Autoflower", "Legal"], rating: 4.9, shipping: "US: 2-5 days", featured: true,
  },
];

const ALL_TAGS = Array.from(new Set(VENDORS.flatMap((v) => v.tags))).sort();

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

export default function SeedVendorsPage() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = VENDORS.filter((v) => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.description.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || v.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.rating - a.rating;
  });

  return (
    <>
      <TopNav title="Seed Vendors" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🌱</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Seed Vendors</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Discover trusted seed banks and breeders. Find quality genetics for your next grow
              from vetted vendors with proven track records.
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              style={{
                width: "100%", padding: "12px 14px 12px 42px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                color: "white", fontSize: 14, outline: "none",
              }}
            />
          </div>

          {/* Tag filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTag(null)}
              style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: !activeTag ? "rgba(102,187,106,0.25)" : "rgba(255,255,255,0.06)",
                color: !activeTag ? "#81C784" : "rgba(255,255,255,0.5)",
                border: `1px solid ${!activeTag ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              All
            </button>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: activeTag === tag ? "rgba(102,187,106,0.25)" : "rgba(255,255,255,0.06)",
                  color: activeTag === tag ? "#81C784" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${activeTag === tag ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Results */}
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No vendors match your search</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Try different search terms or clear the filter</div>
            </div>
          ) : (
            <>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                {sorted.length} Vendor{sorted.length !== 1 ? "s" : ""}
              </div>

              {sorted.map((vendor) => (
                <div
                  key={vendor.id}
                  style={{
                    ...glass, marginBottom: 12, overflow: "hidden", transition: "background 0.2s",
                    borderColor: vendor.featured ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.15)",
                  }}
                >
                  <div style={{ padding: 20 }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: vendor.featured ? "rgba(102,187,106,0.15)" : "rgba(255,255,255,0.08)",
                        border: `1px solid ${vendor.featured ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.15)"}`,
                        display: "grid", placeItems: "center", flexShrink: 0, fontSize: 24,
                      }}>
                        🌱
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{vendor.name}</span>
                          {vendor.featured && <span style={{ fontSize: 16 }}>✅</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 14 }}>⭐</span>
                            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600 }}>{vendor.rating}</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 14 }}>🚚</span>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{vendor.shipping}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                      {vendor.description}
                    </div>

                    {/* Tags + Visit */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {vendor.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => window.open(vendor.website, "_blank")}
                        style={{
                          padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700,
                          background: "rgba(102,187,106,0.2)", color: "#81C784",
                          border: "1px solid rgba(102,187,106,0.3)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        Visit ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
