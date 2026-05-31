import { getVaultRoot, runPipelineStep } from "../_shared";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const vaultRoot = await getVaultRoot();
  if (!vaultRoot) {
    return NextResponse.json(
      {
        status: "error",
        error: "No Vault root is configured. Set DATA_ENGINE_VAULT_ROOT or run once after data/vault-index.json exists.",
      },
      { status: 400 }
    );
  }

  return runPipelineStep({
    step: "index-vault",
    label: "Index Vault",
    command: "node",
    args: ["scripts/index-vault-dataset.mjs", "--root", vaultRoot],
  });
}
