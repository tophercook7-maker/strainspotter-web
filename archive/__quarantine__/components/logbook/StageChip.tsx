"use client";

interface StageChipProps {
  stage: string;
}

export function StageChip({ stage }: StageChipProps) {
  const colors: Record<string, string> = {
    seed: "#6ee7b7",
    veg: "#34d399",
    flower: "#f472b6",
    dry: "#fbbf24",
    cure: "#a78bfa",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: colors[stage] ?? "#444",
        color: "#000",
      }}
    >
      {stage.toUpperCase()}
    </span>
  );
}
