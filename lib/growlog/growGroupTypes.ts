/**
 * Grow Groups — local-first, optional organization for plants (tents, rooms, runs, etc.).
 */

export type GrowGroupType = "tent" | "room" | "outdoor" | "season" | "run" | "other";

export type GrowGroupStatus = "active" | "completed" | "archived";

export type GrowGroupRecord = {
  id: string;
  name: string;
  type: GrowGroupType;
  status: GrowGroupStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Denormalized count — should match plantIds.length */
  plantCount: number;
  plantIds: string[];
};

export type GrowGroupSelectionOption = {
  id: string;
  label: string;
  subtitle?: string;
};

export const GROW_GROUP_TYPE_LABELS: Record<GrowGroupType, string> = {
  tent: "Tent",
  room: "Room",
  outdoor: "Outdoor",
  season: "Season",
  run: "Run",
  other: "Other",
};

export const GROW_GROUP_STATUS_LABELS: Record<GrowGroupStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};
