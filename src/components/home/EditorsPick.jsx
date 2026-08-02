import { Link } from 'react-router-dom';
import { ImageIcon, Bookmark, Share2, ArrowRight } from 'lucide-react';

export default function EditorsPick({ articles, showSnippet }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="space-y-5 max-w-full min-w-0">
      {articles.map((article) => (
        <Link 
          key={article._id} 
          to={`?articleId=${article.slug || article._id}`} 
          className="flex flex-col sm:flex-row p-4 md:p-5 gap-5 sm:gap-6 border border-border/60 hover:border-red-500/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-card group max-w-full min-w-0"
        >
          {/* Image on left */}
          <div className="shrink-0 w-full sm:w-48 sm:h-40 md:w-64 md:h-44 aspect-[16/10] sm:aspect-auto bg-muted rounded-xl overflow-hidden relative shadow-sm">
            {article.imageUrl || article.coverImage ? (
              <img 
                src={article.imageUrl || article.coverImage} 
                alt={article.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute top-2.5 left-2.5 sm:hidden bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {article.category || 'News'}
            </div>
          </div>

          {/* Content on right */}
          <div className="flex flex-col flex-grow justify-between py-0.5 min-w-0 overflow-hidden">
            <div>
              <div className="hidden sm:flex items-center space-x-2 mb-1.5">
                <span className="text-xs font-extrabold text-red-600 dark:text-red-500 uppercase tracking-wider font-mono">
                  {article.category || 'News'}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-xs font-medium text-muted-foreground">Verified Report</span>
              </div>
              
              <h4 className="font-bold font-serif text-lg md:text-xl xl:text-[22px] leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-foreground line-clamp-2">
                {article.title}
              </h4>
              
              {showSnippet && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-sans">
                  {(article.subtitle || article.content || 'Click to read the full investigation and live coverage from our global newsroom correspondents...').slice(0, 170)}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 gap-2 min-w-0">
              <p className="text-xs text-muted-foreground font-medium font-sans flex items-center flex-wrap min-w-0">
                <span className="font-semibold text-foreground truncate">By {article.author || 'Editorial Desk'}</span>
                <span className="mx-2 opacity-40">•</span>
                <span className="shrink-0">{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Today'}</span>
                <span className="mx-2 opacity-40">•</span>
                <span className="shrink-0">{article.readTime || Math.ceil(Math.random() * 4) + 2} min read</span>
              </p>
              
              <div className="flex items-center space-x-3 text-muted-foreground shrink-0">
                <span className="hidden md:inline-flex items-center text-xs font-bold text-red-600 dark:text-red-500 group-hover:underline">
                  Read Article <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
