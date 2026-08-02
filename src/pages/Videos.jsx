import React, { useState, useEffect } from 'react';
import { PlaySquare, Play, Heart, Download, Menu, ChevronRight, Video, Flame, Sparkles } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

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

const CATEGORIES = [
  'Trending', 'Latest', 'World', 'Politics', 'Business', 
  'Technology', 'Science', 'Health', 'Sports', 'Entertainment', 'Lifestyle'
];

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Trending');
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

  return (
    <div className="max-w-7xl mx-auto pb-20 md:pb-16 px-4 sm:px-6 lg:px-8 bg-background overflow-hidden min-w-0">
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

        {/* Featured Video - Premium Showcase */}
        {!loading && featuredVideo && activeCategory === 'Trending' && (
          <div 
            className="flex flex-col lg:flex-row rounded-2xl overflow-hidden shadow-md border border-border/60 hover:border-red-500/40 transition-all duration-500 cursor-pointer bg-card group items-stretch transform hover:-translate-y-1"
            onClick={() => handleVideoClick(featuredVideo._id)}
          >
            <div className="relative w-full lg:w-[55%] aspect-video bg-black shrink-0 overflow-hidden">
              <img 
                src={featuredVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&h=720&fit=crop'} 
                alt={featuredVideo.title}
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-colors group-hover:bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-2xl transition-transform duration-300 group-hover:scale-110 group-hover:bg-red-500">
                  <Play className="w-7 h-7 fill-current" />
                </div>
              </div>
              <div className="absolute top-4 left-4 inline-flex items-center bg-red-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-sm uppercase tracking-wider shadow-md font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white mr-2 animate-pulse"></span>
                Featured Broadcast
              </div>
              {featuredVideo.duration && (
                <div className="absolute bottom-4 right-4 bg-black/80 px-2.5 py-1 rounded text-white text-xs font-semibold tracking-wider font-mono">
                  {featuredVideo.duration}
                </div>
              )}
            </div>
            
            <div className="p-6 sm:p-8 lg:p-10 flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
              <div>
                <span className="text-xs font-extrabold text-red-600 dark:text-red-500 uppercase tracking-wider block mb-2 font-mono truncate">
                  {featuredVideo.category || 'GLOBAL NEWS'}
                </span>
                <h3 className="font-bold font-serif text-xl sm:text-2xl lg:text-[28px] leading-snug text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-4 break-words">
                  {featuredVideo.title}
                </h3>
                {featuredVideo.subtitle && (
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-3 font-sans leading-relaxed break-words">
                    {featuredVideo.subtitle}
                  </p>
                )}
              </div>
              <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground font-semibold font-sans flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-foreground">{featuredVideo.reporter || 'Newsroom Desk'}</span>
                <span className="opacity-40">•</span>
                <span>{formatViews(featuredVideo.views || 0)}</span>
                <span className="opacity-40">•</span>
                <span>{timeAgo(featuredVideo.createdAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Category Pills Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar space-x-2.5 pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
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

        {/* Video List Section */}
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
            
            {/* Main Category Carousel */}
            <section>
              <div className="flex items-center space-x-3 mb-6 border-b border-border/60 pb-3">
                <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">
                  {activeCategory === 'Trending' ? 'Trending Broadcasts' : `${activeCategory} Broadcasts`}
                </h2>
              </div>

              <div className="flex overflow-x-auto hide-scrollbar space-x-5 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x">
                {regularVideos.slice(0, 8).map((video) => (
                  <div 
                    key={video._id} 
                    className="flex-none w-72 sm:w-80 bg-card rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
                    onClick={() => handleVideoClick(video._id)}
                  >
                    <div className="relative w-full aspect-video bg-muted overflow-hidden">
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
                      <h3 className="font-bold text-base font-serif leading-snug line-clamp-2 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3">
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
            </section>

            {/* Shorts Carousel */}
            {shortVideos.length > 0 && (
              <section className="pt-2">
                <div className="flex items-center space-x-3 mb-6 border-b border-border/60 pb-3">
                  <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                  <div className="flex items-center space-x-2">
                    <PlaySquare className="w-6 h-6 text-red-600 dark:text-red-500 fill-current/10" />
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">News Shorts</h2>
                  </div>
                </div>

                <div className="flex overflow-x-auto hide-scrollbar space-x-4 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x">
                  {shortVideos.map((video) => (
                    <div 
                      key={video._id}
                      className="relative flex-none w-40 sm:w-44 md:w-48 aspect-[9/16] bg-black rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-lg border border-border/60 hover:border-red-500/60 group transition-all duration-300 transform hover:-translate-y-1.5"
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
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        SHORT
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-3 mb-2 font-sans drop-shadow">
                          {video.title}
                        </h3>
                        <div className="text-gray-300 text-[11px] font-semibold flex items-center">
                          <span>{formatViews(video.views || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Remaining Category Sections */}
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
                          className="text-red-600 dark:text-red-500 text-xs sm:text-sm font-extrabold uppercase tracking-wider hover:underline flex items-center transition-colors font-mono"
                        >
                          View All <ChevronRight className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                      
                      <div className="flex overflow-x-auto hide-scrollbar space-x-5 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x">
                        {catVideos.map((video) => (
                          <div 
                            key={video._id} 
                            className="flex-none w-72 sm:w-80 bg-card rounded-2xl overflow-hidden cursor-pointer snap-start shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
                            onClick={() => handleVideoClick(video._id)}
                          >
                            <div className="relative w-full aspect-video bg-muted overflow-hidden">
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
                              <h3 className="font-bold text-base font-serif leading-snug line-clamp-2 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3">
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
                        className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-border/60 hover:border-red-500/40 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
                        onClick={() => handleVideoClick(video._id)}
                      >
                        <div className="relative w-full aspect-video bg-muted overflow-hidden">
                          <img 
                            src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-current" />
                            </div>
                          </div>
                          {video.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-[11px] font-semibold font-mono">
                              {video.duration}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <h3 className="font-bold text-sm sm:text-base font-serif leading-snug text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-3 line-clamp-2">
                            {video.title}
                          </h3>
                          <div className="pt-2.5 border-t border-border/40 text-[11px] sm:text-xs text-muted-foreground font-semibold flex items-center justify-between">
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
