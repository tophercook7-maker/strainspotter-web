import { GardenIcon } from "./_components/GardenIcon";

const gardenItems = [
  { title: "Scanner", href: "/garden/scanner", icon: "scanner" },
  { title: "Dispensaries", href: "/garden/dispensaries", icon: "dispensaries" },
  { title: "Strains", href: "/garden/strains", icon: "strains" },
  { title: "Seed Vendors", href: "/garden/seed-vendors", icon: "seed-vendors" },
  { title: "Grow Coach", href: "/garden/grow-coach", icon: "grow-coach" },
  { title: "History", href: "/garden/history", icon: "history" },
  { title: "Favorites", href: "/garden/favorites", icon: "favorites" },
  { title: "Ecosystem", href: "/garden/ecosystem", icon: "ecosystem" },
  { title: "Settings", href: "/garden/settings", icon: "settings" },
];

export default function GardenPage() {
  return (
    <section className="relative w-full flex items-center justify-center text-white">
      
      {/* ATMOSPHERIC BACKGROUND IS HANDLED BY garden/layout.tsx */}

      {/* GARDEN SURFACE */}
      <div className="relative z-10 w-full max-w-5xl px-8 py-16">
        
        {/* TITLE */}
        <div className="flex flex-col items-center mb-16">
          <div className="mb-4 text-4xl">🍃</div>
          <h1 className="text-5xl font-semibold tracking-tight">
            StrainSpotter AI
          </h1>
        </div>

        {/* ICON GRID — APPLE STYLE */}
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            gap-x-12
            gap-y-16
            place-items-center
          "
        >
          {gardenItems.map((item) => (
            <GardenIcon
              key={item.title}
              label={item.title}
              href={item.href}
              icon={item.icon}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
