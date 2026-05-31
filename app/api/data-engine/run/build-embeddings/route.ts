import { runPipelineStep } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runPipelineStep({
    step: "build-embeddings",
    label: "Build embeddings",
    command: "node",
    args: ["scripts/build-embedding-dataset.mjs"],
    timeoutMs: 30 * 60 * 1000,
  });
}
