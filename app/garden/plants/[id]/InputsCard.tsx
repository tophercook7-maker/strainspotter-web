"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlantInputAction } from "@/app/actions/plants";
import type { PlantInput } from "@/lib/plants/plantsRepo";

const INPUT_KINDS = [
  { value: "nutrients", label: "Nutrients" },
  { value: "amendment", label: "Amendment" },
  { value: "water", label: "Water" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  plantId: string;
  gardenId: string;
  inputs: PlantInput[];
  totalCostUsd: number;
  harvestDryG: number | null;
};

function formatCost(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function InputsCard({ plantId, gardenId, inputs, totalCostUsd, harvestDryG }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("other");
  const [name, setName] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("Name is required.");
      return;
    }
    const cost = Number(costUsd.trim());
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Cost must be a non-negative number.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    formData.set("kind", kind);
    formData.set("name", nameTrim);
    formData.set("cost_usd", costUsd.trim());
    if (amount.trim()) formData.set("amount", amount.trim());
    if (note.trim()) formData.set("note", note.trim());
    const result = await createPlantInputAction(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error === "invalid_input" ? "Name and cost required." : "Failed to add input.");
      return;
    }
    setName("");
    setCostUsd("");
    setAmount("");
    setNote("");
    router.refresh();
  }

  const costPerGram =
    harvestDryG != null && harvestDryG > 0 && totalCostUsd >= 0
      ? totalCostUsd / harvestDryG
      : null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h2 className="text-white font-medium mb-3">Inputs</h2>
      <p className="text-white/90 text-sm">
        Total cost: {formatCost(totalCostUsd)}
      </p>
      {costPerGram != null && (
        <p className="text-white/80 text-sm mt-0.5">
          Cost per gram: {formatCost(costPerGram)}/g
        </p>
      )}

      {inputs.length > 0 && (
        <ul className="space-y-2 mt-4 mb-4">
          {inputs.map((input) => (
            <li
              key={input.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/10 last:border-0 text-sm"
            >
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                {input.kind}
              </span>
              <span className="text-white/90 min-w-0 truncate">{input.name}</span>
              {input.amount && (
                <span className="text-white/60 text-xs">{input.amount}</span>
              )}
              <span className="text-white/90 font-medium">{formatCost(Number(input.cost_usd))}</span>
              <span className="text-white/50 text-xs whitespace-nowrap">
                {new Date(input.occurred_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label htmlFor="input-kind" className="sr-only">Kind</label>
            <select
              id="input-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
            >
              {INPUT_KINDS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="input-name" className="sr-only">Name</label>
            <input
              id="input-name"
              type="text"
              name="name"
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-28 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="input-cost" className="sr-only">Cost ($)</label>
            <input
              id="input-cost"
              type="text"
              inputMode="decimal"
              name="cost_usd"
              placeholder="Cost ($) *"
              value={costUsd}
              onChange={(e) => setCostUsd(e.target.value)}
              className="w-20 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="input-amount" className="sr-only">Amount</label>
            <input
              id="input-amount"
              type="text"
              name="amount"
              placeholder="Amount (e.g. 10ml)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="input-note" className="sr-only">Note</label>
            <input
              id="input-note"
              type="text"
              name="note"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              className="w-24 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50"
          >
            {loading ? "…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
