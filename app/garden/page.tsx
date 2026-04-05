import { redirect } from "next/navigation";

// Scanner-first experience: landing page IS the scanner
export default function GardenPage() {
  redirect("/garden/scanner");
}
