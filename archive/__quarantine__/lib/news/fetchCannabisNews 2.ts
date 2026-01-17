export interface CannabisNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
}

/**
 * Fetch latest cannabis news articles
 * Aggregates from multiple RSS sources, merges, sorts, and de-duplicates
 * Cached for 15 minutes server-side
 */
export async function fetchCannabisNews(): Promise<CannabisNewsArticle[]> {
  try {
    // Multiple RSS sources (minimum 3)
    const sources = [
      {
        name: "Marijuana Moment",
        url: "https://www.marijuanamoment.net/feed/",
      },
      {
        name: "Leafly",
        url: "https://www.leafly.com/news/rss.xml",
      },
      {
        name: "High Times",
        url: "https://hightimes.com/feed/",
      },
      {
        name: "Cannabis Business Times",
        url: "https://www.cannabisbusinesstimes.com/feed/",
      },
    ];

    const allArticles: CannabisNewsArticle[] = [];

    // Fetch from ALL sources (not just first successful)
    const fetchPromises = sources.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          next: { revalidate: 900 }, // Cache for 15 minutes
          headers: {
            'User-Agent': 'StrainSpotter/1.0',
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch from ${source.name}: ${response.status}`);
          return [];
        }

        const xml = await response.text();
        const parsed = parseRSSFeed(xml, source.name);
        return parsed;
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
      }
    });

    // Wait for all sources to complete
    const results = await Promise.all(fetchPromises);
    
    // Merge all articles from all sources
    for (const sourceArticles of results) {
      allArticles.push(...sourceArticles);
    }

    // If no articles from RSS, use fallback
    if (allArticles.length === 0) {
      return getFallbackNews();
    }

    // De-duplicate by normalized title + URL
    const seen = new Set<string>();
    const uniqueArticles: CannabisNewsArticle[] = [];

    for (const article of allArticles) {
      // Normalize: lowercase title + URL for comparison
      const normalizedTitle = article.title.toLowerCase().trim();
      const normalizedUrl = article.url.toLowerCase().trim();
      const key = `${normalizedTitle}|${normalizedUrl}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueArticles.push(article);
      }
    }

    // Sort by published date (newest first)
    uniqueArticles.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA; // Descending (newest first)
    });

    // Return top articles (limit to reasonable number)
    return uniqueArticles.slice(0, 20);
  } catch (error) {
    console.error('Error fetching cannabis news:', error);
    return getFallbackNews();
  }
}

/**
 * Simple RSS parser (basic implementation)
 */
function parseRSSFeed(xml: string, sourceName: string): CannabisNewsArticle[] {
  const articles: CannabisNewsArticle[] = [];
  
  try {
    // Extract items using regex (simple approach)
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    
    for (const match of Array.from(itemMatches).slice(0, 10)) { // Get more items per source
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      
      if (titleMatch && linkMatch) {
        const title = (titleMatch[1] || titleMatch[2] || '').trim();
        const url = linkMatch[1].trim();
        const description = (descMatch?.[1] || descMatch?.[2] || '').trim();
        const pubDate = pubDateMatch?.[1] || new Date().toISOString();
        
        // Clean HTML from description
        const summary = description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        
        // Only add summary if it exists and is meaningful
        const cleanSummary = summary && summary.length > 20 
          ? (summary.substring(0, 150) + (summary.length > 150 ? '...' : ''))
          : '';
        
        articles.push({
          id: `news-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${articles.length}`,
          title: title.substring(0, 100), // Allow longer titles
          summary: cleanSummary,
          source: sourceName,
          url,
          published_at: pubDate,
        });
      }
    }
  } catch (error) {
    console.error('Error parsing RSS:', error);
  }
  
  return articles;
}

/**
 * Fallback static news data
 */
function getFallbackNews(): CannabisNewsArticle[] {
  return [
    {
      id: "news-1",
      title: "DEA Reschedules Cannabis: What It Means for Growers",
      summary: "Federal rescheduling opens new opportunities for commercial cultivation and research partnerships.",
      source: "Cannabis Industry News",
      url: "https://www.marijuanamoment.net",
      published_at: new Date().toISOString(),
    },
    {
      id: "news-2",
      title: "New Terpene Research Shows Improved Yield Methods",
      summary: "Latest studies reveal how specific terpene profiles can enhance plant growth and potency.",
      source: "Cannabis Research",
      url: "https://www.leafly.com/news",
      published_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "news-3",
      title: "State-by-State Cannabis Law Updates",
      summary: "Comprehensive guide to recent regulatory changes affecting growers across the US.",
      source: "Legal Updates",
      url: "https://www.marijuanamoment.net",
      published_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}
