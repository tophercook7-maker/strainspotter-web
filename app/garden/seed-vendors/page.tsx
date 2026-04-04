"use client";

import { useState } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import SpaIcon from "@mui/icons-material/Spa";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StarIcon from "@mui/icons-material/Star";

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
    id: "seed-1",
    name: "North Atlantic Seed Co",
    website: "https://northatlanticseed.com",
    description: "One of the most trusted US-based seed banks. Fast shipping, huge selection of feminized and autoflower seeds from top breeders.",
    tags: ["US-Based", "Fast Shipping", "Feminized", "Autoflower"],
    rating: 4.9,
    shipping: "US: 2-5 days",
    featured: true,
  },
  {
    id: "seed-2",
    name: "Strainly",
    website: "https://strainly.io",
    description: "Peer-to-peer marketplace connecting growers and breeders directly. Find rare genetics, clones, and seeds from independent breeders.",
    tags: ["Marketplace", "Rare Genetics", "Clones", "Breeders"],
    rating: 4.7,
    shipping: "Varies by seller",
    featured: true,
  },
  {
    id: "seed-3",
    name: "Mephisto Genetics",
    website: "https://www.mephistogenetics.com",
    description: "Premier autoflower breeder known for exceptional quality. Limited drops sell out fast. Their genetics produce incredible autos.",
    tags: ["Autoflower", "Premium", "Breeder Direct", "Limited Drops"],
    rating: 4.9,
    shipping: "US: 3-7 days",
    featured: true,
  },
  {
    id: "seed-4",
    name: "Multiverse Beans",
    website: "https://multiversebeans.com",
    description: "Wide selection with excellent customer service. Known for generous freebies with every order. Great for both beginners and experienced growers.",
    tags: ["US-Based", "Freebies", "Wide Selection", "Beginner Friendly"],
    rating: 4.8,
    shipping: "US: 2-4 days",
    featured: false,
  },
  {
    id: "seed-5",
    name: "ILGM (I Love Growing Marijuana)",
    website: "https://ilgm.com",
    description: "Beginner-friendly seed bank with grow guides and germination guarantee. Great starter packs and mix packs available.",
    tags: ["Beginner Friendly", "Germination Guarantee", "Guides", "Mix Packs"],
    rating: 4.5,
    shipping: "US: 5-10 days",
    featured: false,
  },
  {
    id: "seed-6",
    name: "Seedsman",
    website: "https://www.seedsman.com",
    description: "Massive international seed bank with 4000+ strains from 100+ breeders. One of the largest selections available anywhere.",
    tags: ["International", "Huge Selection", "Multiple Breeders", "Worldwide"],
    rating: 4.4,
    shipping: "US: 7-21 days",
    featured: false,
  },
  {
    id: "seed-7",
    name: "Hembra Genetics",
    website: "https://hembragenetics.com",
    description: "US-based seed bank specializing in feminized seeds. Fast domestic shipping and solid breeder partnerships.",
    tags: ["US-Based", "Feminized", "Fast Shipping"],
    rating: 4.6,
    shipping: "US: 2-5 days",
    featured: false,
  },
  {
    id: "seed-8",
    name: "DC Seed Exchange",
    website: "https://dcseedexchange.com",
    description: "Washington DC-based seed bank with a curated selection of premium genetics. Focus on quality over quantity.",
    tags: ["US-Based", "Curated", "Premium Genetics"],
    rating: 4.7,
    shipping: "US: 3-5 days",
    featured: false,
  },
  {
    id: "seed-9",
    name: "STRNG Seeds",
    website: "https://strngseeds.com",
    description: "Premium US-grown cannabis seeds from trusted American farmers. 100% federally legal with grow kits, feminized, autoflower, and platinum strains. Backed by 100,000+ happy customers.",
    tags: ["US-Based", "Premium", "Grow Kits", "Feminized", "Autoflower", "Legal"],
    rating: 4.9,
    shipping: "US: 2-5 days",
    featured: true,
  },
];

