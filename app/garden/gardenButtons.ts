export const gardenGroups = [
  {
    id: "actions",
    label: "ACTIONS",
    buttons: [
      { id: "scanner", href: "/scanner", label: "Scan a Plant", description: "Identify strain or diagnose issues", isPrimary: true },
      { id: "log-update", href: "/garden/logbook?new=true", label: "Log an Update", description: "Add a logbook entry" },
      { id: "add-plant", href: "/garden/plants/new", label: "Add a Plant", description: "Start tracking a new plant" },
      { id: "create-task", href: "/garden/tasks/new", label: "Create a Task", description: "Add a task to your list" },
    ],
  },
  {
    id: "records",
    label: "RECORDS",
    buttons: [
      { id: "logbook", href: "/garden/logbook", label: "Grow Logbook", description: "Log entries and notes" },
      { id: "plants", href: "/garden/plants", label: "My Plants", description: "Track your active grows" },
      { id: "environment", href: "/garden/environment", label: "Grow Environment", description: "Track temperature, humidity, and more" },
      { id: "tasks", href: "/garden/tasks", label: "Tasks", description: "Your grow checklist" },
      { id: "notes", href: "/garden/notes", label: "Grow Notes", description: "AI-assisted thinking layer" },
    ],
  },
  {
    id: "intelligence",
    label: "INTELLIGENCE",
    buttons: [
      { id: "coach", href: "/garden/grow-coach", label: "Grow Coach", description: "AI-powered growing advice" },
      { id: "doctor", href: "/garden/grow-doctor", label: "Grow Doctor", description: "Diagnose plant issues" },
    ],
  },
  {
    id: "find-buy",
    label: "FIND & BUY",
    buttons: [
      { id: "dispensaries", href: "/garden/dispensaries", label: "Dispensary Finder", description: "Find dispensaries near you" },
      { id: "seed-vendors", href: "/seeds", label: "Seed Vendors", description: "Browse seed sellers" },
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

