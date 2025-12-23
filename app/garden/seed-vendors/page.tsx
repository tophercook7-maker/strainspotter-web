"use client";

import Link from "next/link";
import { setupAndroidBackHandler } from "@/lib/navigation/androidBack";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface SeedVendor {
  name: string;
  description: string;
  url: string;
}

const seedVendors: SeedVendor[] = [
  {
    name: "North Atlantic Seed Co",
    description: "Popular US seed bank with fast shipping",
    url: "https://northatlanticseed.com"
  },
  {
    name: "Seedsman",
    description: "International seed bank with wide strain selection",
    url: "https://www.seedsman.com"
  },
  {
    name: "ILGM",
    description: "Beginner-friendly seed bank with grow guides",
    url: "https://www.ilovegrowingmarijuana.com"
  },
  {
    name: "Humboldt Seed Company",
    description: "Breeder-direct genetics from Humboldt County",
    url: "https://humboldtseedcompany.com"
  },
  {
    name: "Multiverse Beans",
    description: "Curated breeder drops and exclusives",
    url: "https://multiversebeans.com"
  },
  {
    name: "DC Seed Exchange",
    description: "Rare and legacy genetics",
    url: "https://dcseedexchange.com"
  },
  {
    name: "Neptune Seed Bank",
    description: "Premium breeder collections",
    url: "https://neptuneseedbank.com"
  }
];

export default function SeedVendorsPage() {
  const router = useRouter();

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupAndroidBackHandler(router, '/garden');
    return cleanup;
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
            ← Back to Garden
          </Link>
          <h1 className="text-3xl font-bold mb-2">Seed Vendors</h1>
          <p className="text-white/70">
            Trusted seed banks and breeders for your next grow
          </p>
        </div>

        {/* Vendors List */}
        <div className="space-y-4">
          {seedVendors.map((vendor, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {vendor.name}
                  </h3>
                  <p className="text-sm text-white/70">
                    {vendor.description}
                  </p>
                </div>
                <a
                  href={vendor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm whitespace-nowrap text-center"
                >
                  Visit Website →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
