import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, Send, X, Bookmark, Check, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import AdSlot from './ads/AdSlot';
import CommentThread, { buildCommentTree } from './CommentThread';
import SeoHead from './SeoHead';
import FormattedArticleContent from './FormattedArticleContent';
import SafeImage from './common/SafeImage';
import AiSummaryCard from './AiSummaryCard';
import BackstoryCard from './BackstoryCard';
import RelatedNewsSection from './RelatedNewsSection';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function ArticleModal({ articleId, onClose }) {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [relatedNews, setRelatedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const { user } = useAuth();
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isAdmin = user?.roles?.includes('admin');
  const socketRef = useRef(null);
  const contentRef = useRef(null);
  
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);

  const getArticleUrl = (id) => {
    const nextParams = new URLSearchParams(currentSearchParams);
    nextParams.set('articleId', id);
    return `?${nextParams.toString()}`;
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = article ? article.title : 'News Nests Article';
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`Share link: ${shareUrl}`);
    }
  };

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
        setError('');
        setArticle(null);
        const response = await api.get(`/news/article/${articleId}`);
        const art = response.data.article;
        setArticle(art);
        setComments(response.data.comments || []);
        
        if (art) {
          if (art.relatedArticles && art.relatedArticles.length > 0) {
            setRelatedNews(art.relatedArticles);
          } else {
            const { category, tags, _id } = art;
            let queryUrl = `/news/related?articleId=${_id}`;
            if (category) queryUrl += `&category=${category}`;
            if (tags && tags.length > 0) queryUrl += `&tags=${tags.join(',')}`;
            
            try {
              const relatedRes = await api.get(queryUrl);
              setRelatedNews(relatedRes.data);
            } catch (e) {
              console.error('Failed to fetch related news', e);
            }
          }
        }
        
        // Only staff preview custom interstitials
        if (isStaff) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('staff_articles_read_list')) || [];
          } catch {
            readArticles = [];
          }
          
          if (!readArticles.includes(articleId)) {
            readArticles.push(articleId);
            sessionStorage.setItem('staff_articles_read_list', JSON.stringify(readArticles));
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
        console.error('Failed to fetch article', err);
        setError(err.response?.data?.error || 'This article could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();

    return () => {
      socketRef.current.emit('leave_article', articleId);
      socketRef.current.disconnect();
    };
  }, [articleId, isStaff, retryKey]);

  useEffect(() => {
    let timer;
    if (showInterstitial && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showInterstitial, countdown]);

  useEffect(() => {
    if (articleId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [articleId]);

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
      await api.put(`/news/article/${targetId}/save`);
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
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-end"
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
            className="bg-background w-full max-w-3xl mx-auto rounded-none sm:rounded-t-3xl h-full sm:h-[92vh] flex flex-col overflow-hidden shadow-2xl relative border-t border-border/50"
          >
            {/* Sticky Editorial Top Navigation Bar */}
            <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 sticky top-0 bg-background/95 backdrop-blur-md border-b border-border/60 z-20 shadow-xs shrink-0">
              <button 
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-muted/80 hover:bg-muted text-foreground transition-all duration-200 shadow-xs group"
                aria-label="Close Article"
              >
                <span className="text-sm sm:text-base leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                <span>Back</span>
              </button>
              
              <div className="flex items-center space-x-2 sm:space-x-4 text-muted-foreground">
                <button onClick={handleLike} className={`flex items-center space-x-1 p-1.5 transition-colors group ${isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}`} title="Like Article">
                  <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${isLiked ? 'text-red-500 fill-red-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]' : ''}`} />
                  <span className="text-xs sm:text-sm font-semibold">{article?.likesCount || 0}</span>
                </button>
                
                <button onClick={handleSave} className={`p-1.5 transition-colors group ${isSaved ? 'text-blue-500' : 'hover:text-blue-500'}`} title="Bookmark">
                  <Bookmark className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSaved ? 'text-blue-500 fill-blue-500 drop-shadow-[0_2px_8px_rgba(59,130,246,0.4)]' : ''}`} />
                </button>

                <div className="relative flex items-center">
                  <button onClick={handleShare} className="p-1.5 hover:text-primary transition-colors flex items-center justify-center" title="Share Article">
                    {copied ? <Check className="w-5 h-5 text-green-500 animate-in zoom-in-50" /> : <Share2 className="w-5 h-5 hover:scale-110 transition-transform" />}
                  </button>
                  {copied && (
                    <span className="absolute top-9 right-0 text-[10px] bg-red-600 font-mono text-white px-2.5 py-1 rounded shadow-lg z-50 whitespace-nowrap uppercase font-extrabold tracking-wider animate-in fade-in-0 duration-200">
                      ✓ Copied Link!
                    </span>
                  )}
                </div>

                <button 
                  onClick={onClose}
                  className="p-1.5 hover:text-foreground text-muted-foreground transition-colors hidden sm:flex items-center justify-center rounded-full hover:bg-muted" 
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : showInterstitial ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-card text-center relative z-20 overflow-y-auto w-full max-w-full min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">Sponsor Message</h2>
                <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">Your article will load shortly...</p>
                
                <div className={`w-full max-w-2xl bg-black border border-border/80 rounded-xl overflow-hidden flex items-center justify-center mb-6 sm:mb-8 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[360px]'}`}>
                  <AdSlot 
                    position={interstitialType} 
                    className="m-0 w-full h-full" 
                    onAdEmpty={() => setShowInterstitial(false)}
                  />
                </div>
                
                <div className="flex flex-col items-center gap-3.5 w-full max-w-sm">
                  <button 
                    disabled={countdown > 0}
                    onClick={() => setShowInterstitial(false)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all ${countdown > 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'}`}
                  >
                    {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & Read Article'}
                  </button>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-600 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Unable to load this report</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-5">{error}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRetryKey((value) => value + 1)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700"
                  >
                    Try again
                  </button>
                  <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-bold">
                    Close
                  </button>
                </div>
              </div>
            ) : article ? (
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-24 sm:pb-20 custom-scrollbar max-w-full min-w-0" ref={contentRef}>
                
                {/* Category & Read Time Badge */}
                <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4 pt-4 sm:pt-6">
                  <span className="inline-block bg-red-600/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-md font-extrabold text-[11px] sm:text-xs uppercase tracking-wider font-mono border border-red-600/20 shadow-xs">
                    {article.category || 'GLOBAL NEWS'}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold font-sans">
                    {article.readTime || Math.max(2, Math.ceil((article.content?.length || 800) / 600))} min read
                  </span>
                </div>

                {/* Title & Metadata */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-serif leading-snug sm:leading-tight mb-3 sm:mb-4 text-foreground break-words">
                  {article.title}
                </h1>
                {article.subtitle && article.subtitle !== article.title && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                    {article.subtitle}
                  </p>
                )}
                 
                <div className="text-xs sm:text-sm text-muted-foreground font-sans font-medium mb-5 sm:mb-6 pb-3 sm:pb-4 border-b border-border/60 flex items-center gap-x-2 gap-y-1 flex-wrap">
                  <span className="text-foreground font-bold">By {article.author || 'Newsroom Desk'}</span>
                  <span className="opacity-40">•</span>
                   <span>Published {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                   {article.sourceName && (
                     <>
                       <span className="opacity-40">•</span>
                       <span>Source: {article.sourceName}</span>
                     </>
                   )}
                   {(article.city || article.region || (article.country && article.country !== 'global')) && (
                     <>
                       <span className="opacity-40">•</span>
                       <span>{[article.city, article.region, article.country?.toUpperCase()].filter(Boolean).join(', ')}</span>
                     </>
                   )}
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {article.tags.map((tag, idx) => (
                      <span key={idx} className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border border-border/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}


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
                ) : (Array.isArray(article.mediaUrls) ? article.mediaUrls.filter(u => u && !u.includes('unsplash.com')) : []).length > 1 ? (
                  <div className="mb-6 grid gap-4">
                    {(() => {
                      const validMediaUrls = article.mediaUrls.filter(u => u && !u.includes('unsplash.com'));
                      return (
                        <>
                          <figure className="rounded-xl overflow-hidden shadow-sm border border-border/50">
                            <SafeImage 
                              src={validMediaUrls[0].startsWith('http') ? validMediaUrls[0] : `http://localhost:5000/${validMediaUrls[0].replace('\\', '/')}`} 
                              alt={article.title} 
                              allowFallback={false}
                              className="w-full max-h-[400px] object-cover" 
                            />
                          </figure>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {validMediaUrls.slice(1).map((url, idx) => (
                              <figure key={idx} className="rounded-xl overflow-hidden shadow-sm border border-border/50 aspect-[4/3]">
                                <SafeImage 
                                  src={url.startsWith('http') ? url : `http://localhost:5000/${url.replace('\\', '/')}`} 
                                  alt={`${article.title} ${idx + 2}`} 
                                  allowFallback={false}
                                  className="w-full h-full object-cover" 
                                />
                              </figure>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (article.imageUrl || article.mainImageUrl) && !(article.imageUrl || article.mainImageUrl).includes('unsplash.com') ? (
                  <figure className="mb-6 rounded-xl overflow-hidden shadow-sm border border-border/50">
                    <SafeImage 
                      src={article.imageUrl ? (article.imageUrl.startsWith('http') ? article.imageUrl : `http://localhost:5000/${article.imageUrl.replace('\\', '/')}`) : article.mainImageUrl} 
                      alt={article.title} 
                      allowFallback={false}
                      className="w-full h-auto object-cover max-h-[500px]" 
                    />
                  </figure>
                ) : null}

                <AiSummaryCard
                  aiSummary={article.aiSummary}
                  keyTakeaways={article.keyTakeaways}
                  className="mb-6"
                />

                <BackstoryCard 
                  articleId={article.slug || article._id || articleId} 
                  initialBackstoryData={article.backstoryData}
                  initialBackstory={article.backstory}
                  className="mb-6" 
                />

                {/* Structured Editorial Content */}
                <div className="py-2">
                  <FormattedArticleContent 
                    content={
                      (/we use cookies and data/i.test(article.content || '') || /privacytools/i.test(article.content || ''))
                        ? (article.summary || article.subtitle || 'Live field report and wire dispatch. Access the full story at the publisher link below.')
                        : article.content
                    } 
                    author={article.author || 'News Bureau'} 
                    mediaUrls={(Array.isArray(article.mediaUrls) ? article.mediaUrls : []).filter(u => u && !u.includes('unsplash.com'))}
                    category={article.category}
                    subCategory={article.subCategory}
                    country={article.country}
                  />
                </div>

                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:underline"
                  >
                    Read the original report at {article.sourceName || 'the publisher'}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Ad Preview for Staff */}
                {isStaff && (
                  <div className="my-6">
                    <AdSlot position="in-article" className="mb-4" />
                  </div>
                )}


                {/* Past News & Related Coverage Timeline */}
                <RelatedNewsSection 
                  articles={relatedNews.length > 0 ? relatedNews : (article.relatedArticles || [])} 
                  variant="modal" 
                  title="Past News & Related Coverage" 
                  onSelectArticle={(targetId) => {
                    const nextParams = new URLSearchParams(currentSearchParams);
                    nextParams.set('articleId', targetId);
                    navigate(`?${nextParams.toString()}`);
                  }}
                />

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
