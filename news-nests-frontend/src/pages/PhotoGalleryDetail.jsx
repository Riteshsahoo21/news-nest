import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, Image as ImageIcon, Heart, Send, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import AdSlot from '../components/ads/AdSlot';
import CommentThread, { buildCommentTree } from '../components/CommentThread';

const PhotoGalleryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);

  // Fallback mock data matching the screenshot
  const mockGallery = {
    _id: id || 'mock-id',
    title: 'Monsoon Floods in Kerala',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    photographer: 'Rajesh Nair (Associated Press)',
    description: 'Severe monsoon rains trigger flooding across low-lying districts in Kerala. Local volunteers and military rescue teams work to evacuate stranded families.',
    photos: [
      { url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=800' },
      { url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=800' },
      { url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=800' }
    ],
    relatedNews: [
      { title: 'Kerala Floods: Emergency helplines and safety hubs active', url: '#' },
      { title: 'Relief Packages Announced: Government updates rehabilitation funds', url: '#' },
      { title: 'Meteorology warning: Torrential rain forecasts issued for coastal districts', url: '#' }
    ]
  };

  useEffect(() => {
    let socket;
    if (id && id !== 'mock') {
      const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      socket = io(backendUrl);
      socket.emit('join_article', id); // using the same channel as article for simplicity or create join_gallery
      
      socket.on('comment_added', (comment) => {
        setComments((prev) => [comment, ...prev]);
      });
    }

    const fetchGallery = async () => {
      try {
        if (id && id !== 'mock') {
          const response = await api.get(`/photo-galleries/${id}`);
          setGallery(response.data.gallery);
          setComments(response.data.comments || []);
          
          // Only staff preview custom interstitials
          if (isStaff) {
            let readArticles = [];
            try {
              readArticles = JSON.parse(sessionStorage.getItem('staff_gallery_read_list')) || [];
            } catch (e) {
              readArticles = [];
            }
            
            if (!readArticles.includes(id)) {
              readArticles.push(id);
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
        } else {
          setGallery(mockGallery);
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
        // Fallback to mock data if API fails or empty database
        setGallery(mockGallery);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();

    return () => {
      if (socket) {
        socket.emit('leave_article', id);
        socket.disconnect();
      }
    };
  }, [id, isStaff]);

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
    if (!gallery || id === 'mock' || !userId) return;
    try {
      const res = await api.post(`/photo-galleries/${id}/like`);
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
    if (!gallery || id === 'mock' || !userId) return;
    try {
      await api.put(`/photo-galleries/${id}/save`);
      setGallery(prev => {
        const wasSaved = prev.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString());
        const updatedSavedBy = wasSaved 
          ? (prev.savedBy || []).filter(s => (s?._id || s || '').toString() !== userId.toString())
          : [...(prev.savedBy || []), userId];
        return { ...prev, savedBy: updatedSavedBy };
      });
    } catch (err) {
      console.error('Failed to save', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || id === 'mock') return;

    try {
      await api.post(`/photo-galleries/${id}/comments`, { content: newComment });
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleReplySubmit = async (content, parentCommentId) => {
    if (!content.trim() || id === 'mock') return;
    try {
      await api.post(`/photo-galleries/${id}/comments`, { content, parentCommentId });
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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!gallery) return null;

  if (showInterstitial) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white min-h-screen text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Sponsor Message</h2>
        <p className="text-gray-500 mb-8">Your gallery will load shortly...</p>
        
        <div className={`w-full max-w-2xl bg-black border border-gray-100 rounded overflow-hidden flex items-center justify-center mb-8 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[400px]'}`}>
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
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <span className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md">
            Photo Gallery
          </span>
        </div>
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
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {gallery.title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          <span>2 hours ago</span>
          <div className="flex items-center gap-1">
            <ImageIcon className="w-4 h-4" />
            <span>{gallery.photos.length} Photos</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          {/* Photographer - Highlighted in Red */}
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

        {/* Editorial Description */}
        <div className="prose prose-base sm:prose-lg max-w-none mb-8 border-l-4 border-red-600 pl-4 py-2 space-y-4 text-gray-700 leading-relaxed">
          {gallery.description.split('\n\n').map((paragraph, pIdx) => (
            <p key={pIdx} className="leading-relaxed">
              {paragraph.trim()}
            </p>
          ))}
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

        {/* Related News Coverage */}
        {gallery.relatedNews && gallery.relatedNews.length > 0 && (
          <div className="mt-8 mb-12 p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-5 bg-red-600 rounded-sm inline-block"></span>
              Related Coverage & Reports
            </h2>
            <ul className="space-y-3">
              {gallery.relatedNews.map((news, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="text-[#a51a1a] font-bold text-lg leading-none mt-1">•</span>
                  {news.url.startsWith('/') ? (
                    <Link to={news.url} className="text-gray-800 hover:text-red-700 font-semibold transition-colors flex items-center gap-1.5 leading-snug">
                      {news.title}
                    </Link>
                  ) : (
                    <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-red-700 font-semibold transition-colors flex items-center gap-1.5 leading-snug">
                      {news.title} <ExternalLink className="w-3.5 h-3.5 opacity-60 inline" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments Section */}
        {id !== 'mock' && (
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
        )}
      </div>
    </div>
  );
};

export default PhotoGalleryDetail;
