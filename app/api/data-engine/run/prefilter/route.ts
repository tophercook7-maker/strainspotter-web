import { runPipelineStep } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runPipelineStep({
    step: "prefilter",
    label: "Prefilter dataset",
    command: "node",
    args: ["scripts/prefilter-vault-dataset.mjs"],
  });
}
