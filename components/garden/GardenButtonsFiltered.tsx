"use client";

import Link from "next/link";

const sections = [
  {
    title: "Document",
    items: [
      {
        title: "Document plant",
        description: "Add visual context to your grow’s history.",
        href: "/scanner",
        primary: true,
      },
    ],
  },
  {
    title: "My Garden",
    items: [
      {
        title: "Grow Logbook",
        description: "Track plants, logs, notes, and grow activity",
        href: "/garden/logbook",
      },
    ],
  },
  {
    title: "Grow Intelligence",
    items: [
      {
        title: "Grow Coach",
        description: "AI-powered grow insights and guidance",
        href: "/growers",
      },
    ],
  },
  {
    title: "Find & Buy",
    items: [
      {
        title: "Discover",
        description: "Find dispensaries, seeds, and cannabis news",
        href: "/discover",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Community Hub",
        description: "Groups, chat, and shared knowledge",
        href: "/community",
      },
    ],
  },
];

export default function GardenButtonsFiltered() {
  return (
    <div className="space-y-14">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-6 text-sm font-semibold tracking-widest text-white/60 uppercase">
            {section.title}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`
                  rounded-2xl p-6 transition
                  backdrop-blur-md
                  ${
                    'primary' in item && item.primary
                      ? "bg-white/20 hover:bg-white/30"
                      : "bg-white/10 hover:bg-white/20"
                  }
                `}
              >
                <div className="text-lg font-semibold text-white">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-white/70">
                  {item.description}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
