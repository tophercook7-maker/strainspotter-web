import Link from "next/link";
import { CannabisNewsArticle } from "@/lib/news/fetchCannabisNews";

interface NewsSectionProps {
  articles: CannabisNewsArticle[];
}

export default function NewsSection({ articles }: NewsSectionProps) {
  // Show fallback message if no articles
  if (articles.length === 0) {
    return (
      <section className="space-y-4">
        <div className="px-1">
          <h2 className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-wider">
            NEWS
          </h2>
          <p className="text-xs text-white/60 mt-1">
            Latest cannabis industry updates
          </p>
        </div>
        <div className="text-sm text-white/60 px-1">
          No news available right now
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-wider">
          NEWS
        </h2>
        <p className="text-xs text-white/60 mt-1">
          Latest cannabis industry updates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
        {articles.slice(0, 5).map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              rounded-xl
              backdrop-blur-md
              bg-white/8
              border border-white/10
              p-4
              min-h-[80px]
              hover:bg-white/12
              hover:border-white/15
              active:bg-white/10
              transition-all
              flex flex-col justify-center
            "
          >
            <div className="text-xs font-medium text-white/70 mb-1.5 uppercase tracking-wide">
              {article.source}
            </div>
            <div className="text-base font-medium text-white line-clamp-2">
              {article.title}
            </div>
            <div className="text-sm text-white/70 mt-1.5 line-clamp-2">
              {article.summary}
            </div>
            {article.published_at && (
              <div className="text-xs text-white/50 mt-2">
                {new Date(article.published_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
