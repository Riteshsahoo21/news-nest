import React from 'react';
import { Link } from 'react-router-dom';

export default function TrendingStories({ articles }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border w-full max-w-full min-w-0 overflow-hidden">
      <div className="mb-6">
        <h3 className="text-xl sm:text-2xl font-bold font-serif text-foreground border-l-2 border-primary pl-4 leading-none truncate">
          Trending Stories
        </h3>
      </div>
      
      <div className="space-y-6 w-full min-w-0">
        {articles.map((article, index) => (
          <Link 
            key={article._id} 
            to={`?articleId=${article.slug || article._id}`}
            className="flex items-start gap-3 sm:gap-5 group w-full max-w-full overflow-hidden min-w-0"
          >
            <div className="text-4xl sm:text-5xl font-black text-gray-200 dark:text-gray-800 font-sans leading-[0.75] mt-1 shrink-0 select-none">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 font-sans truncate">
                {article.category || 'News'}
              </div>
              <h4 className="font-bold font-serif text-sm sm:text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3 min-w-0">
                {article.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
