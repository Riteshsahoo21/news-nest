import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export default function FeaturedVideoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Fetch up to 5 videos for the featured section
        const res = await api.get('/videos?limit=5');
        // Handle both possible structures (data.data or just data)
        const fetched = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setVideos(fetched);
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      }
    };
    fetchVideos();
  }, []);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!videos || videos.length === 0) {
    // If no videos, just show some dummies so the section doesn't collapse if DB is empty
    return (
      <div className="relative w-full overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y gap-4 md:gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_48%] xl:flex-[0_0_47%] min-w-0">
              <div className="block relative w-full aspect-[16/9] rounded-2xl overflow-hidden group shadow-sm bg-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                     <Play className="w-5 h-5 md:w-7 md:h-7 text-red-600 ml-1 fill-red-600" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden group py-2 min-w-0" ref={emblaRef}>
      <div className="flex touch-pan-y gap-4 md:gap-6 w-full">
        {videos.map((video) => (
          <div key={video._id} className="flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_48%] xl:flex-[0_0_47%] min-w-0">
            <Link to={`/videos`} className="block relative w-full max-w-full aspect-[16/9] rounded-2xl overflow-hidden group/link shadow-md bg-muted border border-border">
              {video.thumbnailUrl && (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-105 opacity-90"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/95 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover/link:scale-110 group-hover/link:bg-white">
                   <Play className="w-5 h-5 md:w-7 md:h-7 text-red-600 ml-1 fill-red-600" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 md:p-5 min-w-0 overflow-hidden">
                <p className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold line-clamp-2 drop-shadow-md leading-snug">{video.title}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {videos.length > 3 && (
        <>
          <button 
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 text-black shadow-md border border-gray-200 transition-all opacity-0 group-hover:opacity-100 z-10 focus:outline-none"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 text-black shadow-md border border-gray-200 transition-all opacity-0 group-hover:opacity-100 z-10 focus:outline-none"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
