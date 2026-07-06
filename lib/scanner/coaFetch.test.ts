import { describe, it, expect } from "vitest";
import { resolveCoaUrl, looksLikeCoaUrl, isPrivateIp } from "./coaFetch";

describe("resolveCoaUrl", () => {
  it("forces Dropbox direct download (dl=1)", () => {
    const r = resolveCoaUrl("https://www.dropbox.com/scl/fi/iwfcc/cert.pdf?rlkey=abc&dl=0")!;
    expect(r).toContain("dl=1");
    expect(r).not.toContain("dl=0");
  });
  it("converts Google Drive to direct download", () => {
    expect(resolveCoaUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view"))
      .toBe("https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp");
  });
  it("passes a direct PDF url through", () => {
    expect(resolveCoaUrl("https://labs.example.com/coa/AR83943.pdf"))
      .toBe("https://labs.example.com/coa/AR83943.pdf");
  });
  it("rejects non-http(s)", () => {
    expect(resolveCoaUrl("ftp://x/y")).toBeNull();
    expect(resolveCoaUrl("javascript:alert(1)")).toBeNull();
    expect(resolveCoaUrl("not a url")).toBeNull();
  });
});

describe("looksLikeCoaUrl", () => {
  it("recognizes pdf + cert hosts", () => {
    expect(looksLikeCoaUrl("https://www.dropbox.com/scl/fi/x/Purple-Banner.pdf?dl=0")).toBe(true);
    expect(looksLikeCoaUrl("https://acrelabs.example/coa/123")).toBe(true);
    expect(looksLikeCoaUrl("https://instagram.com/someone")).toBe(false);
  });
});

describe("isPrivateIp (SSRF guard)", () => {
  it("blocks private / loopback / link-local / metadata", () => {
    for (const ip of ["127.0.0.1","10.1.2.3","192.168.0.5","172.16.0.1","172.31.255.255","169.254.169.254","0.0.0.0","100.64.0.1","::1","fe80::1","fc00::1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });
  it("allows public IPs", () => {
    for (const ip of ["8.8.8.8","1.1.1.1","162.125.1.1","2606:4700::1111"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
    expect(isPrivateIp("172.15.0.1")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
  });
});
