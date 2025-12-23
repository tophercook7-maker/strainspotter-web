import { redirect } from "next/navigation";

/**
 * Redirect /garden/news to canonical /discover/news
 * News is unified in one location only
 */
export default function NewsPage() {
  redirect("/discover/news");
}
