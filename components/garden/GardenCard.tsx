// components/garden/GardenCard.tsx
import Link from "next/link"

interface GardenCardProps {
  title: string
  description: string
  href: string
}

export default function GardenCard({ title, description, href }: GardenCardProps) {
  return (
    <Link
      href={href}
      className="
        group relative rounded-2xl bg-white/10 p-6 text-center
        backdrop-blur-md border border-white/10 transition
        hover:bg-white/20 hover:border-white/20 hover:scale-[1.02]
      "
    >
      <h3 className="mb-2 text-lg font-medium text-white">
        {title}
      </h3>
      <p className="text-sm text-white/80">
        {description}
      </p>
    </Link>
  )
}
