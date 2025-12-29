export type GardenFeature = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const gardenFeatures: GardenFeature[] = [
  {
    id: "scan",
    title: "Scanner",
    description: "Identify strains from images or camera.",
    href: "/scanner",
  },
  {
    id: "upload",
    title: "Upload Image",
    description: "Upload a strain photo for analysis.",
    href: "/scanner-upload",
  },
  {
    id: "saved",
    title: "Saved Strains",
    description: "Your scanned and saved strains.",
    href: "/gallery",
  },
  {
    id: "community",
    title: "Community",
    description: "Groups, posts, and discussions.",
    href: "/community",
  },
  {
    id: "discover",
    title: "Discover",
    description: "Browse strains and tools.",
    href: "/discover",
  },
  {
    id: "news",
    title: "News",
    description: "Industry and strain news.",
    href: "/discover/news",
  },
  {
    id: "dispensaries",
    title: "Dispensaries",
    description: "Find nearby dispensaries.",
    href: "/dispensaries",
  },
  {
    id: "strains",
    title: "Strain Library",
    description: "Explore the strain database.",
    href: "/strains",
  },
  {
    id: "account",
    title: "Account",
    description: "Profile and settings.",
    href: "/account",
  },
  {
    id: "membership",
    title: "Membership",
    description: "Manage your plan and access.",
    href: "/account",
  },
];

