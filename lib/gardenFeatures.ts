export const gardenFeatures = [
  // PRIMARY ACTIONS (TOP ROW — MOST USED)
  {
    id: "scanner",
    title: "Scan",
    description: "Identify strain",
    href: "/scan",
    priority: "primary",
  },
  {
    id: "upload",
    title: "Upload",
    description: "Upload image",
    href: "/scan/upload",
    priority: "primary",
  },
  // SECONDARY ACTIONS (CORE HUB)
  {
    id: "saved",
    title: "Library",
    description: "Your saved strains",
    href: "/library",
    priority: "secondary",
  },
  {
    id: "library",
    title: "Explore Strains",
    description: "Browse database",
    href: "/strains",
    priority: "secondary",
  },
  {
    id: "dispensaries",
    title: "Nearby",
    description: "Find dispensaries",
    href: "/dispensaries",
    priority: "secondary",
  },
  // COMMUNITY & CONTENT
  {
    id: "community",
    title: "Community",
    description: "Groups and posts",
    href: "/community",
    priority: "community",
  },
  {
    id: "news",
    title: "News",
    description: "Industry updates",
    href: "/news",
    priority: "community",
  },
  // ACCOUNT / META (BOTTOM)
  {
    id: "membership",
    title: "Plan",
    description: "Upgrade status",
    href: "/membership",
    priority: "meta",
  },
  {
    id: "account",
    title: "Account",
    description: "Profile settings",
    href: "/account",
    priority: "meta",
  },
];
