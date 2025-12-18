"use client";

import Link from "next/link";
import WhatYouMissed from "@/components/community/WhatYouMissed";

const groupCategories = [
  {
    id: "growers",
    name: "Grower Groups",
    description: "Connect with growers at all experience levels",
    icon: "🌱",
    groups: [
      { id: "beginners", name: "Beginner Growers", memberCount: 0 },
      { id: "intermediate", name: "Intermediate Growers", memberCount: 0 },
      { id: "advanced", name: "Advanced Growers", memberCount: 0 },
      { id: "commercial", name: "Commercial Growers", memberCount: 0 },
    ],
  },
  {
    id: "strains",
    name: "Strain Groups",
    description: "Discuss specific strains and genetics",
    icon: "🌿",
    groups: [
      { id: "indica", name: "Indica Lovers", memberCount: 0 },
      { id: "sativa", name: "Sativa Enthusiasts", memberCount: 0 },
      { id: "hybrid", name: "Hybrid Growers", memberCount: 0 },
      { id: "landrace", name: "Landrace Genetics", memberCount: 0 },
    ],
  },
  {
    id: "regional",
    name: "Regional Groups",
    description: "Find growers in your area",
    icon: "🗺️",
    groups: [
      { id: "north-america", name: "North America", memberCount: 0 },
      { id: "europe", name: "Europe", memberCount: 0 },
      { id: "asia", name: "Asia Pacific", memberCount: 0 },
      { id: "other", name: "Other Regions", memberCount: 0 },
    ],
  },
  {
    id: "official",
    name: "Official Groups",
    description: "StrainSpotter announcements and support",
    icon: "⭐",
    groups: [
      { id: "announcements", name: "Announcements", memberCount: 0 },
      { id: "support", name: "Community Support", memberCount: 0 },
      { id: "feature-requests", name: "Feature Requests", memberCount: 0 },
    ],
  },
];

const communityRules = [
  "Be respectful and constructive in all discussions",
  "No sharing of illegal activities or content",
  "Keep discussions focused on growing and cannabis knowledge",
  "No spam, self-promotion, or off-topic posts",
  "Follow all local laws and regulations",
  "Moderators reserve the right to remove content that violates these rules",
];

export default function CommunityPage() {
  return (
    <div className="space-y-6 md:space-y-10 p-4 md:p-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-white mb-2">Community</h1>
        <p className="text-lg text-white/85 mb-4">
          Learn from real growers. Moderated for safety.
        </p>
        <p className="text-sm text-white/70">
          Community is currently in read-only mode. Browse discussions and learn from experienced growers.
        </p>
      </div>

      {/* What You Missed */}
      <WhatYouMissed />

      {/* Safety Notice */}
      <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20 max-w-4xl">
        <p className="text-sm text-white/90">
          Educational discussion only. No medical advice. Follow local laws.
        </p>
      </div>

      {/* Rules Section */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20 max-w-4xl">
        <h2 className="text-xl font-semibold text-white mb-4">Community Rules</h2>
        <ul className="space-y-2">
          {communityRules.map((rule, index) => (
            <li key={index} className="text-sm text-white/80 flex items-start gap-2">
              <span className="text-white/60 mt-0.5">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/60 mt-4">
          These rules help maintain a safe, educational environment for all members.
        </p>
      </section>

      {/* Group Categories */}
      <div className="space-y-8">
        {groupCategories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
              </h2>
              <p className="text-sm text-white/70 mt-1">{category.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/community/groups/${category.id}/${group.id}`}
                  className="rounded-xl bg-white/15 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="text-base font-medium text-white mb-1">
                    {group.name}
                  </div>
                  <div className="text-xs text-white/60">
                    {group.memberCount === 0 ? "New group" : `${group.memberCount} members`}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer Note */}
      <div className="rounded-xl bg-white/5 backdrop-blur-lg p-4 border border-white/10 max-w-4xl">
        <p className="text-xs text-white/60 text-center">
          Community features are being developed. Posting and interaction will be enabled soon.
        </p>
        <p className="text-xs text-white/50 text-center mt-2">
          <Link href="/about" className="underline hover:text-white/70">
            What StrainSpotter Is / Isn't
          </Link>
        </p>
      </div>
    </div>
  );
}
