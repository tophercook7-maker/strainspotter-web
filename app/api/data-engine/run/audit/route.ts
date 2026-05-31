import { runPipelineStep } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runPipelineStep({
    step: "audit",
    label: "Audit dataset",
    command: "node",
    args: ["scripts/audit-dataset-coverage.mjs"],
  });
}
