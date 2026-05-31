import { runPipelineStep } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runPipelineStep({
    step: "review",
    label: "Apply review decisions",
    command: "node",
    args: ["scripts/review-dataset-manifest.mjs", "--manifest", "data/review-manifest.json"],
  });
}