const ALL_TAGS = Array.from(new Set(VENDORS.flatMap((v) => v.tags))).sort();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

export default function SeedVendorsPage() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = VENDORS.filter((v) => {
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || v.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  // Sort: featured first, then by rating
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
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <SpaIcon sx={{ fontSize: 28, color: "#66BB6A" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Seed Vendors
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Discover trusted seed banks and breeders. Find quality genetics for your next grow
              from vetted vendors with proven track records.
            </Typography>
          </Box>

          {/* Search */}
          <Box sx={{ position: "relative", mb: 2 }}>
            <SearchIcon sx={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
                color: "white",
                fontSize: 14,
                outline: "none",
              }}
            />
          </Box>

          {/* Tag filters */}
          <Box sx={{ display: "flex", gap: 0.75, mb: 3, flexWrap: "wrap" }}>
            <ButtonBase
              onClick={() => setActiveTag(null)}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                background: !activeTag ? "rgba(102,187,106,0.25)" : "rgba(255,255,255,0.06)",
                color: !activeTag ? "#81C784" : "rgba(255,255,255,0.5)",
                border: `1px solid ${!activeTag ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              All
            </ButtonBase>
            {ALL_TAGS.map((tag) => (
              <ButtonBase
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: activeTag === tag ? "rgba(102,187,106,0.25)" : "rgba(255,255,255,0.06)",
                  color: activeTag === tag ? "#81C784" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${activeTag === tag ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {tag}
              </ButtonBase>
            ))}
          </Box>

          {/* Vendor list */}
          {sorted.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>🌱</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, mb: 1 }}>
                No vendors match your search
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Try different search terms or clear the filter
              </Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, mb: 1.5 }}>
                {sorted.length} Vendor{sorted.length !== 1 ? "s" : ""}
              </Typography>

              {sorted.map((vendor) => (
                <Box
                  key={vendor.id}
                  sx={{
                    ...glassCard({ mb: 1.5, overflow: "hidden" }),
                    borderColor: vendor.featured ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.15)",
                    "&:hover": { background: "rgba(255,255,255,0.08)" },
                    transition: "background 0.2s",
                  }}
                >
                  <Box sx={{ p: 2.5 }}>
                    {/* Header row */}
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 1.5 }}>
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: vendor.featured ? "rgba(102,187,106,0.15)" : "rgba(255,255,255,0.08)",
                          border: `1px solid ${vendor.featured ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.15)"}`,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <SpaIcon sx={{ fontSize: 24, color: vendor.featured ? "#81C784" : "rgba(255,255,255,0.5)" }} />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography sx={{ color: "white", fontWeight: 700, fontSize: 16 }}>
                            {vendor.name}
                          </Typography>
                          {vendor.featured && (
                            <VerifiedIcon sx={{ fontSize: 16, color: "#66BB6A" }} />
                          )}
                        </Box>

                        {/* Rating + Shipping */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                            <StarIcon sx={{ fontSize: 14, color: "#FFD54F" }} />
                            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600 }}>
                              {vendor.rating}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                            <LocalShippingIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }} />
                            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                              {vendor.shipping}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* Description */}
                    <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6, mb: 1.5 }}>
                      {vendor.description}
                    </Typography>

                    {/* Tags + Visit */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {vendor.tags.map((tag) => (
                          <Box
                            key={tag}
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 600,
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.5)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {tag}
                          </Box>
                        ))}
                      </Box>

                      <ButtonBase
                        onClick={() => window.open(vendor.website, "_blank")}
                        sx={{
                          px: 2,
                          py: 0.75,
                          borderRadius: 99,
                          fontSize: 13,
                          fontWeight: 700,
                          background: "rgba(102,187,106,0.2)",
                          color: "#81C784",
                          border: "1px solid rgba(102,187,106,0.3)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          "&:hover": { background: "rgba(102,187,106,0.3)" },
                        }}
                      >
                        Visit <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </ButtonBase>
                    </Box>
                  </Box>
                </Box>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
