export const gardenGroups = [
  {
    id: "grow",
    label: "Grow Tools",
    buttons: [
      { id: "plants", href: "/garden/plants", label: "My Plants", description: "Track your active grows" },
      { id: "logbook", href: "/garden/logbook", label: "Grow Logbook", description: "Log entries and notes" },
      { id: "coach", href: "/garden/grow-coach", label: "Grow Coach", description: "AI-powered growing advice" },
      { id: "doctor", href: "/garden/grow-doctor", label: "Grow Doctor", description: "Diagnose plant issues" },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    buttons: [
      { id: "strains", href: "/garden/strains", label: "Strains", description: "Browse strain library" },
      { id: "effects", href: "/garden/effects", label: "Effects", description: "Find strains by effect" },
      { id: "flavors", href: "/garden/flavors", label: "Flavors", description: "Explore terpene profiles" },
    ],
  },
  {
    id: "find",
    label: "Find & Buy",
    buttons: [
      { id: "dispensaries", href: "/garden/dispensaries", label: "Dispensaries", description: "Find nearby dispensaries" },
      { id: "seed-vendors", href: "/garden/seed-vendors", label: "Seed Vendors", description: "Buy seeds online" },
      { id: "coa", href: "/garden/coa", label: "COA Reader", description: "Scan certificates of analysis" },
    ],
  },
  {
    id: "community",
    label: "Community",
    buttons: [
      { id: "growers", href: "/garden/growers", label: "Growers", description: "Connect with other growers" },
      { id: "community", href: "/garden/community", label: "Community", description: "Discussion and tips" },
    ],
  },
];
