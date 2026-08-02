import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';

export default function RecommendedCarousel({ articles }) {
  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full max-w-full overflow-hidden min-w-0">
      <div className="flex items-center space-x-3 mb-5 border-b border-border/60 pb-3">
        <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">Recommended For You</h3>
      </div>
      <div className="relative w-full max-w-full overflow-hidden min-w-0" ref={emblaRef}>
        <div className="flex touch-pan-y gap-5 w-full pb-2">
          {articles.map((article) => (
            <div key={article._id} className="flex-[0_0_85%] sm:flex-[0_0_55%] md:flex-[0_0_45%] lg:flex-[0_0_32%] min-w-0">
              <Link 
                to={`?articleId=${article.slug || article._id}`} 
                className="flex flex-col h-full rounded-2xl overflow-hidden group shadow-sm hover:shadow-md bg-card border border-border/60 hover:border-red-500/30 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden">
                  {article.imageUrl || article.coverImage ? (
                    <img 
                      src={article.imageUrl || article.coverImage} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-sm">
                    {article.category || 'News'}
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between w-full min-w-0">
                  <div>
                    <h4 className="text-base font-bold line-clamp-2 font-serif leading-snug mb-3 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {article.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center pt-2 border-t border-border/40 w-full min-w-0">
                    <span className="font-semibold text-foreground truncate">By {article.author || 'News Desk'}</span>
                    <span className="mx-1.5 opacity-40">•</span>
                    <span className="shrink-0">{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Today'}</span>
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
