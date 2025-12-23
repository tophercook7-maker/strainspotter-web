import Link from "next/link";
import { CannabisNewsArticle } from "@/lib/news/fetchCannabisNews";

async function getNews(): Promise<CannabisNewsArticle[]> {
  try {
    // Always use relative URL - works on both vercel.app and custom domain
    const url = '/api/news/cannabis';
    
    // Add timeout for server-side fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        next: { revalidate: 900 }, // Cache for 15 minutes
        signal: controller.signal,
        cache: 'no-store', // Ensure fresh fetch on both domains
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.articles || [];
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn('News fetch timeout');
        return [];
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    // Fail gracefully - return empty array
    return [];
  }
}

export default async function NewsPage() {
  const articles = await getNews();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <Link href="/discover" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
        ← Back to Discover
      </Link>

      <h1 className="text-3xl font-bold mb-2">Cannabis News</h1>
      <p className="opacity-85 mb-6">
        Latest updates from the cannabis industry, aggregated from multiple sources.
      </p>

      {articles.length === 0 ? (
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-700">
          <p className="text-sm text-neutral-300 mb-3">
            News updates are temporarily unavailable.
          </p>
          <p className="text-xs text-neutral-400 mb-4">
            We're working to restore the news feed. Please check back later.
          </p>
          <Link
            href="/discover"
            className="inline-block px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
          >
            Back to Discover
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wide">
                    {article.source}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-neutral-300 mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                  {article.published_at && (
                    <div className="text-xs text-neutral-500">
                      {new Date(article.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
