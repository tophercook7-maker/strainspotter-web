#!/usr/bin/env node
/**
 * HTTP stress test for POST /api/scan
 *
 * Default body uses empty `images` → expects 400 (no OpenAI cost).
 *
 * Usage:
 *   node scripts/stress-scan-api.mjs
 *   node scripts/stress-scan-api.mjs --url http://127.0.0.1:3000/api/scan --concurrency 25 --requests 500
 */

import { performance } from "node:perf_hooks";

function parseArgs() {
  const args = process.argv.slice(2);
  let url = process.env.SCAN_STRESS_URL || "http://127.0.0.1:3000/api/scan";
  let concurrency = 20;
  let requests = 200;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    else if (args[i] === "--concurrency" && args[i + 1])
      concurrency = Math.max(1, parseInt(args[++i], 10) || 20);
    else if (args[i] === "--requests" && args[i + 1])
      requests = Math.max(1, parseInt(args[++i], 10) || 200);
  }
  return { url, concurrency, requests };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx];
}

async function runPool({ url, concurrency, requests, body, expectStatus }) {
  const latencies = [];
  let errors = 0;
  let statusMismatch = 0;
  let completed = 0;
  let i = 0;

  const worker = async () => {
    for (;;) {
      const n = i++;
      if (n >= requests) break;
      const t0 = performance.now();
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const ms = performance.now() - t0;
        latencies.push(ms);
        if (expectStatus != null && res.status !== expectStatus) statusMismatch++;
        if (!res.ok && expectStatus == null) errors++;
      } catch {
        latencies.push(performance.now() - t0);
        errors++;
      }
      completed++;
    }
  };

  const tStart = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalMs = performance.now() - tStart;

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);

  return {
    totalMs,
    completed,
    errors,
    statusMismatch,
    rps: completed / (totalMs / 1000),
    latencyAvg: latencies.length ? sum / latencies.length : 0,
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95),
    latencyP99: percentile(latencies, 99),
    latencyMin: latencies[0] ?? 0,
    latencyMax: latencies[latencies.length - 1] ?? 0,
  };
}

async function main() {
  const { url, concurrency, requests } = parseArgs();

  const body = { images: [] };
  const expectStatus = 400;

  console.log("StrainSpotter — /api/scan stress (empty images → 400)");
  console.log(`URL: ${url}`);
  console.log(`Concurrency: ${concurrency}, Requests: ${requests}`);
  console.log("—".repeat(50));

  const out = await runPool({ url, concurrency, requests, body, expectStatus });

  console.log(`Finished in ${out.totalMs.toFixed(0)} ms`);
  console.log(`Completed: ${out.completed}, fetch errors: ${out.errors}`);
  console.log(
    `Status !== ${expectStatus}: ${out.statusMismatch} (should be 0 if route healthy)`
  );
  console.log(`Throughput: ${out.rps.toFixed(1)} req/s`);
  console.log("Latency (ms):");
  console.log(`  min ${out.latencyMin.toFixed(2)} | p50 ${out.latencyP50.toFixed(2)} | p95 ${out.latencyP95.toFixed(2)} | p99 ${out.latencyP99.toFixed(2)} | max ${out.latencyMax.toFixed(2)}`);
  console.log(`  avg ${out.latencyAvg.toFixed(2)}`);

  if (out.errors === out.completed) {
    console.log("\n⚠ All requests failed — is `next dev` (or your server) running?");
    process.exitCode = 1;
  } else if (out.statusMismatch > 0) {
    console.log("\n⚠ Unexpected status codes — check route / middleware.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
