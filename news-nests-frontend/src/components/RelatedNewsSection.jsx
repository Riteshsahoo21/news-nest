import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowUpRight, History, Newspaper, Sparkles } from 'lucide-react';
import SafeImage from './common/SafeImage';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Recently';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function RelatedNewsSection({
  articles = [],
  variant = 'grid', // 'grid' | 'sidebar' | 'modal'
  title = 'Past News & Related Coverage',
  onSelectArticle = null,
  className = ''
}) {
  if (!Array.isArray(articles) || articles.length === 0) return null;

  const validArticles = articles.filter(Boolean);
  if (validArticles.length === 0) return null;

  // Sidebar Layout (Compact vertical list)
  if (variant === 'sidebar') {
    return (
      <div className={`p-4 bg-card rounded-2xl border border-border shadow-sm space-y-4 ${className}`}>
        <div className="flex items-center gap-2 pb-3 border-b border-border/70">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <div className="space-y-3">
          {validArticles.map((item, idx) => {
            const articleUrl = `/article/${item.slug || item._id}`;
            const rawImg = item.imageUrl || item.mainImageUrl || item.image;
            const img = (rawImg && !rawImg.includes('unsplash.com')) ? rawImg : null;
            return (
              <Link
                key={item._id || idx}
                to={articleUrl}
                className="group flex gap-3 p-2 rounded-xl hover:bg-muted/60 transition-all border border-transparent hover:border-border/50"
              >
                {img ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted relative">
                    <SafeImage
                      src={img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg shrink-0 bg-primary/10 flex items-center justify-center text-primary">
                    <Newspaper className="w-6 h-6 opacity-60" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <span className="font-bold uppercase text-primary/80">{item.category || 'News'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.publishedAt || item.createdAt)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Modal Layout (Clean list with optional callback)
  if (variant === 'modal') {
    return (
      <div className={`mt-8 pt-6 border-t border-border/60 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-5 bg-red-600 rounded-full inline-block"></span>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              {title}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                Timeline Archive
              </span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {validArticles.map((item, idx) => {
            const articleUrl = `/article/${item.slug || item._id}`;
            const rawImg = item.imageUrl || item.mainImageUrl || item.image;
            const img = (rawImg && !rawImg.includes('unsplash.com')) ? rawImg : null;
            const handleClick = (e) => {
              if (onSelectArticle) {
                e.preventDefault();
                onSelectArticle(item.slug || item._id);
              }
            };

            return (
              <a
                key={item._id || idx}
                href={articleUrl}
                onClick={handleClick}
                className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-red-500/40 hover:bg-muted/40 transition-all cursor-pointer"
              >
                {img ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                    <SafeImage
                      src={img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg shrink-0 bg-red-500/10 flex items-center justify-center text-red-600">
                    <History className="w-6 h-6 opacity-70" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <span className="font-bold uppercase tracking-wider text-red-600">
                        {item.category || 'Archive'}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(item.publishedAt || item.createdAt)}</span>
                    </div>
                    <h4 className="font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-red-600 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-muted-foreground group-hover:text-red-600 pt-1">
                    <span>Read companion report</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid Layout (Full-width responsive cards below article)
  return (
    <section className={`my-10 pt-8 border-t border-border ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-red-600" />
            <span className="text-xs font-black uppercase tracking-widest text-red-600">
              Continuity & Historical Context
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-foreground">{title}</h3>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Semantic Companion Reports</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {validArticles.map((item, idx) => {
          const articleUrl = `/article/${item.slug || item._id}`;
          const rawImg = item.imageUrl || item.mainImageUrl || item.image;
          const img = (rawImg && !rawImg.includes('unsplash.com')) ? rawImg : null;
          const snippet = item.subtitle || item.summary;

          return (
            <Link
              key={item._id || idx}
              to={articleUrl}
              className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-red-500/40 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                {img ? (
                  <SafeImage
                    src={img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Newspaper className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {item.category || 'Past News'}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimeAgo(item.publishedAt || item.createdAt)}</span>
                  </div>
                  <h4 className="font-bold text-base leading-snug line-clamp-2 text-foreground group-hover:text-red-600 transition-colors mb-2">
                    {item.title}
                  </h4>
                  {snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Explore Past Story</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
