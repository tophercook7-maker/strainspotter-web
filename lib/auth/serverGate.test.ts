import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireSubscription } from "./serverGate";

const URL_BASE = "https://test.supabase.co";

function req(headers: Record<string, string> = {}) {
  return new Request("https://app.test/api/scan", { method: "POST", headers });
}
function authed() {
  return req({ authorization: "Bearer valid-token" });
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Mock the two upstream calls: /auth/v1/user then /rest/v1/profiles. */
function stubFetch(opts: { user?: Response | Error; profile?: Response | Error }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("/auth/v1/user")) {
        if (opts.user instanceof Error) throw opts.user;
        return opts.user ?? json({ id: "user-1" });
      }
      if (u.includes("/rest/v1/profiles")) {
        if (opts.profile instanceof Error) throw opts.profile;
        return opts.profile ?? json([{ membership: "pro" }]);
      }
      throw new Error(`unexpected fetch: ${u}`);
    }),
  );
}

async function codeOf(res: Response): Promise<string> {
  return (await res.json()).code;
}

describe("requireSubscription", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_BASE);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("401s with no Authorization header", async () => {
    const r = await requireSubscription(req());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(401);
      expect(await codeOf(r.response)).toBe("auth_required");
    }
  });

  it("401s on an empty bearer token", async () => {
    const r = await requireSubscription(req({ authorization: "Bearer    " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("503s when Supabase env is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const r = await requireSubscription(authed());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(503);
      expect(await codeOf(r.response)).toBe("auth_misconfigured");
    }
  });

  it("401s when the token is rejected by Supabase", async () => {
    stubFetch({ user: json({ error: "bad" }, 401) });
    const r = await requireSubscription(authed());
    if (!r.ok) {
      expect(r.response.status).toBe(401);
      expect(await codeOf(r.response)).toBe("session_expired");
    } else throw new Error("expected failure");
  });

  it("500s when the auth backend is unreachable", async () => {
    stubFetch({ user: new Error("network down") });
    const r = await requireSubscription(authed());
    if (!r.ok) {
      expect(r.response.status).toBe(500);
      expect(await codeOf(r.response)).toBe("auth_network");
    } else throw new Error("expected failure");
  });

  it("402s when authenticated but not subscribed (free/null)", async () => {
    stubFetch({ user: json({ id: "user-1" }), profile: json([{ membership: "free" }]) });
    const r = await requireSubscription(authed());
    if (!r.ok) {
      expect(r.response.status).toBe(402);
      expect(await codeOf(r.response)).toBe("subscription_required");
    } else throw new Error("expected failure");
  });

  it("authorizes a Member (garden) and a Pro (elite)", async () => {
    stubFetch({ user: json({ id: "u-m" }), profile: json([{ membership: "garden" }]) });
    const member = await requireSubscription(authed());
    expect(member.ok).toBe(true);
    if (member.ok) expect(member.tier).toBe("member");

    stubFetch({ user: json({ id: "u-p" }), profile: json([{ membership: "elite" }]) });
    const pro = await requireSubscription(authed());
    expect(pro.ok).toBe(true);
    if (pro.ok) {
      expect(pro.tier).toBe("pro");
      expect(pro.userId).toBe("u-p");
    }
  });

  it("500s when the profile lookup fails", async () => {
    stubFetch({ user: json({ id: "user-1" }), profile: json({ error: "boom" }, 500) });
    const r = await requireSubscription(authed());
    if (!r.ok) {
      expect(r.response.status).toBe(500);
      expect(await codeOf(r.response)).toBe("profile_error");
    } else throw new Error("expected failure");
  });
});
