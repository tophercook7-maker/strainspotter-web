// lib/news/feeds.ts — cannabis news aggregation (free, RSS).
//
// Pulls from the major cannabis outlets, normalizes, topic-tags by keyword,
// and lets surfaces request the slice that fits their context: policy on the
// garden home, business in B2B, cultivation in Grow. Server-side only; the
// /api/news route caches results.

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO
  topics: string[];
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.marijuanamoment.net/feed/", source: "Marijuana Moment" },
  { url: "https://www.ganjapreneur.com/feed/", source: "Ganjapreneur" },
  { url: "https://mjbizdaily.com/feed/", source: "MJBizDaily" },
  { url: "https://hightimes.com/feed/", source: "High Times" },
];

const TOPIC_KEYWORDS: Record<string, RegExp> = {
  policy: /\b(bill|law|legal|legaliz|congress|senate|governor|dea|fda|schedule|regulat|ballot|vote)\b/i,
  business: /\b(market|sales|revenue|dispensar|retail|brand|industry|invest|acqui|ipo|earnings|license)\b/i,
  growing: /\b(grow|cultivat|harvest|greenhouse|indoor|outdoor|seed|clone|yield|nutrient|craft)\b/i,
  science: /\b(study|research|terpene|cannabinoid|thc|cbd|clinical|scientist)\b/i,
  arkansas: /\barkansas\b/i,
};

function tag(text: string): string[] {
  const topics = Object.entries(TOPIC_KEYWORDS)
    .filter(([, re]) => re.test(text))
    .map(([t]) => t);
  return topics.length ? topics : ["general"];
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#8217;|&rsquo;/g, "'").replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–").replace(/&#038;/g, "&").replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Minimal RSS item parse — titles/links/dates only, no dependency needed. */
function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/).slice(1);
  for (const block of blocks.slice(0, 15)) {
    const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    if (!title || !link.startsWith("http")) continue;
    const publishedAt = new Date(pub || Date.now()).toISOString();
    items.push({ title, link, source, publishedAt, topics: tag(title) });
  }
  return items;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "StrainSpotter/1.0 (+https://strainspotter.app)" },
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 1800 }, // 30 min
      });
      if (!res.ok) return [];
      return parseRss(await res.text(), source);
    })
  );
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  // newest first, dedupe by link
  const seen = new Set<string>();
  return all
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
