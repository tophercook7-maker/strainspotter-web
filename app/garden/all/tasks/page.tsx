import { headers } from "next/headers";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Force dynamic rendering by calling headers() at the top level
headers();

export default function GardenTasksPage() {
  return <TasksClient />;
}
