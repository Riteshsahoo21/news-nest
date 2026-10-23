import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ThumbsUp, Heart, Bookmark, Share2, Download, Send, Trash2, Ban, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatViews, timeAgo } from '../pages/Videos';
import { useAuth } from '../context/AuthContext';
import AdSlot from './ads/AdSlot';
import CommentThread, { buildCommentTree } from './CommentThread';
import SafeImage from './common/SafeImage';

export const getCleanYouTubeEmbedUrl = (url, autoplay = true) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  const vId = (match && match[2].length === 11) ? match[2] : null;
  if (vId) {
    return `https://www.youtube-nocookie.com/embed/${vId}?autoplay=${autoplay ? 1 : 0}&playsinline=1&rel=0&modestbranding=1`;
  }
  return url;
};

export default function VideoModal({ videoId, onClose }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const { user } = useAuth();
  
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = video ? video.title : 'RitzlaNews Broadcast';
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert(`Share link: ${shareUrl}`);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    
    // Prevent scrolling on body when modal is open
    document.body.style.overflow = 'hidden';
    
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/videos/${videoId}`);
        setVideo(res.data.video);
        setComments(res.data.comments || []);
        
        if (res.data.video) {
          const { category, tags, _id } = res.data.video;
          let queryUrl = `/videos/related?videoId=${_id}`;
          if (category) queryUrl += `&category=${category}`;
          if (tags && tags.length > 0) queryUrl += `&tags=${tags.join(',')}`;
          
          try {
            const relatedRes = await api.get(queryUrl);
            setRelatedNews(relatedRes.data);
          } catch (e) {
            console.error('Failed to fetch related news', e);
          }
        }
        
        // Only staff preview custom interstitials
        if (isStaff) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('staff_videos_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(videoId)) {
            readArticles.push(videoId);
            sessionStorage.setItem('staff_videos_read_list', JSON.stringify(readArticles));
          }
          
          let readCount = readArticles.length;

          let lastAdTime = parseInt(sessionStorage.getItem('last_ad_shown_time') || '0', 10);
          const now = Date.now();
          if (readCount > 0 && readCount % 8 === 0 && (now - lastAdTime) > 30000) {
            sessionStorage.setItem('last_ad_shown_time', now.toString());
            setInterstitialType('video_interstitial');
            setCountdown(15);
            setShowInterstitial(true);
          } else {
            setShowInterstitial(false);
          }
        }
      } catch (err) {
        console.error('Error fetching video details', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideoDetails();

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [videoId, isStaff]);

  useEffect(() => {
    let timer;
    if (showInterstitial && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showInterstitial, countdown]);

  const userId = user?._id || user?.id;
  const isLiked = Boolean(userId && video?.likes?.some(l => (l?._id || l || '').toString() === userId.toString()));
  const isSaved = Boolean(userId && video?.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString()));

  const handleLike = async () => {
    if (!userId) {
      alert('Please sign in to like this video!');
      return;
    }
    if (!video) return;
    try {
      const res = await api.post(`/videos/${video._id}/like`);
      setVideo(prev => {
        const wasLiked = prev.likes?.some(l => (l?._id || l || '').toString() === userId.toString());
        const updatedLikes = wasLiked 
          ? (prev.likes || []).filter(l => (l?._id || l || '').toString() !== userId.toString())
          : [...(prev.likes || []), userId];
        return { 
          ...prev, 
          likesCount: res.data.likesCount !== undefined ? res.data.likesCount : updatedLikes.length,
          likes: updatedLikes 
        };
      });
    } catch (err) {
      console.error('Failed to like video', err);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      alert('Please sign in to bookmark this broadcast!');
      return;
    }
    if (!video) return;
    try {
      await api.post(`/videos/${video._id}/save`);
      setVideo(prev => {
        const wasSaved = prev.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString());
        const updatedSavedBy = wasSaved 
          ? (prev.savedBy || []).filter(s => (s?._id || s || '').toString() !== userId.toString())
          : [...(prev.savedBy || []), userId];
        return { ...prev, savedBy: updatedSavedBy };
      });
    } catch (err) {
      console.error('Failed to save video', err);
    }
  };
  
  const handleDownload = async () => {
    if (!video) return;
    try {
      await api.post(`/videos/${video._id}/download`);
    } catch (err) {
      console.error('Failed to record download', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please sign in to post a comment!');
      return;
    }
    if (!newComment.trim() || !video) return;
    
    try {
      const res = await api.post(`/videos/${video._id}/comments`, { content: newComment });
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment', err);
      alert(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const handleReplySubmit = async (content, parentCommentId) => {
    if (!userId) {
      alert('Please sign in to reply to comments!');
      return;
    }
    if (!content.trim() || !video) return;
    try {
      await api.post(`/videos/${video._id}/comments`, { content, parentCommentId });
    } catch (err) {
      console.error('Failed to post reply', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter(c => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert('Failed to delete comment');
    }
  };

  const handleBanUser = async (userId) => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    try {
      await api.put(`/user-admin/${userId}/status`, { isActive: false });
      alert('User has been banned.');
    } catch (err) {
      console.error('Failed to ban user', err);
      alert('Failed to ban user. Make sure you have admin permissions.');
    }
  };

  if (!videoId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center bg-black/95 backdrop-blur-md md:p-6 overflow-hidden animate-in fade-in duration-300 w-full h-full max-w-full">
      
      {/* Interstitial Sponsor Overlay */}
      {showInterstitial && (
        <div className="absolute inset-0 bg-background z-[110] flex flex-col items-center justify-center p-4 overflow-y-auto w-full h-full">
          <div className="w-full max-w-2xl bg-card rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center shadow-xl border border-border relative my-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground font-serif">Sponsor Message</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">Your broadcast will load shortly...</p>
            
            <div className={`w-full bg-black border border-border rounded-xl overflow-hidden flex items-center justify-center mb-6 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[400px]'}`}>
              <AdSlot 
                position={interstitialType} 
                className="m-0 w-full h-full" 
                onAdEmpty={() => setShowInterstitial(false)}
              />
            </div>
            
            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              <button 
                disabled={countdown > 0}
                onClick={() => setShowInterstitial(false)}
                className={`w-full py-3.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${countdown > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-red-600 text-white shadow-lg hover:shadow-xl hover:bg-red-700'}`}
              >
                {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & Watch Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE DEDICATED VIEW (Native Full-Screen Player with Unified Scrolling) */}
      <div className="md:hidden flex flex-col w-full h-full bg-background overflow-hidden relative max-w-full min-w-0">
        
        {/* Sticky Mobile Top Bar */}
        <div className="flex items-center justify-between px-3.5 h-12 bg-neutral-950 border-b border-neutral-800 text-white shrink-0 z-40">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-all"
            aria-label="Back to Videos"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono font-extrabold text-red-500 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 truncate">
              {video?.category || 'BROADCAST'}
            </span>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-1 shrink-0"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sticky Mobile Video Player */}
        <div className="sticky top-0 z-30 w-full aspect-video bg-black shrink-0 flex items-center justify-center overflow-hidden shadow-md">
          {loading ? (
            <div className="w-full aspect-video flex items-center justify-center">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-red-600"></div>
            </div>
          ) : video ? (
            <div className="relative w-full aspect-video flex items-center justify-center mx-auto">
              {video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be') ? (
                <iframe 
                  className="w-full h-full"
                  src={showInterstitial ? '' : getCleanYouTubeEmbedUrl(video.videoUrl, true)}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                  autoPlay={!showInterstitial}
                  src={video.videoUrl}
                ></video>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-white bg-neutral-900">
              <p className="text-sm font-medium">Video not found</p>
            </div>
          )}
        </div>

        {/* Mobile Unified Stream (Metadata + Actions + Ad + Comments in one seamless flow) */}
        {video && !loading && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24 w-full max-w-full min-w-0">
            {/* Title & Stats */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-red-600/10 text-red-600 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded border border-red-600/20 font-mono">
                  {video.category || 'NEWS'}
                </span>
                <span className="text-xs font-semibold text-foreground/80 bg-muted px-2.5 py-0.5 rounded">
                  {formatViews(video.views || 0)}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {timeAgo(video.createdAt)}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black leading-snug text-foreground font-serif tracking-tight break-words">
                {video.title}
              </h1>
              
              <div className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl border border-border/50">
                <div className="w-9 h-9 rounded-full bg-red-600/15 border border-red-500/20 flex items-center justify-center text-red-600 font-extrabold text-sm shrink-0 font-mono">
                  {(video.reporter || 'N')[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold font-mono">Reported by</p>
                  <p className="font-bold text-xs sm:text-sm text-foreground truncate">{video.reporter || 'Newsroom Desk'}</p>
                </div>
              </div>

              {/* Description Box with Expandable Toggle */}
              <div className="bg-muted/20 p-3 rounded-xl border border-border/40">
                <p className={`text-foreground/90 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans break-words ${!showFullDesc && video.description?.length > 150 ? 'line-clamp-3' : ''}`}>
                  {video.description}
                </p>
                {video.description?.length > 150 && (
                  <button 
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-red-600 text-xs font-bold mt-1.5 flex items-center gap-0.5 hover:underline"
                  >
                    {showFullDesc ? (
                      <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Show more <ChevronDown className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                )}
              </div>

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {video.tags.map((tag, idx) => (
                    <span key={idx} className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border border-border/60">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Actions Pill Bar */}
            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-border/50 w-full min-w-0">
              <button 
                onClick={handleLike} 
                className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 text-xs font-bold truncate ${
                  isLiked ? 'bg-red-500/15 text-red-500 border border-red-500/30' : 'bg-muted/70 text-foreground hover:bg-muted'
                }`}
              >
                <Heart className={`w-4 h-4 shrink-0 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                <span className="truncate">{video.likesCount || 0} {isLiked ? 'Liked' : 'Like'}</span>
              </button>
              <button 
                onClick={handleSave} 
                className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 text-xs font-bold truncate ${
                  isSaved ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30' : 'bg-muted/70 text-foreground hover:bg-muted'
                }`}
              >
                <Bookmark className={`w-4 h-4 shrink-0 ${isSaved ? 'text-blue-500 fill-blue-500' : ''}`} />
                <span className="truncate">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
              <button onClick={handleShare} className="flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 rounded-xl bg-muted/70 hover:bg-muted text-foreground text-xs font-bold truncate">
                {copied ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Share2 className="w-4 h-4 shrink-0" />}
                <span className="truncate">{copied ? 'Copied!' : 'Share'}</span>
              </button>
            </div>

            {/* Mobile Inline Advertisement Slot (Staff Only) */}
            {isStaff && (
              <div className="pt-2 w-full max-w-full min-w-0">
                <AdSlot position="in_article" className="w-full !my-2 shadow-sm border border-border/60 rounded-xl overflow-hidden block" />
              </div>
            )}

            {/* Mobile Related News Section */}
            {relatedNews.length > 0 && (
              <div className="pt-6 pb-2 border-t border-border/60 w-full min-w-0">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-5 bg-red-600 rounded-sm inline-block"></span>
                  Related Broadcasts
                </h3>
                <div className="flex flex-col space-y-3">
                  {relatedNews.map((news) => (
                    <button 
                      key={news._id}
                      type="button"
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('videoId', news._id);
                        setSearchParams(newParams);
                      }}
                      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/40 transition-colors"
                    >
                      <SafeImage 
                        src={news.imageUrl || news.mainImageUrl} 
                        alt={news.title} 
                        category={news.category}
                        className="w-24 h-16 object-cover rounded-lg flex-shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-sm font-serif">
                          {news.title}
                        </h4>
                        {news.duration && (
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground mt-1 block">
                            {news.duration}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Unified Comments Stream (No nested scrollbar!) */}
            <div className="pt-4 border-t border-border/60 space-y-4 w-full min-w-0">
              <h3 className="font-extrabold text-lg flex items-center gap-2 font-serif text-foreground">
                Discussion <span className="bg-muted text-foreground text-xs font-sans font-bold px-2 py-0.5 rounded-full">{comments.length}</span>
              </h3>
              
              {video.commentSettings === 'off' ? (
                <div className="p-5 text-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded-xl border border-border/50">
                  Comments are disabled for this broadcast.
                </div>
              ) : video.commentSettings === 'staff_only' && !isStaff ? (
                <div className="p-5 text-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded-xl border border-border/50">
                  Only staff members can participate in this thread.
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4 w-full min-w-0">
                  {buildCommentTree(comments).map(comment => (
                    <CommentThread
                      key={comment._id}
                      comment={comment}
                      onReplySubmit={handleReplySubmit}
                      onLike={() => {}} 
                      onDelete={handleDeleteComment}
                      onBan={handleBanUser}
                      isStaff={isStaff}
                      isAdmin={isAdmin}
                      currentUser={user}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Send className="w-6 h-6 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Be the first to share your thoughts on this broadcast!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Sticky Bottom Comment Input Bar */}
        {video && !loading && video.commentSettings !== 'off' && (video.commentSettings !== 'staff_only' || isStaff) && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur-md border-t border-border z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] w-full">
            <form onSubmit={handleCommentSubmit} className="relative flex items-center w-full">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                className="w-full border-2 border-border/80 focus:border-red-600 rounded-full py-2.5 pl-4 pr-12 outline-none bg-background text-xs font-medium transition-colors"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                className="absolute right-1.5 p-2 bg-red-600 text-white rounded-full disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground transition-all"
                aria-label="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (Side-by-Side Modal Interface) */}
      <div className="hidden md:flex bg-background w-full h-[88vh] max-w-[1540px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/10">
        
        {/* Left Column: Video & Details */}
        <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar bg-card relative min-w-0">
          
          {/* Desktop Top Navigation Bar */}
          <div className="flex items-center justify-between px-6 h-14 bg-neutral-950 border-b border-neutral-800 text-white sticky top-0 z-40 shrink-0 shadow-sm">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-neutral-800/90 hover:bg-neutral-700 text-white transition-all duration-200 group"
              aria-label="Back to Videos"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0" />
              <span>Back to Videos</span>
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-black text-red-500 uppercase tracking-wider bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
                📺 {video?.category || 'NEWS BROADCAST'}
              </span>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-2"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Video Player Area */}
          <div className="relative z-30 w-full bg-black shrink-0 shadow-lg max-h-[420px] lg:max-h-[480px] flex items-center justify-center overflow-hidden">
            {loading ? (
              <div className="w-full aspect-video max-h-[420px] lg:max-h-[480px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
              </div>
            ) : video ? (
              <div className="relative w-full aspect-video max-h-[420px] lg:max-h-[480px] flex items-center justify-center mx-auto group">
                {video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be') ? (
                  <iframe 
                    className="w-full h-full"
                    src={showInterstitial ? '' : getCleanYouTubeEmbedUrl(video.videoUrl, true)}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video 
                    className="w-full h-full object-contain"
                    controls
                    autoPlay={!showInterstitial}
                    src={video.videoUrl}
                  ></video>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-white bg-neutral-900">
                <p className="text-lg font-medium">Video not found</p>
              </div>
            )}
          </div>

          {/* Desktop Content Area */}
          {video && !loading && (
            <>
              <div className="p-6 md:p-8 flex-1 w-full max-w-full min-w-0">
              <div className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="inline-block bg-red-600/10 text-red-600 dark:text-red-400 font-extrabold text-xs uppercase tracking-widest px-3 py-1 rounded-md border border-red-600/20 font-mono">
                    {video.category || 'NEWS'}
                  </span>
                  <span className="text-sm font-semibold text-foreground/80 bg-muted px-3 py-1 rounded-md font-sans">
                    {formatViews(video.views || 0)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {timeAgo(video.createdAt)}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight mb-6 text-foreground font-serif tracking-tight break-words">
                  {video.title}
                </h1>
                
                <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border/60">
                  <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-600 font-extrabold text-xl shrink-0 font-mono">
                    {(video.reporter || 'N')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-extrabold mb-0.5 font-mono">Reported by</p>
                    <p className="font-bold text-base text-foreground truncate">{video.reporter || 'Newsroom Desk'}</p>
                  </div>
                </div>

                <div className="prose prose-base lg:prose-lg dark:prose-invert max-w-none mb-6">
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium break-words">
                    {video.description}
                  </p>
                </div>

                {/* Desktop Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {video.tags.map((tag, idx) => (
                      <span key={idx} className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border border-border/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 py-6 border-t border-border/60 w-full max-w-full min-w-0">
                <button 
                  onClick={handleLike} 
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 text-sm font-bold group truncate ${
                    isLiked ? 'bg-red-500/15 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-muted/60 hover:bg-muted text-foreground hover:text-red-500 border border-transparent'
                  }`}
                >
                  <Heart className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                  <span className="truncate">{video.likesCount || 0} {isLiked ? 'Liked' : 'Like'}</span>
                </button>
                <button 
                  onClick={handleSave} 
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 text-sm font-bold group truncate ${
                    isSaved ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-muted/60 hover:bg-muted text-foreground hover:text-blue-500 border border-transparent'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isSaved ? 'text-blue-500 fill-blue-500' : ''}`} />
                  <span className="truncate">{isSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button onClick={handleShare} className="flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl bg-muted/60 hover:bg-muted transition-all text-foreground text-sm font-bold border border-transparent hover:border-border truncate">
                  {copied ? <Check className="w-5 h-5 text-green-500 shrink-0" /> : <Share2 className="w-5 h-5 shrink-0 hover:scale-110 transition-transform" />}
                  <span className="truncate">{copied ? 'Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Desktop Related News Section */}
            {relatedNews.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border/60 w-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-red-600 rounded-sm inline-block"></span>
                  Related Videos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedNews.map((news) => (
                    <a 
                      key={news._id}
                      href={`?videoId=${news._id}`}
                      className="block group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-red-500/50 transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        <SafeImage 
                          src={news.imageUrl || news.mainImageUrl} 
                          alt={news.title}
                          category={news.category}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {news.duration && (
                          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {news.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-red-500 transition-colors line-clamp-2">
                          {news.title}
                        </h4>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Desktop Right Column: Sticky Comments Panel */}
        {video && !loading && (
          <div className="w-[320px] lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col bg-card border-l border-border/50 h-full z-10">
            <div className="p-5 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10">
              <h3 className="font-bold text-xl flex items-center gap-2 font-serif">
                Discussion <span className="bg-muted text-muted-foreground text-xs font-sans font-bold px-2.5 py-1 rounded-full">{comments.length}</span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">
              {video.commentSettings === 'off' ? (
                <div className="p-6 text-center text-sm font-medium text-muted-foreground bg-muted/30 rounded-2xl border border-border/50">
                  Comments are disabled for this video.
                </div>
              ) : video.commentSettings === 'staff_only' && !isStaff ? (
                <div className="p-6 text-center text-sm font-medium text-muted-foreground bg-muted/30 rounded-2xl border border-border/50">
                  Only staff members can comment on this video.
                </div>
              ) : comments.length > 0 ? (
                buildCommentTree(comments).map(comment => (
                  <CommentThread
                    key={comment._id}
                    comment={comment}
                    onReplySubmit={handleReplySubmit}
                    onLike={() => {}} 
                    onDelete={handleDeleteComment}
                    onBan={handleBanUser}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    currentUser={user}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Send className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Be the first to comment!</p>
                </div>
              )}
            </div>

            {video.commentSettings !== 'off' && (video.commentSettings !== 'staff_only' || isStaff) && (
              <div className="p-5 border-t border-border/50 bg-card/80 backdrop-blur-md mt-auto">
                <form onSubmit={handleCommentSubmit} className="relative flex items-center">
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    className="w-full border-2 border-border focus:border-red-600 rounded-full py-3.5 pl-5 pr-14 outline-none bg-background text-sm font-medium transition-colors"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    className="absolute right-2 p-2.5 bg-red-600 text-white rounded-full disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in.fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-in.zoom-in-95 {
          animation: zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
