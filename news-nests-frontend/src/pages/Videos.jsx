import React, { useState, useEffect } from 'react';
import { PlaySquare, Play, Heart, Download, Menu, ChevronRight, ChevronLeft, Video, Flame, Sparkles, Bookmark, Share2, Check } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdSlot from '../components/ads/AdSlot';

export const formatViews = (views) => {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M Views';
  if (views >= 1000) return (views / 1000).toFixed(0) + 'K Views';
  return views + ' Views';
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return `${Math.max(1, mins)} mins ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const HorizontalScrollRow = ({ children }) => {
  const scrollRef = React.useRef(null);
  const [scrollProps, setScrollProps] = React.useState({ progress: 0, thumbWidth: 100 });

  const updateScroll = React.useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    const thumbWidth = maxScroll > 0 ? (clientWidth / scrollWidth) * 100 : 100;
    setScrollProps({ progress, thumbWidth });
  }, []);

  React.useEffect(() => {
    updateScroll();
    window.addEventListener('resize', updateScroll);
    return () => window.removeEventListener('resize', updateScroll);
  }, [updateScroll, children]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth / 1.5 : clientWidth / 1.5;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const showArrows = scrollProps.thumbWidth < 100;

  return (
    <div className="relative group flex flex-col w-full">
      <div className="relative w-full">
        {showArrows && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 hover:bg-background shadow-lg border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 backdrop-blur-sm"
            disabled={scrollProps.progress === 0}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div 
          ref={scrollRef}
          onScroll={updateScroll}
          className="flex overflow-x-auto hide-scrollbar space-x-5 pb-2 w-full max-w-full snap-x scroll-smooth"
        >
          {children}
        </div>

        {showArrows && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 hover:bg-background shadow-lg border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 backdrop-blur-sm"
            disabled={scrollProps.progress === 1}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {showArrows && (
        <div className="w-full h-1.5 bg-muted rounded-full mt-4 overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 bg-red-600 rounded-full transition-all duration-150 ease-out"
            style={{ 
              width: `${scrollProps.thumbWidth}%`,
              left: `${scrollProps.progress * (100 - scrollProps.thumbWidth)}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

const CATEGORIES = [
  'Trending', 'Latest', 'World', 'Politics', 'Business', 
  'Technology', 'Science', 'Health', 'Sports', 'Entertainment', 'Lifestyle'
];

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [savedVideos, setSavedVideos] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        let url = '/videos';
        if (activeCategory !== 'Latest' && activeCategory !== 'Trending') {
           url += `?category=${activeCategory}`;
        }
        const res = await api.get(url);
        setVideos(res.data);
      } catch (err) {
        console.error('Failed to fetch videos', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [activeCategory]);

  const filteredVideos = videos;
  const featuredVideo = videos.find(v => v.isFeatured) || (videos.length > 0 ? videos[0] : null);
  const regularVideos = filteredVideos.filter(v => !v.isShort && v._id !== featuredVideo?._id);
  const shortVideos = filteredVideos.filter(v => v.isShort);

  const handleVideoClick = (id) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('videoId', id);
    setSearchParams(newParams);
  };

  const handleQuickSave = async (e, videoId) => {
    e.stopPropagation();
    try {
      await api.post(`/videos/${videoId}/save`);
      setSavedVideos(prev => ({ ...prev, [videoId]: !prev[videoId] }));
    } catch (err) {
      console.error('Failed to save video', err);
      alert('Please sign in to save broadcasts!');
    }
  };

  const handleQuickShare = async (e, video) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/videos?videoId=${video._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(video._id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      alert(`Link: ${shareUrl}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-16 px-4 sm:px-6 lg:px-8 bg-background overflow-hidden min-w-0 w-full max-w-full">
      
      {/* ===================================================================================
          EXCLUSIVE MOBILE VIEW: "Cinema & Editorial Stream" (sm:hidden)
          Crafted for extreme readability, effortless scrolling, and frictionless engagement.
          =================================================================================== */}
      <div className="sm:hidden flex flex-col w-full max-w-full min-w-0">
        
        {/* Mobile Header Branding */}
        <div className="py-4 border-b border-border/50 flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20 shrink-0">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black font-serif text-foreground tracking-tight truncate">Video News</h1>
              <p className="text-[11px] text-muted-foreground font-sans font-semibold truncate">High-definition mobile broadcasts</p>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Horizon Topic Filter Bar */}
        <div className="sticky top-[54px] sm:top-16 z-30 bg-background/95 backdrop-blur-md py-2.5 px-0 border-b border-border/60 flex overflow-x-auto space-x-2 hide-scrollbar shadow-xs w-full max-w-full">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 border ${
                activeCategory === cat 
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 scale-105 font-mono' 
                : 'bg-muted/70 text-foreground border-border/50 hover:bg-muted font-sans'
              }`}
            >
              {cat === 'Trending' && <Flame className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-orange-400 fill-current" />}
              {cat === 'Latest' && <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-amber-400 fill-current" />}
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 space-y-3">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
             <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-bold">Loading Broadcasts...</span>
           </div>
        ) : filteredVideos.length === 0 ? (
           <div className="text-center py-16 text-muted-foreground text-sm font-semibold">
             No video reports available in this category.
           </div>
        ) : (
          <div className="pt-3 space-y-7 w-full min-w-0">
            
            {/* 1. MOBILE SPOTLIGHT HERO */}
            {featuredVideo && (
              <div 
                className="w-full min-w-0 cursor-pointer group flex flex-col pb-5 border-b border-border/60"
                onClick={() => handleVideoClick(featuredVideo._id)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center bg-red-600/15 text-red-600 dark:text-red-400 border border-red-600/25 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-widest font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5 animate-pulse"></span>
                    ★ SPOTLIGHT BROADCAST
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                    {timeAgo(featuredVideo.createdAt)}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black font-serif leading-snug text-foreground my-1.5 break-words tracking-tight group-hover:text-red-600 transition-colors">
                  {featuredVideo.title}
                </h2>

                <div className="relative w-full rounded-2xl aspect-[16/9] bg-black overflow-hidden my-2.5 shadow-md border border-border/50">
                  <img 
                    src={featuredVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&h=720&fit=crop'} 
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-2xl scale-100 group-active:scale-95 transition-transform">
                      <Play className="w-6 h-6 fill-current" />
                    </div>
                  </div>
                  {featuredVideo.duration && (
                    <div className="absolute bottom-2.5 right-2.5 bg-black/85 px-2 py-0.5 rounded text-white text-[10px] font-bold tracking-wider font-mono">
                      {featuredVideo.duration}
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 text-white text-[10px] font-semibold font-sans drop-shadow-md">
                    {formatViews(featuredVideo.views || 0)}
                  </div>
                </div>

                {featuredVideo.subtitle && (
                  <p className="text-xs text-muted-foreground leading-relaxed my-1.5 line-clamp-2">
                    {featuredVideo.subtitle}
                  </p>
                )}

                {/* Reporter attribution bar */}
                <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-red-600/15 border border-red-500/20 text-red-600 font-extrabold text-[11px] flex items-center justify-center shrink-0 font-mono">
                      {(featuredVideo.reporter || 'N')[0]}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">{featuredVideo.reporter || 'Newsroom Desk'}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => handleQuickSave(e, featuredVideo._id)}
                      className="p-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-all"
                      aria-label="Bookmark Broadcast"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${savedVideos[featuredVideo._id] ? 'text-blue-500 fill-blue-500' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => handleQuickShare(e, featuredVideo)}
                      className="p-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-all"
                      aria-label="Share Broadcast"
                    >
                      {copiedId === featuredVideo._id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MOBILE NEWS SHORTS (Vertical 60-sec Briefs) */}
            {shortVideos.length > 0 && activeCategory === 'Trending' && (
              <div className="bg-neutral-950 text-white p-4 rounded-2xl border border-neutral-800 my-4 shadow-xl w-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 text-base">⚡</span>
                    <div>
                      <h3 className="font-extrabold text-sm uppercase font-serif tracking-tight text-white">News Shorts</h3>
                      <p className="text-[10px] text-neutral-400 font-mono">60-second video briefs</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-neutral-900 text-red-400 border border-neutral-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    SWIPE →
                  </span>
                </div>

                <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-1 snap-x">
                  {shortVideos.map((video) => (
                    <div
                      key={video._id}
                      className="relative flex-none w-[130px] aspect-[9/16] shrink-0 bg-neutral-900 rounded-xl overflow-hidden cursor-pointer snap-start shadow-md border border-neutral-800 group active:scale-95 transition-transform"
                      onClick={() => handleVideoClick(video._id)}
                    >
                      <img 
                        src={video.thumbnailUrl || 'https://via.placeholder.com/720x1280.png?text=Short'} 
                        alt={video.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-9 h-9 bg-red-600/90 text-white rounded-full flex items-center justify-center pl-0.5 shadow-xl">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-red-500 font-extrabold text-[8px] px-1 py-0.5 rounded uppercase font-mono border border-red-500/20">
                        SHORT
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
                        <h4 className="text-white font-bold font-sans text-[11px] leading-tight line-clamp-2 drop-shadow-md">
                          {video.title}
                        </h4>
                        <p className="text-neutral-400 font-semibold text-[9px] font-mono">
                          {formatViews(video.views || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MOBILE EDITORIAL FEED */}
            <div className="space-y-8 w-full min-w-0">
              {/* Primary Feed Section */}
              <section className="w-full min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="w-2 h-4 bg-red-600 rounded-full shrink-0"></span>
                    <h3 className="text-base font-black uppercase font-serif text-foreground tracking-tight truncate">
                      {activeCategory === 'Trending' ? 'Trending Broadcasts' : `${activeCategory} Broadcasts`}
                    </h3>
                  </div>
                  {activeCategory !== 'Trending' && activeCategory !== 'Latest' && (
                    <button 
                      onClick={() => navigate(`/video-category/${activeCategory.toLowerCase()}`)}
                      className="text-red-600 dark:text-red-500 text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center transition-colors font-mono shrink-0 ml-2"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  )}
                </div>

                {/* Compact Modern Media Rows */}
                <div className="divide-y divide-border/40">
                  {(activeCategory === 'Trending' || activeCategory === 'Latest' ? regularVideos.slice(0, 6) : regularVideos).map((video) => (
                    <div 
                      key={video._id} 
                      className="flex items-center gap-3 py-3 w-full cursor-pointer group active:bg-muted/30 transition-colors"
                      onClick={() => handleVideoClick(video._id)}
                    >
                      {/* 16:9 Left Thumbnail */}
                      <div className="relative w-28 sm:w-32 h-18 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-black shadow-xs border border-border/50">
                        <img 
                          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center pl-0.5 shadow">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                        </div>
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/85 text-[8px] font-mono text-white px-1 py-0.2 rounded font-bold">
                            {video.duration}
                          </span>
                        )}
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-mono font-bold text-red-600 uppercase bg-red-600/10 px-1.5 py-0.5 rounded border border-red-600/20 truncate">
                              {video.category || 'BROADCAST'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              • {timeAgo(video.createdAt)}
                            </span>
                          </div>
                          <h4 className="font-bold font-serif text-xs sm:text-sm text-foreground leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                            {video.title}
                          </h4>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans mt-1 flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{video.reporter || 'News Desk'}</span>
                          <span className="font-mono text-foreground/80">{formatViews(video.views || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Category Shelves with Horizontal Scrollable Rows */}
              {(activeCategory === 'Trending' || activeCategory === 'Latest') && (
                <div className="space-y-7 pt-1 w-full min-w-0">
                  {CATEGORIES.filter(c => c !== 'Latest' && c !== 'Trending').map(cat => {
                    const catVideos = regularVideos.filter(v => (v.category || '').toLowerCase() === cat.toLowerCase()).slice(0, 5);
                    if (catVideos.length === 0) return null;
                    return (
                      <section key={cat} className="w-full min-w-0">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3 w-full min-w-0">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-2 h-4 bg-red-600 rounded-full shrink-0"></span>
                            <h3 className="text-sm font-black uppercase font-serif text-foreground tracking-tight truncate">
                              {cat}
                            </h3>
                          </div>
                          <button 
                            onClick={() => navigate(`/video-category/${cat.toLowerCase()}`)}
                            className="text-red-600 dark:text-red-500 text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center transition-colors font-mono shrink-0 ml-2"
                          >
                            All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </div>

                        {/* Swipeable Category Carousel */}
                        <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-1 snap-x">
                          {catVideos.map((video) => (
                            <div 
                              key={video._id} 
                              className="relative flex-none w-[200px] bg-card rounded-xl overflow-hidden cursor-pointer snap-start shadow-xs border border-border/60 group active:scale-95 transition-transform"
                              onClick={() => handleVideoClick(video._id)}
                            >
                              <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
                                <img 
                                  src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center pl-0.5 shadow">
                                    <Play className="w-4 h-4 fill-current" />
                                  </div>
                                </div>
                                {video.duration && (
                                  <span className="absolute bottom-1 right-1 bg-black/85 text-[8px] font-mono text-white px-1 py-0.2 rounded font-bold">
                                    {video.duration}
                                  </span>
                                )}
                              </div>
                              <div className="p-2.5">
                                <h4 className="font-bold font-serif text-xs text-foreground leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                                  {video.title}
                                </h4>
                                <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                                  <span>{timeAgo(video.createdAt)}</span>
                                  <span>{formatViews(video.views || 0)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================================
          DESKTOP VIEW: Multi-Column Grids, Showcases & Carousels (hidden sm:block)
          =================================================================================== */}
      <div className="hidden sm:block w-full max-w-full min-w-0">
        
        {/* Top Header */}
        <div className="py-6 border-b border-border/60 mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/20 text-white">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-serif text-foreground tracking-tight">Video Broadcasts</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-sans">High-definition journalism and on-demand video reports from global correspondents</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 space-y-12">

          {/* Desktop Featured Video Showcase */}
          {!loading && featuredVideo && activeCategory === 'Trending' && (
            <div className="w-full max-w-full min-w-0">
              <div 
                className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] rounded-3xl overflow-hidden shadow-xl shadow-black/10 border border-border/60 hover:border-red-500/40 transition-all duration-500 cursor-pointer bg-card group items-stretch"
                onClick={() => handleVideoClick(featuredVideo._id)}
              >
                <div className="relative w-full aspect-[16/9] lg:aspect-auto lg:min-h-[390px] bg-black shrink-0 overflow-hidden">
                  <img 
                    src={featuredVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&h=720&fit=crop'} 
                    alt={featuredVideo.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[76px] h-[76px] bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-2xl shadow-red-950/40 ring-8 ring-white/15 transition-transform duration-300 group-hover:scale-110 group-hover:bg-red-500">
                      <Play className="w-8 h-8 fill-current" />
                    </div>
                  </div>
                  <div className="absolute top-5 left-5 inline-flex items-center gap-2 bg-black/55 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-2 rounded-full uppercase tracking-[0.16em] border border-white/20 shadow-lg font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Editor&apos;s pick
                  </div>
                  {featuredVideo.duration && (
                    <div className="absolute bottom-5 right-5 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-xs font-semibold tracking-wider font-mono border border-white/15">
                      {featuredVideo.duration}
                    </div>
                  )}
                  <div className="absolute bottom-5 left-5 text-white text-xs font-semibold font-mono drop-shadow-lg">
                    {formatViews(featuredVideo.views || 0)}
                  </div>
                </div>
                
                <div className="relative p-6 sm:p-8 lg:p-10 xl:p-12 flex-1 min-w-0 flex flex-col justify-center overflow-hidden bg-gradient-to-br from-card via-card to-red-500/[0.06]">
                  <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-red-500/[0.07] blur-3xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="w-8 h-[2px] bg-red-600 rounded-full" />
                      <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-[0.2em] font-mono truncate">
                        {featuredVideo.category || 'Global news'}
                      </span>
                    </div>
                    <h2 className="font-black font-serif text-2xl sm:text-3xl xl:text-[2.65rem] leading-[1.12] text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-5 break-words">
                      {featuredVideo.title}
                    </h2>
                    {featuredVideo.subtitle && (
                      <p className="text-sm lg:text-base text-muted-foreground mb-7 line-clamp-3 font-sans leading-relaxed break-words max-w-2xl">
                        {featuredVideo.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="relative flex flex-wrap items-center justify-between gap-4 mt-auto pt-5 border-t border-border/60">
                    <div className="flex flex-col gap-1 min-w-0 text-xs font-sans">
                      <span className="text-foreground font-bold truncate">{featuredVideo.reporter || 'Newsroom Desk'}</span>
                      <span className="text-muted-foreground">{timeAgo(featuredVideo.createdAt)}</span>
                    </div>
                    <span className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg shadow-red-600/20 transition-colors shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Watch report
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Category Pills Navigation */}
          <div className="flex overflow-x-auto hide-scrollbar space-x-2.5 pb-2.5 w-full max-w-full">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  if (cat !== 'Latest' && cat !== 'Trending') {
                    navigate(`/video-category/${cat.toLowerCase()}`);
                  } else {
                    setActiveCategory(cat);
                  }
                }}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border ${
                  activeCategory === cat 
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 scale-105' 
                  : 'bg-card text-foreground border-border/60 hover:border-red-500/50 hover:bg-muted/50'
                }`}
              >
                {cat === 'Trending' && <Flame className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-orange-400 fill-current" />}
                {cat === 'Latest' && <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-amber-400 fill-current" />}
                {cat}
              </button>
            ))}
          </div>

          {/* Desktop Video Sections */}
          {loading ? (
             <div className="flex justify-center items-center py-24">
               <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-red-600"></div>
             </div>
          ) : filteredVideos.length === 0 ? (
             <div className="text-center py-16 bg-card rounded-2xl border border-border/50 text-muted-foreground font-medium">
               <p>No video broadcasts found in this category.</p>
             </div>
          ) : (
            <div className="space-y-12">
              
              {/* Main Category Broadcasts */}
              <section>
                <div className="flex items-center space-x-3 mb-6 border-b border-border/60 pb-3">
                  <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">
                    {activeCategory === 'Trending' ? 'Trending Broadcasts' : `${activeCategory} Broadcasts`}
                  </h2>
                </div>

                <HorizontalScrollRow>
                  {regularVideos.slice(0, 8).map((video) => (
                    <div 
                      key={video._id} 
                      className="flex-none w-80 bg-card rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
                      onClick={() => handleVideoClick(video._id)}
                    >
                      <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                        <img 
                          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-[11px] font-semibold font-mono">
                            {video.duration}
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                          {video.category || 'NEWS'}
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-base font-serif leading-snug line-clamp-2 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3 break-words">
                          {video.title}
                        </h3>
                        <div className="pt-2.5 border-t border-border/40 text-xs text-muted-foreground font-semibold flex items-center justify-between">
                          <span>{formatViews(video.views || 0)}</span>
                          <span className="opacity-40">•</span>
                          <span>{timeAgo(video.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </HorizontalScrollRow>
              </section>

              {/* Desktop Shorts Carousel */}
              {shortVideos.length > 0 && (
                <section className="pt-2">
                  <div className="flex items-center space-x-3 mb-6 border-b border-border/60 pb-3">
                    <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                    <div className="flex items-center space-x-2">
                      <PlaySquare className="w-6 h-6 text-red-600 dark:text-red-500 fill-current/10" />
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">News Shorts</h2>
                    </div>
                  </div>

                  <HorizontalScrollRow>
                    {shortVideos.map((video) => (
                      <div 
                        key={video._id}
                        className="relative flex-none w-44 md:w-48 aspect-[9/16] shrink-0 bg-black rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-lg border border-border/60 hover:border-red-500/60 group transition-all duration-300 transform hover:-translate-y-1"
                        onClick={() => handleVideoClick(video._id)}
                      >
                        <img 
                          src={video.thumbnailUrl || 'https://via.placeholder.com/720x1280.png?text=Short'} 
                          alt={video.title}
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-xl transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                          SHORT
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-sm leading-tight line-clamp-3 mb-1.5 font-sans drop-shadow break-words">
                            {video.title}
                          </h3>
                          <div className="text-gray-300 text-[11px] font-semibold flex items-center">
                            <span>{formatViews(video.views || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </HorizontalScrollRow>
                </section>
              )}

              {/* Desktop Remaining Category Sections */}
              {(activeCategory === 'Trending' || activeCategory === 'Latest') ? (
                <div className="space-y-12 pt-4">
                  {CATEGORIES.filter(c => c !== 'Latest' && c !== 'Trending').map(cat => {
                    const catVideos = regularVideos.filter(v => (v.category || '').toLowerCase() === cat.toLowerCase()).slice(0, 10);
                    if (catVideos.length === 0) return null;
                    return (
                      <section key={cat}>
                        <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-3">
                          <div className="flex items-center space-x-3">
                            <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">{cat} Broadcasts</h2>
                          </div>
                          <button 
                            onClick={() => navigate(`/video-category/${cat.toLowerCase()}`)}
                            className="text-red-600 dark:text-red-500 text-sm font-extrabold uppercase tracking-wider hover:underline flex items-center transition-colors font-mono"
                          >
                            View All <ChevronRight className="w-4 h-4 ml-0.5" />
                          </button>
                        </div>

                        <HorizontalScrollRow>
                          {catVideos.map((video) => (
                            <div 
                              key={video._id} 
                              className="flex-none w-80 bg-card rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
                              onClick={() => handleVideoClick(video._id)}
                            >
                              <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                                <img 
                                  src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 fill-current" />
                                  </div>
                                </div>
                                {video.duration && (
                                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-[11px] font-semibold font-mono">
                                    {video.duration}
                                  </div>
                                )}
                                <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                                  {video.category || 'NEWS'}
                                </div>
                              </div>

                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <h3 className="font-bold text-base font-serif leading-snug line-clamp-2 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3 break-words">
                                  {video.title}
                                </h3>
                                <div className="pt-2.5 border-t border-border/40 text-xs text-muted-foreground font-semibold flex items-center justify-between">
                                  <span>{formatViews(video.views || 0)}</span>
                                  <span className="opacity-40">•</span>
                                  <span>{timeAgo(video.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </HorizontalScrollRow>
                      </section>
                    );
                  })}
                </div>
              ) : (
                regularVideos.length > 8 && (
                  <div className="pt-6 space-y-4">
                    <div className="flex items-center space-x-3 mb-6 border-b border-border/60 pb-3">
                      <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">More {activeCategory} Broadcasts</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularVideos.slice(8).map((video) => (
                        <div 
                          key={video._id} 
                          className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group w-full max-w-full min-w-0"
                          onClick={() => handleVideoClick(video._id)}
                        >
                          <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                            <img 
                              src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 fill-current" />
                              </div>
                            </div>
                            {video.duration && (
                              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-[11px] font-semibold font-mono">
                                {video.duration}
                              </div>
                            )}
                            <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                              {video.category || 'NEWS'}
                            </div>
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <h3 className="font-bold text-base font-serif leading-snug text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-2.5 line-clamp-2 break-words">
                              {video.title}
                            </h3>
                            <div className="pt-2.5 border-t border-border/40 text-xs text-muted-foreground font-semibold flex items-center justify-between">
                              <span>{formatViews(video.views || 0)}</span>
                              <span className="opacity-40">•</span>
                              <span>{timeAgo(video.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
