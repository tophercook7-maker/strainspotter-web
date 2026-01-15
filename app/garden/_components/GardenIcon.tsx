"use client";

import { useRouter } from "next/navigation";

export default function GardenIcon({
  label,
  icon,
  route,
}: {
  label: string;
  icon: string;
  route: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(route)}
      className="
        h-28 w-28
        rounded-2xl
        bg-white
        shadow-lg
        flex flex-col items-center justify-center
        gap-2
        active:scale-95
        transition
      "
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-black text-center">
        {label}
      </span>
    </button>
  );
}
