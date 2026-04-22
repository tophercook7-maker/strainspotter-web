/**
 * First-class plant identity — local-first, server-migratable.
 */

export type PlantStatus = "active" | "archived";

/** Canonical plant record stored in local plant store */
export type PlantRecord = {
  id: string;
  /** Display title, e.g. "Plant 1" */
  name: string;
  nickname?: string;
  createdAt: string;
  updatedAt: string;
  status: PlantStatus;
  notes?: string;
  /** Denormalized from latest / typical scans */
  strainGuess?: string;
  plantTypeLabel?: string;
  currentStageLabel?: string;
  currentHealthLabel?: string;
  coverImageUrl?: string;
  latestScanId?: string;
  scanCount: number;
  growLogEntryCount: number;
  linkedScanIds: string[];
  growLogEntryIds: string[];
  /** Optional Grow Group — denormalized name for display when group missing */
  growGroupId?: string;
  growGroupName?: string;
};

export type PlantTimelineItem =
  | {
      kind: "scan";
      id: string;
      at: string;
      title: string;
      subtitle?: string;
      href: string;
    }
  | {
      kind: "log";
      id: string;
      at: string;
      title: string;
      subtitle?: string;
      href: string;
    };

export type PlantSelectionOption = {
  id: string;
  label: string;
  subtitle?: string;
};
