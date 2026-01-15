export type Feature =
  | "scanner"
  | "doctor_scans"
  | "analytics"
  | "lab_data"
  | "business_tools";

export function canUseFeature(_feature: Feature): boolean {
  return true;
}
