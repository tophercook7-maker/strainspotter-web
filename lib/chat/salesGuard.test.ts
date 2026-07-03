import { describe, it, expect } from "vitest";
import { checkNoSales } from "./salesGuard";

describe("checkNoSales — community chat no-sales guard", () => {
  it("blocks clear solicitations", () => {
    for (const msg of [
      "Got some GG4 for sale, hmu",
      "I'm selling zips this weekend",
      "DM me to buy, best prices in town",
      "$200 a zip, discreet shipping available",
      "150 per oz if anyone wants in",
      "cashapp me and I'll send the order",
      "venmo ready — dm for the menu",
      "menu in my bio",
      "I'm the plug for this area",
    ]) {
      expect(checkNoSales(msg).blocked, msg).toBe(true);
    }
  });

  it("does NOT block normal grower/consumer talk (false-positive guard)", () => {
    for (const msg of [
      "The dispensary was selling it for $45 an eighth, worth it?",
      "What's the selling point of autoflowers vs photoperiod?",
      "My plant is 4 weeks into flower and smells amazing",
      "I paid way too much at the dispensary yesterday",
      "Blue Dream hits different when it's grown right",
      "Anyone tried the new Gary Payton drop at Good Day Farm?",
      "You can buy seeds legally from the vendors tab",
      "How do I know when to harvest?",
    ]) {
      expect(checkNoSales(msg).blocked, msg).toBe(false);
    }
  });

  it("handles empty/garbage input", () => {
    expect(checkNoSales("").blocked).toBe(false);
    expect(checkNoSales(null as unknown as string).blocked).toBe(false);
  });
});
