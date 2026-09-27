import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Play, ChevronLeft, ChevronRight, Video, Eye } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export default function FeaturedVideoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    dragFree: false, 
    align: 'start', 
    containScroll: 'trimSnaps', 
    slidesToScroll: 1,
    breakpoints: {
      '(max-width: 639px)': { active: false }
    }
  });
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await api.get('/videos?limit=25');
        const fetched = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setVideos(fetched);
      } catch (err) {
        console.error('Failed to fetch video broadcasts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const onInit = useCallback((embla) => {
    if (!embla) return;
    setScrollSnaps(embla.scrollSnapList());
  }, []);

  const onSelect = useCallback((embla) => {
    if (!embla) return;
    setSelectedIndex(embla.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reinit', onInit);
    emblaApi.on('reinit', onSelect);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('reinit', onInit);
      emblaApi.off('reinit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onInit, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Comprehensive fallback broadcasts if API returns fewer items during setup
  const fallbackVideos = [
    { _id: 'demo-1', title: 'Special Report: Global Economic Summit & Inflation Outlook', category: 'ECONOMY', duration: '05:20', views: 14200, reporter: 'Financial Desk', thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=350&fit=crop' },
    { _id: 'demo-2', title: 'Tech Frontiers: Next-Gen Semiconductor Fabrication and Geopolitics', category: 'TECHNOLOGY', duration: '08:45', views: 28400, reporter: 'Silicon Valley Bureau', thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=350&fit=crop' },
    { _id: 'demo-3', title: 'Geopolitical Shift: Diplomatic Talks resume in European Summit', category: 'DIPLOMACY', duration: '12:10', views: 9800, reporter: 'Geneva Correspondent', thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=350&fit=crop' },
    { _id: 'demo-4', title: 'Clean Energy Breakthroughs: Grid Decarbonization and Battery Tech', category: 'ENERGY', duration: '06:15', views: 19500, reporter: 'Energy Monitor', thumbnailUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=350&fit=crop' },
    { _id: 'demo-5', title: 'Space Odyssey: Commercial Lunar Lander Prepares for Orbital Burn', category: 'SPACE', duration: '09:30', views: 32100, reporter: 'Aerospace Unit', thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop' },
    { _id: 'demo-6', title: 'Healthcare Innovation: Personalized mRNA Cancer Trials Expand', category: 'HEALTH', duration: '07:12', views: 16800, reporter: 'Medical Bureau', thumbnailUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&h=350&fit=crop' },
    { _id: 'demo-7', title: 'Urban Future: High-Speed Transit Networks Redefining Metropolitan Mobility', category: 'INFRA', duration: '11:05', views: 21300, reporter: 'Urban Planning Desk', thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&h=350&fit=crop' },
    { _id: 'demo-8', title: 'Art & Heritage: Restoring Renaissance Frescoes with AI Vision Robotics', category: 'CULTURE', duration: '04:45', views: 11200, reporter: 'Arts Critic', thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&h=350&fit=crop' },
    { _id: 'demo-9', title: 'Financial Markets: Quantitative High-Frequency Algorithms on Wall Street', category: 'MARKETS', duration: '06:50', views: 41000, reporter: 'Market Watch', thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=350&fit=crop' }
  ];

  const displayVideos = videos.length >= 4 ? videos : [...videos, ...fallbackVideos];

  return (
    <div className="w-full max-w-full overflow-hidden min-w-0 bg-background relative">
      {/* Clean Editorial Header */}
      <div className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3 mb-4 border-b border-border/60 pb-2.5 sm:pb-3">
        <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0"></span>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground truncate">
            Featured Video Broadcasts
          </h3>
          <span className="inline-flex items-center text-[9px] sm:text-[10px] font-extrabold font-mono bg-red-600/10 text-red-600 px-2 sm:px-2.5 py-0.5 rounded-sm uppercase tracking-wider border border-red-600/20 shrink-0">
            <Video className="w-3 h-3 mr-1 inline animate-pulse text-red-600" /> Studio HD
          </span>
        </div>
      </div>

      {/* DEDICATED MOBILE VIEW: Full-Width Hero + Compact Playlist (No Half-Seen Cards) */}
      <div className="sm:hidden flex flex-col gap-3.5 w-full max-w-full min-w-0 pt-1">
        {/* Top Hero Video Card */}
        {displayVideos[0] && (
          <Link 
            to={`/videos?videoId=${displayVideos[0]._id}`} 
            className="flex flex-col w-full rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden min-w-0 active:scale-[0.99] transition-transform"
          >
            <div className="relative w-full aspect-[16/9] max-h-[190px] bg-black overflow-hidden shrink-0">
              <img 
                src={displayVideos[0].thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=350&fit=crop'} 
                alt={displayVideos[0].title} 
                className="w-full h-full object-cover opacity-95"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=350&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg pl-0.5">
                  <Play className="w-5 h-5 fill-current" />
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-extrabold font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs shadow-xs">
                {displayVideos[0].category || 'NEWS DESK'}
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-xs text-white text-[10px] font-bold font-mono">
                {displayVideos[0].duration || '04:15'}
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between w-full min-w-0 bg-card">
              <h4 className="font-bold font-serif text-sm leading-snug text-foreground line-clamp-2 mb-2 break-words">
                {displayVideos[0].title}
              </h4>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-sans w-full min-w-0">
                <span className="font-semibold text-foreground truncate max-w-[60%]">
                  {displayVideos[0].reporter || 'Studio Broadcast'}
                </span>
                <div className="flex items-center gap-1 font-mono shrink-0">
                  <Eye className="w-3 h-3 text-red-600 shrink-0" /> {displayVideos[0].views ? (displayVideos[0].views >= 1000 ? `${(displayVideos[0].views / 1000).toFixed(1)}K` : displayVideos[0].views) : '12.4K'}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Compact Playlist Rows (Items 1-4) */}
        <div className="flex flex-col gap-2.5 w-full min-w-0">
          {displayVideos.slice(1, 5).map((video, idx) => {
            const viewsText = video.views ? (video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views) : `${((idx + 1) * 3) + 8.5}K`;
            return (
              <Link 
                key={video._id || idx} 
                to={`/videos?videoId=${video._id}`}
                className="flex items-center gap-3 p-2.5 bg-card rounded-xl border border-border/70 shadow-xs active:bg-muted/40 transition-all w-full min-w-0"
              >
                <div className="w-28 h-16 rounded-lg bg-black overflow-hidden shrink-0 relative flex items-center justify-center">
                  <img 
                    src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=350&fit=crop'} 
                    alt={video.title} 
                    className="w-full h-full object-cover opacity-90"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=350&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center pl-0.5 shadow">
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono text-white px-1 rounded">
                    {video.duration || '03:45'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[9px] font-extrabold font-mono text-red-600 uppercase tracking-wider truncate block mb-0.5">
                    {video.category || 'BROADCAST'} • {video.reporter || 'Desk'}
                  </span>
                  <h5 className="text-xs font-bold font-serif text-foreground line-clamp-2 leading-snug break-words">
                    {video.title}
                  </h5>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-1">
                    <Eye className="w-2.5 h-2.5 text-red-600 shrink-0" /> {viewsText}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* DESKTOP VIEW: Multi-Column Carousel Container */}
      <div className="hidden sm:block relative w-full max-w-full overflow-hidden min-w-0 px-1 pt-1 pb-2 group/carousel">
        
        {/* Transparent Compact Left Side Arrow */}
        <button
          onClick={scrollPrev}
          className="flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-16 bg-black/30 hover:bg-red-600/90 text-white border border-white/30 hover:border-red-500 shadow-lg backdrop-blur-sm transition-all duration-200 items-center justify-center rounded-r-lg opacity-80 hover:opacity-100 focus:outline-none"
          aria-label="Previous stream"
        >
          <ChevronLeft className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Transparent Compact Right Side Arrow */}
        <button
          onClick={scrollNext}
          className="flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-16 bg-black/30 hover:bg-red-600/90 text-white border border-white/30 hover:border-red-500 shadow-lg backdrop-blur-sm transition-all duration-200 items-center justify-center rounded-l-lg opacity-80 hover:opacity-100 focus:outline-none"
          aria-label="Next stream"
        >
          <ChevronRight className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Scrolling Track */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y gap-5 w-full">
            {displayVideos.map((video, idx) => {
              const viewsText = video.views ? (video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views) : `${(idx * 3) + 8.5}K`;
              
              return (
                <div 
                  key={video._id || idx} 
                  className="flex-[0_0_47%] lg:flex-[0_0_23.6%] xl:flex-[0_0_23.6%] min-w-0 shrink-0"
                >
                  <Link 
                    to={`/videos?videoId=${video._id}`} 
                    className="flex flex-col h-full rounded-xl border border-border/80 hover:border-red-600/50 bg-card shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group/card min-w-0 transform hover:-translate-y-1"
                  >
                    <div className="relative w-full aspect-video bg-black overflow-hidden shrink-0">
                      <img 
                        src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=350&fit=crop'} 
                        alt={video.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105 opacity-95"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=350&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover/card:opacity-90 transition-opacity" />
                      
                      {/* Compact Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg pl-0.5 transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-red-600">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                      </div>

                      <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-extrabold font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs shadow-xs">
                        {video.category || 'NEWS DESK'}
                      </div>

                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-xs text-white text-[10px] font-bold font-mono">
                        {video.duration || '04:15'}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between w-full min-w-0 bg-card">
                      <div>
                        <h4 className="font-bold font-serif text-sm md:text-base leading-snug group-hover/card:text-red-600 dark:group-hover/card:text-red-400 transition-colors text-foreground line-clamp-2 mb-2 break-words">
                          {video.title}
                        </h4>
                      </div>
                      
                      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-sans w-full min-w-0">
                        <span className="font-semibold text-foreground truncate max-w-[60%]">
                          {video.reporter || 'Studio Broadcast'}
                        </span>
                        <div className="flex items-center gap-1 font-mono shrink-0">
                          <Eye className="w-3 h-3 text-red-600 shrink-0" /> {viewsText}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Pagination Dots (. . . .) with Active Pill */}
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap px-4">
          {scrollSnaps.map((_, index) => {
            const isActive = index === selectedIndex;
            return (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                aria-label={`Go to slide group ${index + 1}`}
                className={`transition-all duration-300 rounded-full focus:outline-none ${
                  isActive
                    ? 'w-8 h-2.5 bg-red-600 shadow-sm'
                    : 'w-2.5 h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
