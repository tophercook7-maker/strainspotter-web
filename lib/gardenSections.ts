export type GardenItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon?: string; // Icon name/identifier - will be mapped to React components
  external?: boolean;
  disabled?: boolean;
};

export const ACTIONS: GardenItem[] = [
  {
    id: "scan",
    title: "Document plant",
    description: "Add visual context to your grow’s history.",
    href: "/scanner",
    icon: "camera",
  },
  {
    id: "log-update",
    title: "Log an Update",
    description: "Add notes, photos, or observations",
    href: "/garden/logbook",
    icon: "edit",
  },
  {
    id: "add-plant",
    title: "Add a Plant",
    description: "Create a new plant profile",
    href: "/garden/plants/new",
    icon: "leaf",
  },
  {
    id: "create-task",
    title: "Create a Task",
    description: "Schedule care and reminders",
    href: "/garden/tasks/new",
    icon: "checklist",
  },
];

export const RECORDS: GardenItem[] = [
  {
    id: "logbook",
    title: "Grow Logbook",
    description: "Timeline of your grow activity",
    href: "/garden/logbook",
    icon: "book",
  },
  {
    id: "my-plants",
    title: "My Plants",
    description: "View and manage plant profiles",
    href: "/garden/plants",
    icon: "sprout",
  },
  {
    id: "environment",
    title: "Grow Environment",
    description: "Track environmental conditions",
    href: "/garden/environment",
    icon: "thermometer",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "View upcoming and completed tasks",
    href: "/garden/tasks",
    icon: "calendar",
  },
  {
    id: "notes",
    title: "Grow Notes",
    description: "Freeform notes and ideas",
    href: "/garden/notes",
    icon: "note",
  },
];

export const INTELLIGENCE: GardenItem[] = [
  {
    id: "coach",
    title: "Grow Coach",
    description: "Insights from your grow history",
    href: "/coach",
    icon: "brain",
  },
  {
    id: "doctor",
    title: "Grow Doctor",
    description: "Diagnose issues from photos",
    href: "/doctor",
    icon: "stethoscope",
  },
  {
    id: "strain-explorer",
    title: "Strain Explorer",
    description: "Factual strain reference and knowledge base",
    href: "/strain-explorer",
    icon: "search",
  },
];

export const FIND_AND_BUY: GardenItem[] = [
  {
    id: "dispensary-finder",
    title: "Dispensary Finder",
    description: "Find nearby dispensaries",
    href: "/discover/dispensaries",
    icon: "store",
  },
  {
    id: "seed-finder",
    title: "Seed Finder",
    description: "Browse cannabis seed banks",
    href: "/seeds",
    icon: "seedling",
  },
];

export const COMMUNITY: GardenItem[] = [
  {
    id: "community",
    title: "Community",
    description: "Connect with other growers",
    href: "/community",
    icon: "users",
  },
  {
    id: "news",
    title: "Cannabis News",
    description: "Industry updates and insights",
    href: "/discover/news",
    icon: "newspaper",
  },
];

