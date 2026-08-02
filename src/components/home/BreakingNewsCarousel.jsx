import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { ImageIcon, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BreakingNewsCarousel({ articles }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.internalEngine().index.get());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!articles || articles.length === 0) return null;

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-2xl border border-border/60 shadow-md group min-w-0 bg-card" ref={emblaRef}>
      <div className="flex touch-pan-y w-full">
        {articles.map((article, index) => (
          <div key={article._id || index} className="flex-[0_0_100%] min-w-0 w-full max-w-full overflow-hidden">
            <Link to={`?articleId=${article.slug || article._id}`} className="block relative w-full max-w-full aspect-[16/9] md:aspect-[16/9] overflow-hidden group/link bg-black">
              {/* Image */}
              {article.imageUrl || article.coverImage ? (
                <img 
                  src={article.imageUrl || article.coverImage} 
                  alt={article.title} 
                  className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-700 group-hover/link:scale-105"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
              
              {/* Content */}
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8 md:bottom-10 md:left-10 md:right-20 text-white min-w-0 overflow-hidden z-10">
                {/* Category Badge */}
                <div className="inline-flex items-center bg-red-600 text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider px-3 py-1 mb-3 rounded-sm shadow-md font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>
                  {article.category || 'BREAKING NEWS'}
                </div>
                
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-serif leading-tight mb-3 line-clamp-2 drop-shadow-md group-hover/link:text-red-300 transition-colors">
                  {article.title}
                </h2>
                
                <p className="text-xs sm:text-sm md:text-base text-gray-200 mb-4 line-clamp-2 font-sans font-normal leading-relaxed drop-shadow max-w-3xl">
                  {(article.subtitle || article.content || 'Global markets react as new diplomatic and institutional reports emerge across world desks.').slice(0, 160)}
                </p>
                
                <div className="flex items-center space-x-4 text-xs font-medium text-gray-300 font-sans">
                  <div className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    <span>Live Coverage</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    <span>By {article.author || 'News Desk'}</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {articles.length > 1 && (
        <>
          <button 
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-600 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20 focus:outline-none shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-600 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20 focus:outline-none shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {articles.length > 1 && (
        <div className="absolute bottom-5 right-5 md:bottom-10 md:right-10 flex space-x-2 z-20">
          {articles.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex ? 'w-6 bg-red-600 shadow-md' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
