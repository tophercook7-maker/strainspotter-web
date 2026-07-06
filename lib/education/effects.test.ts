import { describe, it, expect } from "vitest";
import { getEffectInfo } from "./effects";
import { interpretHarvest } from "./harvest";

describe("effects KB", () => {
  it("explains common effects", () => {
    expect(getEffectInfo("Relaxed")?.name).toBe("Relaxed");
    expect(getEffectInfo("euphoric")?.why).toMatch(/reward/i);
    expect(getEffectInfo("Not An Effect")).toBeNull();
  });
});
describe("harvest interpreter", () => {
  it("reads trichome color into a window", () => {
    expect(interpretHarvest("cloudy with some amber")?.stage).toMatch(/peak harvest/i);
    expect(interpretHarvest("mostly amber")?.stage).toMatch(/sedative/i);
    expect(interpretHarvest("clear glassy heads")?.stage).toMatch(/not ready/i);
    expect(interpretHarvest("milky white")?.stage).toMatch(/peak thc/i);
    expect(interpretHarvest("")).toBeNull();
  });
});
