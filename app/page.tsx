import { redirect } from "next/navigation";

// Scanner-first: landing page goes straight to scanner
export default function Home() {
  redirect("/garden/scanner");
}
