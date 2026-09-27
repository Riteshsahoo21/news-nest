import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import SafeImage from '../common/SafeImage';

export default function EditorsPick({ articles, showSnippet = true, variant = 'grid-2' }) {
  const [searchParams] = useSearchParams();
  const getArticleLink = (article) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('articleId', article.slug || article._id);
    return `?${nextParams.toString()}`;
  };

  if (!articles || articles.length === 0) return null;

  // 1. Variant: grid-2 (Editor's Pick - 2 Column Premium Editorial Spotlight)
  if (variant === 'grid-2') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full min-w-0">
        {articles.slice(0, 2).map((article, index) => {
          const imgUrl = article.imageUrl || article.coverImage || article.thumbnail;
          const readTime = article.readTime || Math.max(3, Math.ceil((article.content?.length || 1000) / 600));

          return (
            <Link 
              key={article._id || index} 
              to={getArticleLink(article)} 
              className="flex flex-col h-full rounded-xl sm:rounded-2xl border border-border/80 hover:border-red-600/50 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group min-w-0 transform hover:-translate-y-0.5 sm:hover:-translate-y-1"
            >
              <div className="relative w-full aspect-[16/9] max-h-[160px] sm:max-h-none bg-muted overflow-hidden shrink-0">
                {article.mediaUrls && article.mediaUrls.length > 1 ? (
                  <div className="w-full h-full flex overflow-hidden">
                    <img 
                      src={article.mediaUrls[0]} 
                      alt={article.title} 
                      className="w-1/2 h-full object-cover pr-[1px] transition-transform duration-700 group-hover:scale-105"
                    />
                    {article.mediaUrls.length > 2 ? (
                      <div className="w-1/2 h-full flex flex-col pl-[1px] overflow-hidden">
                        <img src={article.mediaUrls[1]} className="w-full h-1/2 object-cover pb-[1px] transition-transform duration-700 group-hover:scale-105" />
                        <div className="relative w-full h-1/2 pt-[1px] overflow-hidden">
                          <img src={article.mediaUrls[2]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          {article.mediaUrls.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs pointer-events-none mt-[1px]">
                              +{article.mediaUrls.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={article.mediaUrls[1]} 
                        alt={article.title} 
                        className="w-1/2 h-full object-cover pl-[1px] transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                ) : (
                  <SafeImage 
                    src={imgUrl} 
                    alt={article.title} 
                    category={article.category}
                    subCategory={article.subCategory}
                    country={article.country}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 bg-red-600 text-white text-[9px] sm:text-[10px] font-extrabold font-mono uppercase tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-sm shadow-md">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate">{article.category || "EDITOR'S DESK"}</span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                  {readTime} min read
                </div>
              </div>

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between w-full min-w-0 bg-card">
                <div>
                  <h4 className="font-bold font-serif text-base sm:text-lg md:text-xl lg:text-[22px] leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-foreground line-clamp-2 mb-2 sm:mb-2.5 break-words">
                    {article.title}
                  </h4>
                  {showSnippet && (
                    <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 font-sans leading-relaxed mb-3 sm:mb-4">
                      {(article.subtitle || article.content || 'Comprehensive diplomatic analysis and verified real-time dispatches from global correspondents...').slice(0, 160)}
                    </p>
                  )}
                </div>
                
                <div className="pt-2.5 sm:pt-3 border-t border-border/60 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground font-sans w-full min-w-0 gap-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 truncate min-w-0">
                    <span className="font-semibold text-foreground truncate">By {article.author || article.reporter || 'Senior Editor'}</span>
                    <span className="opacity-40 shrink-0">•</span>
                    <span className="shrink-0 font-mono text-[10px] sm:text-[11px]">{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Today'}</span>
                  </div>
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1 group-hover:underline shrink-0 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                    Read Spotlight <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // 2. Variant: grid-3 or grid-4 (Latest Reports - Newspaper Kiosk Grid)
  const gridColumns = variant === 'grid-4' 
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid ${gridColumns} gap-4 sm:gap-5 lg:gap-6 w-full max-w-full min-w-0`}>
      {articles.map((article, index) => {
        const imgUrl = article.imageUrl || article.coverImage || article.thumbnail;
        const readTime = article.readTime || Math.max(2, Math.ceil((article.content?.length || 800) / 600));

        return (
          <Link 
            key={article._id || index} 
            to={getArticleLink(article)} 
            className="flex flex-col h-full rounded-xl border border-border/80 hover:border-red-600/40 bg-card shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group min-w-0 transform hover:-translate-y-0.5"
          >
            <div className="relative w-full aspect-[16/9] max-h-[145px] sm:max-h-none bg-muted overflow-hidden shrink-0">
              {article.mediaUrls && article.mediaUrls.length > 1 ? (
                <div className="w-full h-full flex overflow-hidden">
                  <img 
                    src={article.mediaUrls[0]} 
                    alt={article.title} 
                    className="w-1/2 h-full object-cover pr-[1px] transition-transform duration-500 group-hover:scale-105"
                  />
                  {article.mediaUrls.length > 2 ? (
                    <div className="w-1/2 h-full flex flex-col pl-[1px] overflow-hidden">
                      <img src={article.mediaUrls[1]} className="w-full h-1/2 object-cover pb-[1px] transition-transform duration-500 group-hover:scale-105" />
                      <div className="relative w-full h-1/2 pt-[1px] overflow-hidden">
                        <img src={article.mediaUrls[2]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {article.mediaUrls.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs pointer-events-none mt-[1px]">
                            +{article.mediaUrls.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={article.mediaUrls[1]} 
                      alt={article.title} 
                      className="w-1/2 h-full object-cover pl-[1px] transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
              ) : (
                <SafeImage 
                  src={imgUrl} 
                  alt={article.title} 
                  category={article.category}
                  subCategory={article.subCategory}
                  country={article.country}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-extrabold font-mono uppercase tracking-widest px-2 py-0.5 rounded shadow-xs">
                {article.category || 'REPORTS'}
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded sm:hidden">
                {readTime}m read
              </div>
            </div>

            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between w-full min-w-0 bg-card">
              <div>
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mb-1.5 text-[10px] sm:text-[11px] font-mono text-muted-foreground truncate">
                  <Clock className="w-3 h-3 text-red-600 shrink-0" />
                  <span>Verified Wire</span>
                  <span className="opacity-40">•</span>
                  <span>{readTime} min read</span>
                </div>
                <h4 className="font-bold font-serif text-sm sm:text-base leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-foreground line-clamp-2 mb-1.5 sm:mb-2 break-words">
                  {article.title}
                </h4>
                {showSnippet && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-2 font-sans leading-relaxed mb-2.5 sm:mb-3">
                    {(article.subtitle || article.content || 'Click to read full dispatch and field report...').slice(0, 140)}
                  </p>
                )}
              </div>
              
              <div className="pt-2 sm:pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-muted-foreground font-sans w-full min-w-0 gap-1">
                <span className="font-semibold text-foreground truncate max-w-[65%]">
                  By {article.author || article.reporter || 'News Bureau'}
                </span>
                <span className="shrink-0 font-mono text-[9px] sm:text-[10px] opacity-80">
                  {article.createdAt ? new Date(article.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
