import { runPipelineStep } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runPipelineStep({
    step: "learn",
    label: "Learn review preferences",
    command: "node",
    args: ["scripts/learn-review-preferences.mjs"],
  });
}
