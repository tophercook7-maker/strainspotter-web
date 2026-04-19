// lib/scanner/strainSlug.ts

import strainDb from "@/lib/data/strains.json";

interface StrainEntry {
  name: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveStrainSlug(name: string): string | null {
  const target = slugify(name);

  for (const entry of strainDb as StrainEntry[]) {
    if (slugify(entry.name) === target) {
      return target;
    }
  }

  return target || null;
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function displayStrainNameForSlug(slug: string): string {
  const resolved = resolveStrainSlug(slug);
  if (!resolved) return titleCaseSlug(slug);

  for (const entry of strainDb as StrainEntry[]) {
    if (slugify(entry.name) === resolved) {
      return entry.name;
    }
  }

  return titleCaseSlug(slug);
}
