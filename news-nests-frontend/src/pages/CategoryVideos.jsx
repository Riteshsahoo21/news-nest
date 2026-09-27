import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Bookmark, Share2, Check, Video } from 'lucide-react';
import api from '../services/api';
import { formatViews, timeAgo } from './Videos';

export default function CategoryVideos() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedVideos, setSavedVideos] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const categoryName = categoryId ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1) : 'Category';

  useEffect(() => {
    const fetchCategoryVideos = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/videos?category=${categoryId}`);
        setVideos(res.data);
      } catch (err) {
        console.error(err);
        setError(`Failed to fetch ${categoryName} videos.`);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchCategoryVideos();
    }
  }, [categoryId, categoryName]);

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
    <div className="max-w-7xl mx-auto md:py-6 pb-24 bg-background min-h-screen overflow-hidden min-w-0 w-full max-w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3.5 flex items-center justify-between w-full max-w-full min-w-0 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1.5 -ml-1 hover:bg-muted rounded-full transition-colors shrink-0 text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-red-600/20">
              <Video className="w-4 h-4 fill-current" />
            </div>
            <h1 className="text-lg sm:text-2xl font-black truncate font-serif text-foreground tracking-tight">
              {categoryName} Broadcasts
            </h1>
          </div>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground font-bold shrink-0 bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
          {videos.length} Videos
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-red-600"></div>
          <span className="text-xs font-mono text-muted-foreground font-bold uppercase tracking-wider">Loading Broadcasts...</span>
        </div>
      ) : error ? (
        <div className="text-center text-destructive font-semibold py-16 px-4">{error}</div>
      ) : videos.length === 0 ? (
        <div className="text-center text-muted-foreground font-medium py-20 px-4 bg-card mx-4 my-8 rounded-2xl border border-border/50">
          No video broadcasts found for {categoryName}.
        </div>
      ) : (
        <div className="w-full max-w-full min-w-0">
          
          {/* ===================================================================================
              EXCLUSIVE MOBILE VIEW: "Cinema & Editorial Stream" (sm:hidden)
              =================================================================================== */}
          <div className="sm:hidden flex flex-col space-y-8 mt-5 px-4 w-full min-w-0">
            {videos.map((video) => (
              <div 
                key={video._id} 
                className="w-full min-w-0 cursor-pointer flex flex-col pb-6 border-b border-border/50 group"
                onClick={() => handleVideoClick(video._id)}
              >
                {/* Top Metadata line */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="bg-red-600/10 text-red-600 dark:text-red-400 font-mono font-black text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border border-red-600/20 truncate">
                    {video.category || categoryName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted-foreground shrink-0">
                    <span>{formatViews(video.views || 0)}</span>
                    <span>•</span>
                    <span>{timeAgo(video.createdAt)}</span>
                  </div>
                </div>

                {/* Unabridged Readable Headline */}
                <h3 className="text-lg font-black font-serif leading-snug text-foreground my-1.5 break-words tracking-tight group-active:text-red-600 transition-colors">
                  {video.title}
                </h3>

                {/* Cinematic 16:9 Thumbnail Window */}
                <div className="relative w-full aspect-[16/9] rounded-2xl bg-black overflow-hidden my-3 shadow-md border border-border/40">
                  <img 
                    src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                    alt={video.title}
                    className="w-full h-full object-cover opacity-95"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center pl-1 shadow-xl">
                      <Play className="w-6 h-6 fill-current" />
                    </div>
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-2.5 right-2.5 bg-black/85 px-2.5 py-1 rounded text-white text-xs font-extrabold font-mono">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Reporter attribution & interactions */}
                <div className="flex items-center justify-between pt-2 mt-1 w-full min-w-0">
                  <span className="text-xs font-bold text-muted-foreground truncate">
                    Reported by <span className="text-foreground">{video.reporter || 'Newsroom Desk'}</span>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => handleQuickSave(e, video._id)}
                      className="p-2 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-all"
                      aria-label="Save Broadcast"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${savedVideos[video._id] ? 'text-blue-500 fill-blue-500' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => handleQuickShare(e, video)}
                      className="p-2 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-all"
                      aria-label="Share Broadcast"
                    >
                      {copiedId === video._id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ===================================================================================
              DESKTOP VIEW: Multi-Column Grid (hidden sm:grid)
              =================================================================================== */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 px-4 sm:px-6 lg:px-8 w-full max-w-full min-w-0">
            {videos.map((video) => (
              <div 
                key={video._id} 
                className="relative flex flex-col w-full bg-card rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-border/50 group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 w-full max-w-full min-w-0"
                onClick={() => handleVideoClick(video._id)}
              >
                <div className="relative w-full aspect-[16/9] bg-muted shrink-0 overflow-hidden">
                  <img 
                    src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center pl-1 shadow-lg">
                      <Play className="w-6 h-6 fill-current" />
                    </div>
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-[11px] font-semibold font-mono">
                      {video.duration}
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                    {video.category || categoryName}
                  </div>
                </div>
                
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold font-serif text-base sm:text-lg leading-snug text-foreground line-clamp-2 group-hover:text-red-600 transition-colors mb-2.5 break-words">
                      {video.title}
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between pt-2.5 border-t border-border/40">
                    <span>{formatViews(video.views || 0)}</span>
                    <span className="opacity-40">•</span>
                    <span>{timeAgo(video.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
