export const gardenGroups = [
  {
    id: "actions",
    label: "ACTIONS",
    buttons: [
      { id: "scanner", href: "/scanner", label: "Scan a Plant", description: "Identify strain or diagnose issues", isPrimary: true },
      { id: "gallery", href: "/gallery", label: "View Gallery", description: "Browse your scan history" },
      { id: "vault", href: "/vault", label: "Vault", description: "Strain data and tools" },
      { id: "discover", href: "/discover", label: "Discover", description: "Explore strains and news" },
    ],
  },
  {
    id: "records",
    label: "RECORDS",
    buttons: [
      { id: "gallery", href: "/gallery", label: "Scan Gallery", description: "Your scan history" },
      { id: "vault", href: "/vault", label: "Data Vault", description: "Strain database and tools" },
      { id: "account", href: "/account", label: "Account", description: "Settings and membership" },
    ],
  },
  {
    id: "intelligence",
    label: "INTELLIGENCE",
    buttons: [
      { id: "vault", href: "/vault", label: "Vault Tools", description: "AI and data tools" },
      { id: "scanner", href: "/scanner", label: "Scanner", description: "Strain identification" },
    ],
  },
  {
    id: "find-buy",
    label: "FIND & BUY",
    buttons: [
      { id: "discover", href: "/discover", label: "Discover", description: "Find strains and dispensaries" },
      { id: "seeds", href: "/seeds", label: "Seed Vendors", description: "Browse seed sellers" },
    ],
  },
  {
    id: "community-news",
    label: "COMMUNITY & NEWS",
    buttons: [
      { id: "community", href: "/community", label: "Community", description: "Discussion and tips" },
      { id: "news", href: "/discover/news", label: "Cannabis News", description: "Latest industry updates" },
    ],
  },
];

