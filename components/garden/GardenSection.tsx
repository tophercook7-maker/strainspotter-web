// components/garden/GardenSection.tsx
import Link from "next/link"

interface GardenItem {
  id: string
  title: string
  description: string
  href: string
}

interface GardenSectionProps {
  title: string
  items: GardenItem[]
}

export default function GardenSection({ title, items }: GardenSectionProps) {
  return (
    <section className="mt-24 text-center">
      {/* Section Title */}
      <h2 className="mb-12 text-4xl font-semibold tracking-wide text-white">
        {title}
      </h2>

      {/* Card Grid */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="
              group rounded-2xl bg-white/10 p-6
              text-center backdrop-blur-md
              transition hover:scale-[1.03] hover:bg-white/20
            "
          >
            <h3 className="mb-2 text-lg font-medium text-white">
              {item.title}
            </h3>
            <p className="text-sm text-white/80">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
