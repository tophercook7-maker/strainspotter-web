// app/api/scan/coa/route.ts — fetch a COA PDF from a scanned QR link and pull
// the real cannabinoid/terpene numbers out of it.
//
// Flow: resolve share link → direct download → SSRF-safe fetch (IP-checks every
// redirect hop) → verify it's a PDF → unpdf text extraction → parseCoa.
// Subscriber-gated (same as scanning) so it can't be used as an open proxy.

import { NextResponse } from "next/server";
import { lookup } from "dns/promises";
import { requireSubscription } from "@/lib/auth/serverGate";
import { resolveCoaUrl, isPrivateIp } from "@/lib/scanner/coaFetch";
import { parseCoa } from "@/lib/scanner/coaParser";

export const runtime = "nodejs";
export const maxDuration = 25;

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_REDIRECTS = 5;

async function assertPublicHost(hostname: string) {
  const ips = await lookup(hostname, { all: true });
  if (ips.length === 0 || ips.some((r) => isPrivateIp(r.address))) {
    throw new Error("blocked_host");
  }
}

// Manual redirect loop so we can re-check the host on EVERY hop (a public host
// that 302s to an internal IP would otherwise defeat the SSRF guard).
async function safeFetch(startUrl: string): Promise<Response> {
  let url = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad_protocol");
    await assertPublicHost(u.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": "StrainSpotter-COA/1.0", Accept: "application/pdf,*/*" },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("redirect_no_location");
      url = new URL(loc, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("too_many_redirects");
}

export async function GET(req: Request) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const raw = new URL(req.url).searchParams.get("url") || "";
  const direct = resolveCoaUrl(raw);
  if (!direct) {
    return NextResponse.json({ error: "Not a valid link." }, { status: 400 });
  }

  try {
    const res = await safeFetch(direct);
    if (!res.ok) {
      return NextResponse.json({ error: `Couldn't open the certificate (${res.status}).` }, { status: 502 });
    }

    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) {
      return NextResponse.json({ error: "Certificate file is too large." }, { status: 413 });
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Certificate file is too large." }, { status: 413 });
    }
    // Must be an actual PDF (magic bytes) — blocks non-PDF SSRF payloads.
    const magic = String.fromCharCode(...buf.slice(0, 5));
    if (!magic.startsWith("%PDF")) {
      return NextResponse.json({ error: "That link isn't a readable PDF certificate." }, { status: 415 });
    }

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const flat = Array.isArray(text) ? text.join("\n") : String(text);

    const coa = parseCoa(flat);
    if (!coa) {
      return NextResponse.json(
        { error: "Opened the certificate but couldn't find a lab panel in it.", pages: totalPages },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, coa, sourceUrl: raw, pages: totalPages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const blocked = msg === "blocked_host" || msg === "bad_protocol";
    return NextResponse.json(
      { error: blocked ? "That link can't be fetched safely." : "Couldn't read the certificate." },
      { status: blocked ? 400 : 502 }
    );
  }
}
