import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  X, 
  Share2, 
  Bookmark, 
  Clock, 
  Trophy, 
  BarChart2, 
  Send, 
  Trash2, 
  Heart, 
  MessageCircle, 
  ExternalLink, 
  Radio, 
  Image as ImageIcon, 
  CheckCircle2, 
  ArrowLeft,
  ChevronRight,
  Activity,
  Flame,
  Shield,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SeoHead from './SeoHead';

export default function LiveBlogDetailModal({ blogId, isOpen, onClose }) {
  const { user } = useAuth();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeMediaPreview, setActiveMediaPreview] = useState(null);

  useEffect(() => {
    if (!isOpen || !blogId) return;

    fetchBlogData(true);

    // 2-SECOND REAL-TIME POLLING INTERVAL
    const interval = setInterval(() => {
      fetchBlogData(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, blogId]);

  const fetchBlogData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await api.get(`/live-blogs/${blogId}`);
      const data = res.data;
      setBlog(data);

      if (user && data.savedBy) {
        setIsSaved(data.savedBy.some(id => id === user._id || id?.toString() === user._id?.toString()));
      }

      if (user && data.poll && data.poll.votedUsers) {
        const myVote = data.poll.votedUsers.find(v => v.user === user._id || v.user?.toString() === user._id?.toString());
        if (myVote !== undefined && myVote.optionIndex !== undefined) {
          setHasVoted(true);
          setSelectedOpt(myVote.optionIndex);
        }
      }
    } catch (err) {
      console.error('Error fetching live blog details:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) return alert('Please login to bookmark live coverage!');
    try {
      setIsSaved(!isSaved);
      await api.put(`/live-blogs/${blogId}/save`);
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setIsSaved(!isSaved);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog?.title || 'Live Blog Coverage',
        text: blog?.description,
        url: window.location.href
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('📋 Coverage link copied to clipboard!');
    }
  };

  const handleVote = async () => {
    if (!user) return alert('Please login to participate in interactive live polls!');
    if (selectedOpt === null) return alert('Please select a poll option first!');
    try {
      setVoting(true);
      const res = await api.post(`/live-blogs/${blogId}/poll/vote`, { optionIndex: selectedOpt });
      setBlog(prev => ({ ...prev, poll: res.data.poll }));
      setHasVoted(true);
    } catch (err) {
      console.error('Error voting on poll:', err);
      alert(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please login to participate in real-time community discussion!');
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await api.post(`/live-blogs/${blogId}/comments`, { text: commentText.trim() });
      setBlog(prev => ({ ...prev, comments: res.data.comments }));
      setCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to remove this comment from the live stream?')) return;
    try {
      const res = await api.delete(`/live-blogs/${blogId}/comments/${commentId}`);
      setBlog(prev => ({ ...prev, comments: res.data.comments }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  if (!isOpen) return null;

  const getTimeElapsed = (dateString) => {
    if (!dateString) return 'Just now';
    const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getEmbedUrl = (type, url) => {
    if (!url) return null;
    if (type === 'youtube') {
      let videoId = url;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        videoId = match[1];
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&playsinline=1`;
    }
    if (type === 'webrtc') {
      if (url.startsWith('http')) return url;
      return `https://vdo.ninja/?view=${url}&autostart=1&autoplay=1&clean=1&lowlatency=1&buffer=0&playsinline=1`;
    }
    return url;
  };

  const userRoles = user?.roles || [user?.role || ''];
  const canManage = userRoles.some(r => ['admin', 'editor'].includes(r)) || (userRoles.includes('reporter') && user?.canManageLiveBlogs === true);

  const liveBlogSchema = blog ? [
    {
      "@context": "https://schema.org",
      "@type": "LiveBlogPosting",
      "headline": blog.title || "Live Broadcast",
      "description": (blog.description || "Live interactive news event").toString().replace(/<[^>]*>?/gm, ''),
      "coverageStartTime": blog.createdAt || new Date().toISOString(),
      "coverageEndTime": blog.isLive ? undefined : (blog.updatedAt || new Date().toISOString()),
      "url": window.location.href,
      "image": [blog.mainImageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200"],
      "liveBlogUpdate": (blog.updates || []).slice(0, 10).map(u => ({
        "@type": "BlogPosting",
        "headline": u.title || "Live News Update",
        "datePublished": u.createdAt || new Date().toISOString(),
        "dateModified": u.createdAt || new Date().toISOString(),
        "articleBody": (u.content || "").toString().replace(/<[^>]*>?/gm, '')
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "SpeakableSpecification",
      "xpath": [
        "/html/head/title",
        "/html/head/meta[@name='description']/@content"
      ]
    }
  ] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-center items-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      {blog && (
        <SeoHead
          title={`${blog.title || 'LIVE Coverage'} - News Nests`}
          description={blog.description || "Watch active WebRTC journalism broadcast feeds and interactive breaking updates."}
          image={blog.mainImageUrl}
          type="website"
          schema={liveBlogSchema}
        />
      )}
      
      {/* Lightbox for Image zoom */}
      {activeMediaPreview && (
        <div 
          onClick={() => setActiveMediaPreview(null)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={activeMediaPreview} alt="Zoomed view" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <span className="absolute top-4 right-4 bg-black/80 text-white p-2 rounded-full font-mono text-xs">Close [X]</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-slate-900 dark:text-gray-100 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col relative animate-zoomIn transition-colors duration-200">
        
        {/* Top Sticky Command Header */}
        <div className="bg-slate-50/95 dark:bg-[#111827]/95 backdrop-blur-lg px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-40 shadow-xs transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-gray-800/60 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 sm:hidden" />
              <X className="w-6 h-6 hidden sm:block" />
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-xs ${
                blog?.isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-700'
              }`}>
                {blog?.isLive ? '● LIVE STREAM' : '⬛ ARCHIVED'}
              </span>
              <span className="bg-slate-200/80 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-300/80 dark:border-gray-700 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase shrink-0 hidden md:inline-block">
                {blog?.category || 'Coverage'}
              </span>
            </div>

            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-serif truncate hidden sm:block">
              {blog?.title || 'Loading Live Stream...'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {blog?.isLive && (
              <span className="hidden lg:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-mono font-extrabold px-3 py-1 rounded-full shadow-2xs">
                <Activity className="w-3 h-3 animate-pulse text-emerald-600 dark:text-emerald-400" />
                <span>SYNCING EVERY 5S</span>
              </span>
            )}
            
            <button
              onClick={handleToggleBookmark}
              className={`p-2.5 rounded-xl border transition-all ${
                isSaved 
                  ? 'bg-red-600 text-white border-red-500 shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-xs'
              }`}
              title="Bookmark Event"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-xs"
              title="Share Coverage"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - 2 Column Editorial Layout */}
        {loading ? (
          <div className="py-36 text-center flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0b0e14] flex-1">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 rounded-full border-3 border-red-200 dark:border-red-900/40 border-t-red-600 dark:border-t-red-500 animate-spin"></div>
              <Radio className="w-5 h-5 text-red-600 dark:text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-xs font-mono font-bold tracking-widest text-slate-500 dark:text-gray-400 uppercase">Synchronizing Live Stream...</p>
          </div>
        ) : !blog ? (
          <div className="py-20 text-center text-red-600 dark:text-red-400 font-bold font-serif text-lg bg-[#f8f9fa] dark:bg-[#0b0e14] flex-1">Failed to access live editorial coverage.</div>
        ) : (!canManage && blog.isLive === false) ? (
          <div className="py-32 text-center flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0b0e14] flex-1 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-900/10 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-slate-600 dark:text-gray-400 mb-4 shadow-md">
              <Radio className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white mb-2">Live Coverage Has Concluded</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-6">
              This broadcast event has ended and is no longer actively streaming or accessible to the general public. Please return to explore active real-time broadcasts!
            </p>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg hover:shadow-red-600/25 transition-all tracking-wider uppercase font-mono"
            >
              Explore Active Live Streams
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 bg-[#f8f9fa] dark:bg-[#0b0e14] p-4 sm:p-8 transition-colors">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* LIVE VIDEO BROADCAST HERO SHOWCASE (PERMANENTLY MOUNTED FOR ZERO-LATENCY RESUME) */}
              {blog.streamType !== 'none' && blog.streamUrl && (
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-red-600/50 relative group animate-fadeIn">
                  {/* Paused Overlay: Keeps iframe running underneath so unpausing is instantaneous! */}
                  {!blog.isStreamActive ? (
                    <div className="absolute inset-0 bg-[#0f141f]/95 backdrop-blur-md z-30 p-8 text-center flex flex-col items-center justify-center space-y-4 animate-fadeIn">
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Radio className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-lg">
                        <h3 className="text-lg font-bold font-serif text-white">Live Broadcast Temporarily Paused</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-normal">
                          The reporter has temporarily paused or muted the video transmission. The WebRTC connection remains warm in standby—when the stream resumes, video will appear instantly!
                        </p>
                      </div>
                      <button 
                        onClick={() => fetchBlogData(false)}
                        className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                      >
                        <span>● STANDBY ROOM READY (CLICK TO CHECK NOW)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
                      <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                      <span>{blog.streamType === 'youtube' ? 'LIVE ENTERPRISE BROADCAST' : 'LIVE REPORTER CAM (WEBRTC)'}</span>
                    </div>
                  )}

                  <div className="relative w-full aspect-video">
                    <iframe
                      src={getEmbedUrl(blog.streamType, blog.streamUrl)}
                      allow="autoplay; camera; microphone; fullscreen; encrypted-media; speaker; display-capture"
                      className="w-full h-full border-0"
                      title="Live Stream Broadcast"
                    />
                  </div>
                  <div className="bg-gradient-to-t from-black via-gray-950 to-transparent px-6 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 font-mono relative z-20">
                    <span className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sub-second telemetry sync • 100% Zero-Latency & Free CDN Scale
                    </span>
                    <span>Provider: {blog.streamType === 'youtube' ? 'YouTube Live Engine' : 'VDO.Ninja WebRTC Relay'}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: HERO STORY & REAL-TIME TIMELINE BULLETIN FEED */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Story Hero Header */}
                <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono font-bold text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-500 uppercase">
                      <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                      Updated {getTimeElapsed(blog.updatedAt || blog.createdAt)}
                    </span>
                    <span className="bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-gray-700 font-bold">
                      By {blog.author || 'Newsroom Staff'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white font-serif leading-tight tracking-tight">
                    {blog.title}
                  </h1>
                  
                  <p className="text-sm sm:text-base text-slate-700 dark:text-gray-300 leading-relaxed font-normal">
                    {blog.description}
                  </p>

                  {blog.mainImageUrl && (
                    <div 
                      onClick={() => setActiveMediaPreview(blog.mainImageUrl)}
                      className="rounded-2xl overflow-hidden shadow-md max-h-[360px] border border-gray-200 dark:border-gray-800 group relative cursor-pointer"
                    >
                      <img src={blog.mainImageUrl} alt={blog.title} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-white/20 uppercase font-bold">Click to zoom</span>
                      </div>
                    </div>
                  )}

                  {/* Telemetry Footer */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] font-mono font-extrabold text-slate-400 dark:text-gray-500">
                    <span>STREAM ID: #{blog._id.slice(-6).toUpperCase()}</span>
                    <span>{blog.updates?.length || 0} EDITORIAL BULLETINS</span>
                  </div>
                </div>

                {/* Vertical Timeline Feed */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-serif flex items-center gap-2.5 tracking-tight">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse"></span>
                      <span>Live Newsroom Feed</span>
                    </h2>
                    <span className="text-[11px] font-mono font-extrabold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-1 rounded-full uppercase">
                      5s Auto-Refresh
                    </span>
                  </div>

                  {!blog.updates || blog.updates.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 dark:text-gray-500 space-y-3">
                      <Activity className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto animate-pulse" />
                      <p className="text-xs font-mono font-bold uppercase tracking-wider">Awaiting initial broadcast updates...</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-red-500/40 ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-10 py-2">
                      {blog.updates.map((upd, index) => {
                        let bulletinDate = upd.createdAt ? new Date(upd.createdAt) : null;
                        if (!bulletinDate || isNaN(bulletinDate.getTime())) {
                          bulletinDate = new Date(Date.now() - index * 3 * 60 * 1000);
                        } else if (index > 0 && blog.updates[0]?.createdAt) {
                          const firstTime = new Date(blog.updates[0].createdAt).getTime();
                          const thisTime = bulletinDate.getTime();
                          if (Math.abs(firstTime - thisTime) < 5000) {
                            bulletinDate = new Date(firstTime - index * 3 * 60 * 1000);
                          }
                        }
                        const timeStr = bulletinDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                        const isLatest = index === 0 && blog.isLive;

                        return (
                          <div key={upd._id || index} className="relative group">
                            {/* Glowing Timeline node */}
                            <span className={`absolute -left-[33px] sm:-left-[41px] top-1 w-4 h-4 rounded-full border-3 transition-transform group-hover:scale-125 ${
                              isLatest ? 'bg-red-600 border-white dark:border-gray-900 shadow-md animate-pulse' : 'bg-slate-300 dark:bg-gray-700 border-white dark:border-gray-900'
                            }`}></span>

                            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                              <span className="font-mono text-xs font-extrabold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-3 py-1 rounded-lg border border-slate-200/80 dark:border-gray-700 shadow-2xs">
                                {timeStr}
                              </span>
                              {upd.title && (
                                <span className="font-extrabold text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 px-3.5 py-1 rounded-full uppercase tracking-wide shadow-2xs">
                                  {upd.title}
                                </span>
                              )}
                              {isLatest && (
                                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded uppercase font-extrabold">
                                  NEW BULLETIN
                                </span>
                              )}
                            </div>

                            <div className="bg-slate-50 dark:bg-[#161d2a] hover:bg-slate-100/70 dark:hover:bg-gray-800/80 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs transition-all group-hover:border-gray-300 dark:group-hover:border-gray-700">
                              <p className="text-sm sm:text-base text-slate-800 dark:text-gray-200 leading-relaxed whitespace-pre-line font-normal">
                                {upd.content}
                              </p>

                              {upd.imageUrl && (
                                <div 
                                  onClick={() => setActiveMediaPreview(upd.imageUrl)}
                                  className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md max-h-80 cursor-pointer group/img relative"
                                >
                                  <img src={upd.imageUrl} alt="Bulletin image" referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="bg-black/80 text-white text-xs font-mono px-3 py-1 rounded border border-white/20 uppercase font-bold">Zoom Photo</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: WIDGET SIDEBAR (SCOREBOARD, POLL, COMMUNITY CHAT) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. High-Contrast Scoreboard / Live Telemetry Card */}
                {blog.matchStatus && ((blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '') || (blog.matchStatus.customStats && blog.matchStatus.customStats.length > 0) || blog.matchStatus.matchInfo) && (
                  <div className="bg-slate-900 dark:bg-[#090c12] text-white rounded-3xl p-6 shadow-xl border border-slate-800 dark:border-gray-800 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 dark:border-gray-800 pb-3.5 mb-5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
                        <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
                        <span>{blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '' ? 'LIVE MATCH TELEMETRY' : 'LIVE DATA & TELEMETRY'}</span>
                      </div>
                      {blog.matchStatus.matchInfo && (
                        <span className="text-[11px] bg-amber-500/10 text-amber-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase">
                          {blog.matchStatus.matchInfo}
                        </span>
                      )}
                    </div>

                    {blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '' && (
                      <div className="flex items-center justify-between text-center py-2 px-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-extrabold font-serif text-gray-200 truncate mb-1">
                            {blog.matchStatus.team1?.name || 'Team A'}
                          </div>
                          <div className="text-3xl sm:text-5xl font-black text-yellow-400 font-mono tracking-tight shadow-sm">
                            {blog.matchStatus.team1?.score || '0'}
                          </div>
                        </div>
                        
                        <div className="px-3 shrink-0">
                          <span className="text-xs font-mono font-black text-slate-400 dark:text-gray-400 bg-slate-800 dark:bg-gray-800 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-700 dark:border-gray-700 shadow-inner">
                            VS
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-extrabold font-serif text-gray-200 truncate mb-1">
                            {blog.matchStatus.team2?.name || 'Team B'}
                          </div>
                          <div className="text-3xl sm:text-5xl font-black text-yellow-400 font-mono tracking-tight shadow-sm">
                            {blog.matchStatus.team2?.score || '0'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Custom Sport / Event Telemetry Grid */}
                    {blog.matchStatus.customStats && blog.matchStatus.customStats.length > 0 && (
                      <div className={`grid grid-cols-2 gap-2.5 ${blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '' ? 'mt-5 pt-4 border-t border-slate-800 dark:border-gray-800' : ''}`}>
                        {blog.matchStatus.customStats.map((stat, idx) => (
                          <div key={idx} className="bg-slate-800/90 dark:bg-[#121620] rounded-2xl p-3 border border-slate-700/80 dark:border-gray-700/80 shadow-inner flex flex-col justify-between hover:border-amber-500/40 transition-all">
                            <span className="text-[10px] uppercase tracking-widest text-amber-400/90 font-mono font-bold mb-1 truncate block" title={stat.label}>
                              {stat.label}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wide break-words" title={stat.value}>
                              {stat.value || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Interactive Poll Widget */}
                {blog.poll && blog.poll.question && (
                  <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 transition-colors">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white font-serif tracking-tight">
                        <BarChart2 className="w-4 h-4 text-red-600 dark:text-red-500" /> INTERACTIVE READER POLL
                      </div>
                      <span className="text-xs font-mono font-extrabold text-slate-500 dark:text-gray-400">
                        {blog.poll.options?.reduce((acc, curr) => acc + (curr.votes || 0), 0) || 0} VOTES
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-serif leading-snug">{blog.poll.question}</h3>

                    <div className="space-y-3">
                      {blog.poll.options?.map((opt, idx) => {
                        const total = blog.poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0) || 1;
                        const pct = Math.round(((opt.votes || 0) / total) * 100);
                        const isSelected = selectedOpt === idx;

                        return (
                          <div
                            key={idx}
                            onClick={() => { if (!voting) setSelectedOpt(idx); }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                              isSelected ? 'border-red-600 bg-red-50/80 dark:bg-red-950/50 shadow-md' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-slate-50 dark:bg-[#161d2a]'
                            }`}
                          >
                            {hasVoted && (
                              <div
                                className="absolute inset-y-0 left-0 bg-red-100/60 dark:bg-red-900/40 transition-all duration-700 pointer-events-none"
                                style={{ width: `${pct}%` }}
                              ></div>
                            )}

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-red-600 bg-red-600 text-white shadow-xs' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-gray-100 truncate">{opt.text}</span>
                              </div>

                              {hasVoted && (
                                <span className="font-mono font-extrabold text-xs text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 shrink-0 shadow-2xs">
                                  {pct}% ({opt.votes || 0})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!hasVoted ? (
                      <button
                        onClick={handleVote}
                        disabled={voting || selectedOpt === null}
                        className="w-full bg-slate-900 dark:bg-red-600 hover:bg-slate-800 dark:hover:bg-red-500 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all disabled:opacity-40 text-xs uppercase tracking-wider font-mono"
                      >
                        {voting ? 'Submitting Vote...' : 'Lock In Your Vote'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 font-mono">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> Recorded!
                        </span>
                        <button
                          onClick={handleVote}
                          disabled={voting}
                          className="text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors"
                        >
                          Change Vote
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Live Community Discussion & Moderation */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 flex flex-col max-h-[520px] transition-colors">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3.5 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-red-600 dark:text-red-500" /> Live Discussion ({blog.comments?.length || 0})
                    </h3>
                    <span className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-gray-400 uppercase">Real-Time Chat</span>
                  </div>

                  {/* Comment list */}
                  <div className="space-y-4 overflow-y-auto pr-1 flex-1 divide-y divide-gray-100 dark:divide-gray-800 min-h-[160px]">
                    {!blog.comments || blog.comments.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 dark:text-gray-500 text-xs font-mono font-bold uppercase tracking-wider">No discussion messages yet. Be the first to comment!</p>
                    ) : (
                      blog.comments.map((comm) => {
                        const isMyComment = user && (comm.user === user._id || comm.user?.toString() === user._id?.toString());
                        const isStaff = user && user.roles?.some(r => ['admin', 'editor'].includes(r));
                        const isEventHost = user && blog.authorId && (blog.authorId === user._id || blog.authorId?.toString() === user._id?.toString());
                        const canDelete = isMyComment || isStaff || isEventHost;

                        return (
                          <div key={comm._id} className="pt-3.5 flex gap-3 group">
                            <img
                              src={comm.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.userName || 'User')}`}
                              alt={comm.userName}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0 mt-0.5 shadow-2xs"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                                  {comm.userName}
                                  {isEventHost && <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-mono text-[9px] px-1.5 py-0.2 rounded border border-red-200 dark:border-red-900/50 font-extrabold">HOST</span>}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono shrink-0 font-medium">
                                  {new Date(comm.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-normal break-words">{comm.text}</p>
                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-slate-400 dark:text-gray-500 text-[10px] font-mono font-medium">Community</span>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(comm._id)}
                                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 text-[11px] font-mono font-extrabold transition-colors opacity-80 hover:opacity-100"
                                    title="Remove Message"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Comment input box */}
                  <form onSubmit={handlePostComment} className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#161d2a] p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-red-500/60 focus-within:bg-white dark:focus-within:bg-[#19212f] transition-all shrink-0 shadow-2xs">
                    <input
                      type="text"
                      placeholder={user ? "Type live message..." : "Login to post in chat..."}
                      disabled={!user}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 bg-transparent border-0 px-3 text-xs font-medium focus:outline-none text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white p-2.5 rounded-xl shadow-sm transition-all disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* 4. Live Media Gallery Thumbnails */}
                {blog.mediaGallery && blog.mediaGallery.length > 0 && (
                  <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
                      <ImageIcon className="w-4 h-4 text-red-600 dark:text-red-500" /> Stream Gallery ({blog.mediaGallery.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5">
                      {blog.mediaGallery.map((imgUrl, i) => (
                        <div 
                          onClick={() => setActiveMediaPreview(imgUrl)}
                          key={i} 
                          className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-500/60 transition-all shadow-2xs block cursor-pointer group"
                        >
                          <img src={imgUrl} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-95 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Related News Links */}
                {blog.relatedNews && blog.relatedNews.length > 0 && (
                  <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
                      <ExternalLink className="w-4 h-4 text-red-600 dark:text-red-500" /> Related Articles & Background
                    </h3>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {blog.relatedNews.map((rn, idx) => (
                        <Link
                          to={rn.url || '#'}
                          key={idx}
                          onClick={onClose}
                          className="py-3 flex items-center justify-between gap-4 group text-xs font-extrabold text-slate-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors block"
                        >
                          <span className="line-clamp-2">● {rn.title}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
