import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ImageIcon, TrendingUp } from 'lucide-react';
import SafeImage from '../common/SafeImage';

export default function TrendingStories({ articles }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border/80 w-full max-w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60 mb-4 sm:mb-5">
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0"></span>
          <h3 className="text-base sm:text-xl font-black font-serif uppercase tracking-tight text-foreground">
            Trending Dispatch
          </h3>
        </div>
        <TrendingUp className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
      </div>
      
      <div className="divide-y divide-border/60 w-full min-w-0">
        {articles.map((article, index) => {
          const imgUrl = article.imageUrl || article.coverImage || article.thumbnail;
          const author = article.author || article.reporter || 'News Bureau';
          const views = article.views > 0 ? (article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}k` : article.views) : `${(index * 3) + 4}.2k`;

          return (
            <Link 
              key={article._id || index} 
              to={`?articleId=${article.slug || article._id}`}
              className="flex items-start gap-2.5 sm:gap-4 py-3.5 sm:py-4 first:pt-0 last:pb-0 group w-full max-w-full overflow-hidden min-w-0 hover:bg-muted/30 transition-colors rounded-lg p-1"
            >
              {/* Ranking Number */}
              <div className="text-xl sm:text-2xl font-black font-serif text-red-600/90 dark:text-red-500/90 shrink-0 w-6 sm:w-7 text-center select-none pt-0.5 font-mono">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* Headline & Metadata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden pr-1">
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-red-600 dark:text-red-500 uppercase tracking-widest font-mono truncate">
                      {article.category || 'WORLD'}
                    </span>
                    <span className="text-muted-foreground/40 text-[9px] sm:text-[10px]">•</span>
                    <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground truncate">{views} views</span>
                  </div>
                  <h4 className="font-bold font-serif text-xs sm:text-sm leading-snug text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2 sm:line-clamp-3 min-w-0 break-words">
                    {article.title}
                  </h4>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium font-sans mt-1.5 sm:mt-2 truncate">
                  By {author}
                </p>
              </div>

              {/* Thumbnail Image */}
              <div className="shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted relative border border-border/50 shadow-xs">
                <SafeImage 
                  src={imgUrl} 
                  alt={article.title} 
                  category={article.category}
                  subCategory={article.subCategory}
                  country={article.country}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
