export type SeedVendor = {
  id: string;
  name: string;
  website: string;
  location: string;
};

export const SEED_VENDORS: SeedVendor[] = [
  {
    id: "s1",
    name: "North Atlantic Seed Co.",
    website: "https://northatlanticseed.com",
    location: "USA",
  },
  {
    id: "s2",
    name: "ILGM",
    website: "https://ilgm.com",
    location: "USA",
  },
  {
    id: "s3",
    name: "Seedsman",
    website: "https://www.seedsman.com",
    location: "International",
  },
  {
    id: "s4",
    name: "Mephisto Genetics",
    website: "https://www.mephistogenetics.com",
    location: "USA / UK",
  },
];
