import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, Send, X, Play, Bookmark, Trash2, Ban } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import AdSlot from './ads/AdSlot';
import CommentThread, { buildCommentTree } from './CommentThread';
import SeoHead from './SeoHead';

export default function ArticleModal({ articleId, onClose }) {
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const isAdFree = user?.isPremium || isStaff;
  const socketRef = useRef(null);
  const contentRef = useRef(null);
  
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!articleId) return;
    
    // Connect to Socket.IO server
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    socketRef.current = io(backendUrl);

    socketRef.current.emit('join_article', articleId);

    socketRef.current.on('comment_added', (comment) => {
      setComments((prev) => [comment, ...prev]);
    });

    socketRef.current.on('comment_liked', ({ commentId, likesCount }) => {
      setComments((prev) => prev.map(c => 
        c._id === commentId ? { ...c, likesCount } : c
      ));
    });

    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/news/article/${articleId}`);
        setArticle(response.data.article);
        setComments(response.data.comments || []);
        
        if (!isAdFree) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('free_articles_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(articleId)) {
            readArticles.push(articleId);
            sessionStorage.setItem('free_articles_read_list', JSON.stringify(readArticles));
          }
          
          let readCount = readArticles.length;
          console.log(`[Ad System Modal] User has read ${readCount} unique articles:`, readArticles);

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
        console.error('Failed to fetch article', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();

    return () => {
      socketRef.current.emit('leave_article', articleId);
      socketRef.current.disconnect();
    };
  }, [articleId, isAdFree]);

  useEffect(() => {
    let timer;
    if (showInterstitial && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showInterstitial, countdown]);

  // Handle closing modal when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please sign in to post a comment!');
      return;
    }
    if (!newComment.trim()) return;

    try {
      const targetId = article?._id || articleId;
      await api.post(`/news/article/${targetId}/comments`, { content: newComment });
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
      alert(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const handleReplySubmit = async (content, parentCommentId) => {
    if (!userId) {
      alert('Please sign in to reply!');
      return;
    }
    if (!content.trim()) return;
    try {
      const targetId = article?._id || articleId;
      await api.post(`/news/article/${targetId}/comments`, { content, parentCommentId });
    } catch (err) {
      console.error('Failed to post reply', err);
    }
  };

  const userId = user?._id || user?.id;
  const isLiked = Boolean(userId && article?.likes?.some(l => (l?._id || l || '').toString() === userId.toString()));
  const isSaved = Boolean(userId && article?.savedBy?.some(s => (s?._id || s || '').toString() === userId.toString()));

  const handleLike = async () => {
    if (!userId) {
      alert('Please sign in to like this article!');
      return;
    }
    if (!article) return;
    try {
      const targetId = article._id || articleId;
      const res = await api.post(`/news/article/${targetId}/like`);
      setArticle(prev => {
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
    if (!userId) {
      alert('Please sign in to save this article to your bookmarks!');
      return;
    }
    if (!article) return;
    try {
      const targetId = article._id || articleId;
      const res = await api.put(`/news/article/${targetId}/save`);
      setArticle(prev => {
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

  const handleCommentLike = async (commentId) => {
    try {
      const res = await api.post(`/comments/${commentId}/like`);
      // Update with the exact count from the server to handle toggles correctly
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

  const articleModalSchema = article ? [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title || "News Report",
      "description": (article.metaDescription || article.subtitle || article.content || "Read report on News Nests").toString().replace(/<[^>]*>?/gm, '').substring(0, 160),
      "image": [article.imageUrl || article.thumbnail || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200"],
      "datePublished": article.createdAt || new Date().toISOString(),
      "dateModified": article.updatedAt || new Date().toISOString(),
      "author": [{
        "@type": "Person",
        "name": article.author || "News Desk",
        "url": `${window.location.origin}/author/${article.authorId || 'editorial'}`
      }]
    }
  ] : null;

  return (
    <AnimatePresence>
      {articleId && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end"
          onClick={handleOverlayClick}
        >
          {article && (
            <SeoHead 
              title={`${article.seoTitle || article.title} | News Nests`}
              description={article.metaDescription || article.subtitle || article.content}
              image={article.imageUrl || article.thumbnail}
              type="article"
              publishedTime={article.createdAt}
              modifiedTime={article.updatedAt}
              author={article.author}
              schema={articleModalSchema}
            />
          )}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-background w-full max-w-3xl mx-auto rounded-t-3xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Drag Indicator Header */}
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-background z-10" onClick={onClose}>
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
            </div>

            {loading ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : showInterstitial ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 text-center relative z-20 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-2">Sponsor Message</h2>
                <p className="text-gray-500 mb-8">Your article will load shortly...</p>
                
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
                    {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & Read Article'}
                  </button>
                  {countdown === 0 && (
                    <a href="/subscriptions" className="text-red-600 font-medium hover:underline text-sm">
                      Remove Ads with Premium
                    </a>
                  )}
                </div>
              </div>
            ) : article ? (
              <div className="flex-1 overflow-y-auto px-5 pb-20 custom-scrollbar" ref={contentRef}>
                
                {/* Category & Actions */}
                <div className="flex justify-between items-center mb-4 pt-2">
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded font-bold text-xs uppercase tracking-wider">
                    {article.category}
                  </span>
                  <div className="flex items-center space-x-5 text-muted-foreground">
                    <button onClick={handleLike} className={`flex items-center space-x-1.5 transition-all duration-200 group ${isLiked ? 'text-red-500 font-semibold' : 'hover:text-red-500'}`}>
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
                      <span className="text-sm">{article.likesCount || 0}</span>
                    </button>
                    <button onClick={handleSave} className={`transition-all duration-200 group ${isSaved ? 'text-blue-500' : 'hover:text-blue-500'}`}>
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
                    </button>
                    <button className="hover:text-primary transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Title & Metadata */}
                <h1 className="text-2xl md:text-3xl font-bold font-serif leading-snug mb-3 text-foreground">
                  {article.title}
                </h1>
                
                <div className="text-sm text-muted-foreground mb-6">
                  Published {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {article.readTime || 4} min read
                </div>

                {/* Video Coverage / Main Image */}
                {article.videoUrl ? (
                  <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-border/50 aspect-video relative">
                    {article.videoUrl.includes('youtube.com') || article.videoUrl.includes('youtu.be') ? (
                      <iframe 
                        className="w-full h-full"
                        src={article.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title={article.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video 
                        className="w-full h-full object-cover bg-black"
                        controls
                        src={article.videoUrl}
                        poster={article.imageUrl || undefined}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ) : article.imageUrl ? (
                  <figure className="mb-6 rounded-xl overflow-hidden shadow-sm border border-border/50">
                    <img src={article.imageUrl} alt={article.title} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
                  </figure>
                ) : null}

                {/* Content */}
                <div className="prose prose-lg dark:prose-invert max-w-none text-foreground leading-relaxed text-base md:text-lg space-y-5">
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </div>

                {/* Ad Placeholder */}
                {!isAdFree && (
                  <>
                    <AdSlot position="in-article" className="mb-4" />
                    <div className="my-8 bg-muted/30 border border-border/60 rounded-xl p-4 flex items-center space-x-4 shadow-sm">
                      <div className="bg-muted-foreground/20 text-muted-foreground text-xs px-2 py-0.5 rounded font-bold">AD</div>
                      <div className="font-medium text-sm md:text-base">Upgrade to Premium today for a completely Ad-Free feed.</div>
                    </div>
                  </>
                )}


                {/* Comments Section */}
                <div className="mt-10 pt-8 border-t border-border/50">
                  <h3 className="text-xl font-bold mb-6">Comments ({comments.length})</h3>
                  
                  {article.commentSettings === 'off' ? (
                    <div className="p-4 bg-muted/30 text-center rounded-xl border border-border/50 text-sm font-medium text-muted-foreground mb-8">
                      Comments are disabled for this article.
                    </div>
                  ) : article.commentSettings === 'staff_only' && !isStaff ? (
                    <div className="p-4 bg-muted/30 text-center rounded-xl border border-border/50 text-sm font-medium text-muted-foreground mb-8">
                      Only staff members can comment on this article.
                    </div>
                  ) : (
                    <form onSubmit={handleCommentSubmit} className="relative mb-8">
                      <input
                        type="text"
                        placeholder="Add a public comment..."
                        className="w-full bg-muted/40 border border-border/60 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
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
            ) : (
              <div className="flex-1 flex justify-center items-center text-muted-foreground">
                Article not found.
              </div>
            )}
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
