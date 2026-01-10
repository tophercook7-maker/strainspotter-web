export type DiagnosticResult = {
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
};

export async function generateGrowReport(): Promise<DiagnosticResult[]> {
  // TEMPORARY STUB — build-safe
  // Supabase server integration will be added later

  return [
    {
      title: "Environment Stable",
      summary: "No critical issues detected in current grow setup.",
      severity: "low",
      recommendation: "Continue current watering and lighting schedule."
    }
  ];
}
