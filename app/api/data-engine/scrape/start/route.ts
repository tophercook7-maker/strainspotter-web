import { runScrapeCommand } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runScrapeCommand();
}
