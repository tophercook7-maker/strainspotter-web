import { describe, it, expect } from "vitest";
import { classifyDispensary } from "./dispensaries";

describe("classifyDispensary — OSM med/rec tagging", () => {
  it("classifies explicit tags", () => {
    expect(classifyDispensary({ "cannabis:medical": "only" })).toBe("medical");
    expect(classifyDispensary({ "cannabis:recreational": "only" })).toBe("recreational");
    expect(classifyDispensary({ "cannabis:medical": "yes", "cannabis:recreational": "yes" })).toBe("both");
    expect(classifyDispensary({ "cannabis:medical": "yes", "cannabis:recreational": "no" })).toBe("medical");
    expect(classifyDispensary({ "cannabis:medical": "no", "cannabis:recreational": "yes" })).toBe("recreational");
  });

  it("single-sided yes without the other tag", () => {
    expect(classifyDispensary({ "cannabis:medical": "yes" })).toBe("medical");
    expect(classifyDispensary({ "cannabis:recreational": "yes" })).toBe("recreational");
  });

  it("untagged shops are honestly unknown", () => {
    expect(classifyDispensary({ shop: "cannabis" })).toBe("unknown");
    expect(classifyDispensary(undefined)).toBe("unknown");
  });
});
