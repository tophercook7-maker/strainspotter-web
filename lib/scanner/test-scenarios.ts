// lib/scanner/test-scenarios.ts
// Test cases for verifying scanner regression guard

export const TEST_SCENARIOS = {
  singleImage: {
    description: "1 image scan",
    expectedBehavior: "Should return a valid strain name (possibly low confidence) and not 'Unknown'",
    mockInput: [new File([""], "test-image-1.jpg", { type: "image/jpeg" })]
  },
  nearDuplicate: {
    description: "2 near-duplicate images",
    expectedBehavior: "Should detect similarity, warn user, but still return a valid strain name",
    mockInput: [
      new File(["a"], "test-image-1.jpg", { type: "image/jpeg" }),
      new File(["a"], "test-image-2.jpg", { type: "image/jpeg" }) // Same content
    ]
  },
  lowQuality: {
    description: "Low quality image",
    expectedBehavior: "Should return 'Unverified Cultivar (visual match only)' or 'Closest Known Cultivar' if no match found, but never empty or 'Unknown'",
    mockInput: [new File([""], "blurry-image.jpg", { type: "image/jpeg" })]
  }
};
