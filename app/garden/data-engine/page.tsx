import { notFound } from "next/navigation";
import DataEngineDashboardClient from "./DataEngineDashboardClient";

export default function DataEnginePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DataEngineDashboardClient />;
}
