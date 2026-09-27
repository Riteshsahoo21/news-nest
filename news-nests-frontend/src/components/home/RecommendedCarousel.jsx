import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'react-router-dom';
import { ImageIcon, ChevronLeft, ChevronRight, Bookmark, Sparkles } from 'lucide-react';
import SafeImage from '../common/SafeImage';

export default function RecommendedCarousel({ articles }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    dragFree: false, 
    containScroll: 'trimSnaps', 
    slidesToScroll: 1,
    breakpoints: {
      '(max-width: 639px)': { active: false }
    }
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full max-w-full overflow-hidden min-w-0 bg-background">
      {/* Editorial Header with Navigation Controls */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 border-b border-border/60 pb-2.5 sm:pb-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0"></span>
          <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground flex items-center gap-1.5 sm:gap-2 truncate">
            <span>Recommended For You</span>
            <span className="hidden md:inline-flex items-center text-[10px] font-extrabold font-mono bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded uppercase tracking-wider ml-1 shrink-0">
              <Sparkles className="w-3 h-3 mr-1 inline" /> Personalized Dispatch
            </span>
          </h3>
        </div>
        
        {/* Scroll Navigation Arrows */}
        {articles.length > 1 && (
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={scrollPrev}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground flex items-center justify-center transition-all duration-200 hover:border-red-600 focus:outline-none shadow-xs group"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-red-600 transition-colors" />
            </button>
            <button
              onClick={scrollNext}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground flex items-center justify-center transition-all duration-200 hover:border-red-600 focus:outline-none shadow-xs group"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-red-600 transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* DEDICATED MOBILE VIEW: Compact Full-Width Editorial List (No Half-Seen Cards) */}
      <div className="sm:hidden flex flex-col gap-2.5 w-full max-w-full min-w-0 pt-1">
        {articles.slice(0, 6).map((article, index) => {
          const imgUrl = article.imageUrl || article.coverImage || article.thumbnail;
          const readTime = article.readTime || Math.max(2, Math.ceil((article.content?.length || 800) / 600));

          return (
            <Link 
              key={article._id || index} 
              to={`?articleId=${article.slug || article._id}`} 
              className="flex items-center justify-between gap-3 p-2.5 bg-card rounded-xl border border-border/70 shadow-xs active:bg-muted/40 transition-all w-full min-w-0"
            >
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[9px] font-extrabold font-mono text-red-600 uppercase tracking-wider truncate block mb-0.5">
                  {article.category || 'GLOBAL'} • {article.author || article.reporter || 'News Desk'}
                </span>
                <h4 className="text-xs font-bold font-serif text-foreground line-clamp-2 leading-snug break-words">
                  {article.title}
                </h4>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  {readTime} min read
                </div>
              </div>
              <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0 relative">
                <SafeImage 
                  src={imgUrl} 
                  alt={article.title} 
                  category={article.category}
                  subCategory={article.subCategory}
                  country={article.country}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* DESKTOP VIEW: Compact Journalistic Cards Carousel */}
      <div className="hidden sm:block relative w-full max-w-full overflow-hidden min-w-0" ref={emblaRef}>
        <div className="flex touch-pan-y gap-5 w-full pb-2 pt-1">
          {articles.map((article, index) => {
            const imgUrl = article.imageUrl || article.coverImage || article.thumbnail;
            const readTime = article.readTime || Math.max(2, Math.ceil((article.content?.length || 800) / 600));

            return (
              <div 
                key={article._id || index} 
                className="flex-[0_0_46%] md:flex-[0_0_31%] lg:flex-[0_0_24%] min-w-0"
              >
                <Link 
                  to={`?articleId=${article.slug || article._id}`} 
                  className="flex flex-col h-full rounded-xl overflow-hidden group shadow-xs hover:shadow-md bg-card border border-border/80 hover:border-red-600/40 transition-all duration-300 transform hover:-translate-y-0.5 min-w-0"
                >
                  <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden shrink-0">
                    <SafeImage 
                      src={imgUrl} 
                      alt={article.title} 
                      category={article.category}
                      subCategory={article.subCategory}
                      country={article.country}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-extrabold font-mono uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                      {article.category || 'GLOBAL'}
                    </div>
                  </div>
                  
                  <div className="p-3.5 flex-1 flex flex-col justify-between w-full min-w-0 bg-card">
                    <div>
                      <h4 className="text-sm md:text-base font-bold line-clamp-2 font-serif leading-snug mb-2 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors break-words">
                        {article.title}
                      </h4>
                      {article.subtitle && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 font-sans leading-relaxed mb-3">
                          {article.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-medium text-muted-foreground font-sans w-full min-w-0 gap-1">
                      <span className="font-semibold text-foreground truncate max-w-[65%]">
                        By {article.author || article.reporter || 'News Bureau'}
                      </span>
                      <span className="shrink-0 font-mono opacity-80">
                        {readTime} min read
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
