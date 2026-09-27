import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, Image as ImageIcon, Heart, Send, Trash2, Ban } from 'lucide-react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import AdSlot from './ads/AdSlot';
import CommentThread, { buildCommentTree } from './CommentThread';
import SafeImage from './common/SafeImage';

export default function PhotoGalleryModal({ galleryId, onClose }) {
  const [gallery, setGallery] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [relatedNews, setRelatedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!galleryId) return;

    // Prevent scrolling on body when modal is open
    document.body.style.overflow = 'hidden';

    let socket;
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    socket = io(backendUrl);
    socket.emit('join_article', galleryId); // using same channel logic
    
    socket.on('comment_added', (comment) => {
      setComments((prev) => [comment, ...prev]);
    });

    const fetchGallery = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/photo-galleries/${galleryId}`);
        setGallery(response.data.gallery);
        setComments(response.data.comments || []);
        
        if (response.data.gallery) {
          const { category, tags, _id } = response.data.gallery;
          let queryUrl = `/photo-galleries/related?galleryId=${_id}`;
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
            readArticles = JSON.parse(sessionStorage.getItem('staff_gallery_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(galleryId)) {
            readArticles.push(galleryId);
            sessionStorage.setItem('staff_gallery_read_list', JSON.stringify(readArticles));
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
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();

    return () => {
      if (socket) {
        socket.emit('leave_article', galleryId);
        socket.disconnect();
      }
      document.body.style.overflow = 'unset';
    };
  }, [galleryId, isStaff]);

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
  const isLiked = Boolean(userId && gallery?.likes?.some(l => (l?._id || l || '').toString() === userId.toString()));
  const isSaved = Boolean(userId && gallery?.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString()));

  const handleLike = async () => {
    if (!gallery || !userId) return;
    try {
      const res = await api.post(`/photo-galleries/${galleryId}/like`);
      setGallery(prev => {
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
      console.error('Failed to like', err);
    }
  };

  const handleSave = async () => {
    if (!gallery || !userId) return;
    try {
      await api.put(`/photo-galleries/${galleryId}/save`);
      setGallery(prev => {
        const wasSaved = prev.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString());
        const updatedSavedBy = wasSaved 
          ? (prev.savedBy || []).filter(s => (s?._id || s || '').toString() !== userId.toString())
          : [...(prev.savedBy || []), userId];
        return { ...prev, savedBy: updatedSavedBy };
      });
    } catch (err) {
      console.error('Failed to save gallery', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/photo-galleries/${galleryId}/comments`, { content: newComment });
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleReplySubmit = async (content, parentCommentId) => {
    if (!content.trim()) return;
    try {
      await api.post(`/photo-galleries/${galleryId}/comments`, { content, parentCommentId });
    } catch (err) {
      console.error('Failed to post reply', err);
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const res = await api.post(`/comments/${commentId}/like`);
      setComments((prev) => prev.map(c => 
        c._id === commentId ? { ...c, likesCount: res.data.likesCount } : c
      ));
    } catch (err) {
      console.error('Failed to like comment', err);
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

  if (!galleryId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center bg-background md:bg-black/80 md:backdrop-blur-sm md:p-4 overflow-y-auto md:overflow-hidden">
      
      {/* Modal Container */}
      <div className="bg-background w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] md:max-w-[880px] lg:max-w-[920px] md:rounded-2xl md:shadow-2xl overflow-y-auto pb-10 md:pb-0 relative flex flex-col border border-border/40">
        {/* Interstitial Overlay */}
        {showInterstitial && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col items-center justify-center p-4 overflow-y-auto w-full h-full md:rounded-2xl">
          <div className="w-full max-w-2xl bg-gray-50 rounded-xl p-8 text-center flex flex-col items-center shadow-xl border border-gray-200 relative my-auto">
            <h2 className="text-2xl font-bold mb-2">Sponsor Message</h2>
            <p className="text-gray-500 mb-8">Your gallery will load shortly...</p>
            
            <div className={`w-full bg-black border border-gray-100 rounded overflow-hidden flex items-center justify-center mb-8 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[400px]'}`}>
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
                className={`w-full py-3 rounded-lg font-bold transition-all ${countdown > 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & View Gallery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : gallery ? (
        <>
          {/* Top App Bar */}
          <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 md:rounded-t-2xl">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-900" />
              </button>
              <span className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md">
                {gallery.title}
              </span>
            </div>
            {!isAdmin && (
              <button onClick={handleSave} className={`p-2 rounded-full transition-all duration-300 group ${isSaved ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-200 hover:text-blue-500'}`}>
                <motion.div
                  animate={{ 
                    scale: isSaved ? [1, 1.35, 0.85, 1.1, 1] : 1,
                    rotateY: isSaved ? [0, 180, 360] : 0,
                    y: isSaved ? [0, -3, 0] : 0
                  }}
                  transition={{ duration: 0.45, type: "spring", stiffness: 260 }}
                >
                  <Bookmark className={`w-6 h-6 transition-colors duration-200 ${isSaved ? 'text-blue-500 fill-blue-500 drop-shadow-[0_2px_8px_rgba(59,130,246,0.5)]' : 'group-hover:text-blue-500'}`} />
                </motion.div>
              </button>
            )}
          </div>

          <div className="px-4 py-6 flex-1 overflow-y-auto">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {gallery.title}
            </h1>

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              <span>{new Date(gallery.createdAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                <span>{gallery?.photos?.length || 0} Photos</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              {/* Photographer */}
              <span className="text-[#a51a1a] font-medium">
                Photographer: {gallery.photographer || 'Anonymous'}
              </span>

              {/* Like Button */}
              <button onClick={handleLike} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-300 group ${isLiked ? 'bg-red-500/10 text-red-500 font-semibold border border-red-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-red-500'}`}>
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
                <span className="text-sm">{gallery.likesCount || 0}</span>
              </button>
            </div>

            {/* Tags */}
            {gallery.tags && gallery.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {gallery.tags.map((tag, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border border-gray-200">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none mb-10">
              <p className="text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap text-base md:text-lg border-l-4 border-red-600 pl-4 py-1">
                {gallery.description}
              </p>
            </div>

            {/* Dynamically Adjusting Photo Grid */}
            <div className={`grid gap-4 md:gap-6 mb-12 ${gallery.photos?.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {gallery.photos?.map((photo, index) => {
                const isSingle = gallery.photos.length === 1;
                const isFeaturedOdd = !isSingle && gallery.photos.length % 2 === 1 && index === 0;
                return (
                  <div 
                    key={index} 
                    className={`rounded-2xl overflow-hidden bg-muted shadow-md border border-border/60 group/photo relative flex flex-col ${
                      isSingle ? 'col-span-full aspect-[16/10] md:aspect-[16/9] max-h-[600px]' : 
                      isFeaturedOdd ? 'sm:col-span-2 aspect-[16/10] md:aspect-[16/9] max-h-[500px]' : 
                      'col-span-1 aspect-[4/3] sm:aspect-[16/10]'
                    }`}
                  >
                    <img 
                      src={photo.url} 
                      alt={photo.caption || gallery.title} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-105"
                    />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 text-white">
                        <p className="text-xs sm:text-sm font-medium leading-snug drop-shadow-md">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Related News Section */}
            {relatedNews.length > 0 && (
              <div className="mt-10 pt-8 border-t border-border/50 max-w-4xl mx-auto px-4 w-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-red-600 rounded-sm inline-block"></span>
                  Related Photo Galleries
                </h3>
                <div className="flex flex-col space-y-4">
                  {relatedNews.map((news) => (
                    <div key={news._id} className="group relative">
                      <a 
                      key={news._id}
                      href={`?galleryId=${news.slug || news._id}`}
                      className="block group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-red-100 hover:shadow-xl transition-all duration-300"
                      onClick={(e) => {
                          // Handle navigation
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <SafeImage 
                            src={news.imageUrl || news.mainImageUrl} 
                            alt={news.title} 
                            category={news.category}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0" 
                          />
                          <h4 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
                            {news.title}
                          </h4>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="mt-10 pt-8 border-t border-gray-200">
              <h3 className="text-xl font-bold mb-6 text-gray-900">Comments ({comments.length})</h3>
              
              {gallery.commentSettings === 'off' ? (
                <div className="py-4 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-xl mb-8 border border-gray-200">
                  Comments are disabled for this gallery.
                </div>
              ) : gallery.commentSettings === 'staff_only' && !isStaff ? (
                <div className="py-4 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-xl mb-8 border border-gray-200">
                  Only staff members can comment on this gallery.
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className="relative mb-8">
                  <input
                    type="text"
                    placeholder="Add a public comment..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700 transition-colors"
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-5 h-5 fill-current" />
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {buildCommentTree(comments).map((comment) => (
                  <CommentThread
                    key={comment._id}
                    comment={comment}
                    onReplySubmit={handleReplySubmit}
                    onLike={handleCommentLike}
                    onDelete={handleDeleteComment}
                    onBan={handleBanUser}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    currentUser={user}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[50vh] items-center justify-center">
          <p>Gallery not found</p>
        </div>
      )}
      </div>
    </div>
  );
}
