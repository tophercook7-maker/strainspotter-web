"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlantAction } from "@/app/actions/plants";

type Props = { strainName: string; coverImageUrl?: string | null };

export default function AddAsPlantButton({ strainName, coverImageUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isGenericName =
    strainName === "New Plant" ||
    strainName === "Unverified Cultivar (visual match only)" ||
    strainName === "Closest Known Cultivar";
  const plantDefaultName = isGenericName ? "New Plant" : `${strainName} Plant`;
  const plantStrainName = isGenericName ? null : strainName;

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", plantDefaultName);
      if (plantStrainName) formData.set("strain_name", plantStrainName);
      formData.set("status", "active");
      if (coverImageUrl) formData.set("cover_image_url", coverImageUrl);
      const result = await createPlantAction(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/garden/plants/${result.id}`);
    } catch {
      setError("Could not create plant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 transition-colors"
      >
        {loading ? "Adding…" : "Add as Plant"}
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
