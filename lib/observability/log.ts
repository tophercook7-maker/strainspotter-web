// lib/observability/log.ts
//
// Tiny structured-logging shim. Edge runtime safe — uses only console.
// Every log line is a single JSON object so Vercel / Datadog / Splunk
// can index it without regex. Each request gets a short request_id so
// a user complaint can be traced to a specific log line.
//
// Usage:
//   import { logger } from "@/lib/observability/log";
//   const log = logger.child({ route: "/api/scan" });
//   const reqId = log.requestId();
//   log.info("scan_start", { req: reqId, images: 1 });
//   log.warn("scan_failed", { req: reqId, status: 502 });

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function emit(level: LogLevel, event: string, ctx?: LogContext) {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(ctx || {}),
  };
  let serialized: string;
  try {
    serialized = JSON.stringify(line);
  } catch {
    serialized = JSON.stringify({
      ts: line.ts,
      level,
      event,
      _stringify_error: true,
    });
  }
  // Warnings/errors via console.error so Vercel's "errors" filter picks them up.
  if (level === "error" || level === "warn") {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
}

export interface Logger {
  debug: (event: string, ctx?: LogContext) => void;
  info: (event: string, ctx?: LogContext) => void;
  warn: (event: string, ctx?: LogContext) => void;
  error: (event: string, ctx?: LogContext) => void;
  /** Returns a child logger that merges the given context into every emit. */
  child: (extra: LogContext) => Logger;
  /** Generate a short request id (8 hex chars) for a single request. */
  requestId: () => string;
}

function makeLogger(base: LogContext = {}): Logger {
  const wrap = (level: LogLevel) => (event: string, ctx?: LogContext) =>
    emit(level, event, { ...base, ...(ctx || {}) });
  return {
    debug: wrap("debug"),
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error"),
    child: (extra) => makeLogger({ ...base, ...extra }),
    requestId: () => {
      const buf = new Uint8Array(4);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(buf);
      } else {
        for (let i = 0; i < 4; i++) buf[i] = Math.floor(Math.random() * 256);
      }
      return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    },
  };
}

export const logger: Logger = makeLogger();

/**
 * Best-effort POST to a generic alert webhook (Slack, Discord, Zapier,
 * etc.). If ALERT_WEBHOOK_URL is unset this is a no-op.
 *
 * Payload shape works as-is for Slack (text), Discord (content) and any
 * "send me the JSON body" webhook (the whole payload). Errors during
 * the POST are swallowed — alerting must NEVER cause the calling
 * request to fail.
 *
 * Usage from critical paths (cron route on leak, webhook on signature
 * failure, etc.):
 *   await captureAlert("anon_leak_detected", { tables: [...] });
 */
export async function captureAlert(
  event: string,
  ctx?: LogContext
): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const summary = `🚨 [StrainSpotter] ${event}`;
  const body = {
    // Slack: shows `text`. Discord: shows `content`. Both ignore the
    // other; arbitrary webhook receivers can pick whichever they want
    // or the structured `event` + `ctx` below.
    text: summary,
    content: summary,
    event,
    ctx: ctx || {},
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    ts: new Date().toISOString(),
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Tight timeout — alerting must never block a request.
      signal: AbortSignal.timeout(2_000),
    });
  } catch (err) {
    // Don't recurse into captureAlert — that's how alert storms happen.
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        event: "alert_webhook_failed",
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
