import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ThumbsUp, Heart, Bookmark, Share2, Download, Send, Trash2, Ban } from 'lucide-react';
import api from '../services/api';
import { formatViews, timeAgo } from '../pages/Videos';
import { useAuth } from '../context/AuthContext';
import AdSlot from './ads/AdSlot';
import CommentThread, { buildCommentTree } from './CommentThread';

export default function VideoModal({ videoId, onClose }) {
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const isAdFree = user?.isPremium || isStaff;
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);

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
        
        if (!isAdFree) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('free_articles_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(videoId)) {
            readArticles.push(videoId);
            sessionStorage.setItem('free_articles_read_list', JSON.stringify(readArticles));
          }
          
          let readCount = readArticles.length;
          console.log(`[Ad System Video] User has viewed ${readCount} unique items:`, readArticles);

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
  }, [videoId, isAdFree]);

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
    <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center bg-black/90 backdrop-blur-md md:p-6 overflow-hidden animate-in fade-in duration-300">
      
      {/* Modal Container */}
      <div className="bg-background w-full h-full md:h-[88vh] md:max-w-[1540px] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/10">
        
        {/* Interstitial Overlay */}
        {showInterstitial && (
          <div className="absolute inset-0 bg-background z-[110] flex flex-col items-center justify-center p-4 overflow-y-auto w-full h-full">
            <div className="w-full max-w-2xl bg-card rounded-2xl p-8 text-center flex flex-col items-center shadow-xl border border-border relative my-auto">
              <h2 className="text-2xl font-bold mb-2 text-foreground">Sponsor Message</h2>
              <p className="text-muted-foreground mb-8">Your video will load shortly...</p>
              
              <div className={`w-full bg-black border border-border rounded-xl overflow-hidden flex items-center justify-center mb-8 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[400px]'}`}>
                <AdSlot 
                  position={interstitialType} 
                  className="m-0 w-full h-full" 
                  onAdEmpty={() => setShowInterstitial(false)}
                />
              </div>
              
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <button 
                  disabled={countdown > 0}
                  onClick={() => setShowInterstitial(false)}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all ${countdown > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5'}`}
                >
                  {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & Watch Video'}
                </button>
                {countdown === 0 && (
                  <a href="/subscriptions" className="text-primary font-semibold hover:underline text-sm">
                    Remove Ads with Premium
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Left Column: Video & Details */}
        <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar bg-card relative">
          {/* Top Video Player Area */}
          <div className="sticky top-0 z-20 w-full bg-black shrink-0 shadow-lg max-h-[320px] md:max-h-[360px] xl:max-h-[400px] flex items-center justify-center overflow-hidden">
            {loading ? (
              <div className="w-full aspect-video max-h-[320px] md:max-h-[360px] xl:max-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : video ? (
              <div className="relative w-full aspect-video max-h-[320px] md:max-h-[360px] xl:max-h-[400px] flex items-center justify-center mx-auto group">
                {/* Back Button Overlay */}
                <button 
                  onClick={onClose}
                  className="absolute top-4 left-4 z-30 w-12 h-12 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all hover:scale-105"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                
                {video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be') ? (
                  <iframe 
                    className="w-full h-full"
                    src={showInterstitial ? '' : `${video.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('youtube.com/live/', 'youtube.com/embed/')}?autoplay=1`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

          {/* Content Area */}
          {video && !loading && (
            <div className="p-6 md:p-8 flex-1">
              {/* Metadata */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-block bg-primary/15 text-primary font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full">
                    {video.category || 'NEWS'}
                  </span>
                  <span className="text-sm font-semibold text-foreground/70 bg-muted/50 px-3 py-1.5 rounded-full">
                    {formatViews(video.views || 0)}
                  </span>
                  <span className="text-sm font-medium text-foreground/70">
                    {timeAgo(video.createdAt)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-6 text-foreground font-serif tracking-tight">
                  {video.title}
                </h1>
                
                <div className="flex items-center gap-4 mb-8 p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {(video.reporter || 'N')[0]}
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 uppercase tracking-wider font-semibold mb-0.5">Reported by</p>
                    <p className="font-bold text-base text-foreground">{video.reporter || 'News Desk'}</p>
                  </div>
                </div>

                <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none">
                  <p className="text-foreground/90 leading-loose whitespace-pre-wrap font-medium">
                    {video.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 py-6 border-t border-border/50">
                <button 
                  onClick={handleLike} 
                  className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 font-semibold group ${
                    isLiked ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-muted/50 hover:bg-muted text-foreground hover:text-red-500'
                  }`}
                >
                  <motion.div
                    animate={{ 
                      scale: isLiked ? [1, 1.35, 0.85, 1.15, 1] : 1,
                      rotateZ: isLiked ? [0, -15, 15, -5, 0] : 0,
                      y: isLiked ? [0, -3, 0] : 0
                    }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                  >
                    <Heart className={`w-5 h-5 transition-colors duration-200 ${isLiked ? 'text-red-500 fill-red-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.5)]' : 'group-hover:text-red-500'}`} />
                  </motion.div>
                  <span>{video.likesCount || 0} {isLiked ? 'Liked' : 'Likes'}</span>
                </button>
                <button 
                  onClick={handleSave} 
                  className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 font-semibold group ${
                    isSaved ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-muted/50 hover:bg-muted text-foreground hover:text-blue-500'
                  }`}
                >
                  <motion.div
                    animate={{ 
                      scale: isSaved ? [1, 1.35, 0.85, 1.1, 1] : 1,
                      rotateY: isSaved ? [0, 180, 360] : 0,
                      y: isSaved ? [0, -3, 0] : 0
                    }}
                    transition={{ duration: 0.45, type: "spring", stiffness: 260 }}
                  >
                    <Bookmark className={`w-5 h-5 transition-colors duration-200 ${isSaved ? 'text-blue-500 fill-blue-500 drop-shadow-[0_2px_8px_rgba(59,130,246,0.5)]' : 'group-hover:text-blue-500'}`} />
                  </motion.div>
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button className="flex-1 py-3 flex items-center justify-center gap-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-foreground font-semibold">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Comments (Desktop) / Bottom section (Mobile) */}
        {video && !loading && (
          <div className="w-full md:w-[320px] lg:w-[350px] xl:w-[360px] shrink-0 flex flex-col bg-card border-t md:border-t-0 md:border-l border-border/50 md:h-full z-10">
            <div className="p-5 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10">
              <h3 className="font-bold text-xl flex items-center gap-2">
                Comments <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">{comments.length}</span>
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

            {/* Comment Input Sticky at Bottom */}
            {video.commentSettings !== 'off' && (video.commentSettings !== 'staff_only' || isStaff) && (
              <div className="p-5 border-t border-border/50 bg-card/80 backdrop-blur-md mt-auto">
                <form onSubmit={handleCommentSubmit} className="relative flex items-center">
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    className="w-full border-2 border-border focus:border-primary rounded-full py-3.5 pl-5 pr-14 outline-none bg-background text-sm font-medium transition-colors"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    className="absolute right-2 p-2.5 bg-primary text-primary-foreground rounded-full disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all hover:scale-105"
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
