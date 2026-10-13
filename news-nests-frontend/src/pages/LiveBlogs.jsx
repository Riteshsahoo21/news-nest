import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Radio, 
  Clock, 
  Bookmark, 
  ChevronRight, 
  Sparkles, 
  Trophy, 
  BarChart2, 
  Filter,
  RefreshCw,
  Loader2,
  Activity,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  MessageCircle,
  CheckCircle,
  Search as SearchIcon,
  X
} from 'lucide-react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import LiveBlogDetailModal from '../components/LiveBlogDetailModal';

export default function LiveBlogs() {
  const { user } = useAuth();
  const { id: routeId } = useParams();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeBlogId, setActiveBlogId] = useState(routeId || searchParams.get('id') || null);
  const [isModalOpen, setIsModalOpen] = useState(!!(routeId || searchParams.get('id')));
  const [savedIds, setSavedIds] = useState([]);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

  const categories = ['All', 'Sports', 'Football', 'Cricket', 'Politics', 'Breaking', 'Technology', 'Entertainment'];

  useEffect(() => {
    fetchBlogs(true);
    const interval = setInterval(() => {
      fetchBlogs(false);
    }, 10000); // Auto-refresh list every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Open modal if URL parameter has ?id=... or route param
  useEffect(() => {
    const targetId = routeId || searchParams.get('id');
    if (targetId) {
      setActiveBlogId(targetId);
      setIsModalOpen(true);
    }
  }, [routeId, searchParams]);

  const [statusTab, setStatusTab] = useState('live'); // 'live' | 'archive'

  const COMPLETE_WORDS = [
    'won by', 'won the', 'match complete', 'complete', 'match over', 'abandoned',
    'match drawn', 'match tied', 'no result', 'game over', 'final result', 'defeated by', 'concluded'
  ];

  const isBlogActive = (b) => {
    if (!b || b.isLive === false) return false;
    const matchInfo = String(b.matchStatus?.matchInfo || '').toLowerCase();
    if (COMPLETE_WORDS.some(w => matchInfo.includes(w))) return false;
    const t1Score = String(b.matchStatus?.team1?.score || '').toLowerCase();
    const t2Score = String(b.matchStatus?.team2?.score || '').toLowerCase();
    if (COMPLETE_WORDS.some(w => t1Score.includes(w) || t2Score.includes(w))) return false;
    if (b.streamType && b.streamType !== 'none' && !b.isStreamActive && (!b.updates || b.updates.length === 0)) {
      return false;
    }
    return true;
  };

  const fetchBlogs = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await api.get('/live-blogs?status=all');
      const list = res.data || [];
      setBlogs(list);
      setLastUpdatedTime(new Date());

      if (user) {
        const mySaved = list.filter(b => b.savedBy && b.savedBy.includes(user._id)).map(b => b._id);
        setSavedIds(mySaved);
      }
    } catch (err) {
      console.error('Error loading live blogs:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleOpenModal = (id) => {
    setActiveBlogId(id);
    setIsModalOpen(true);
    setSearchParams({ id });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveBlogId(null);
    setSearchParams({});
    fetchBlogs(false);
  };

  const handleToggleBookmark = async (e, id) => {
    e.stopPropagation();
    if (!user) return alert('Please login to save live coverage streams!');
    try {
      const isCurrentlySaved = savedIds.includes(id);
      if (isCurrentlySaved) {
        setSavedIds(savedIds.filter(itemId => itemId !== id));
      } else {
        setSavedIds([...savedIds, id]);
      }
      await api.put(`/live-blogs/${id}/save`);
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const userRoles = user?.roles || [user?.role || ''];
  const canBroadcast = userRoles.some(r => ['admin', 'editor'].includes(r)) || (userRoles.includes('reporter') && user?.canManageLiveBlogs === true);

  // Active vs Concluded separation: Ended blogs/streams never appear in the Live feed
  const activeBlogsList = blogs.filter(isBlogActive);
  const concludedBlogsList = blogs.filter(b => !isBlogActive(b));

  const currentTabBlogs = statusTab === 'live' ? activeBlogsList : concludedBlogsList;

  // Flexible category filtering across Sports, Football, Cricket, and custom topics
  const categoryFilteredBlogs = selectedCategory === 'All'
    ? currentTabBlogs
    : currentTabBlogs.filter(b => {
        const catLower = (b.category || '').toLowerCase();
        const tagsLower = Array.isArray(b.tags) ? b.tags.map(t => String(t).toLowerCase()) : [];
        const combinedText = `${b.title || ''} ${b.description || ''} ${b.matchStatus?.matchInfo || ''}`.toLowerCase();

        if (selectedCategory === 'Sports') {
          return catLower === 'sports' || catLower === 'cricket' || catLower === 'football' || tagsLower.includes('sports');
        }
        if (selectedCategory === 'Football') {
          return catLower === 'football' || tagsLower.includes('football') || tagsLower.includes('soccer') ||
            /\b(football|soccer|premier league|champions league|uefa|fifa|la liga|serie a|arsenal|chelsea|liverpool|manchester|real madrid|barcelona)\b/i.test(combinedText);
        }
        if (selectedCategory === 'Cricket') {
          return catLower === 'cricket' || tagsLower.includes('cricket') ||
            /\b(cricket|test|odi|t20|cricbuzz|ipl|bcci|icc|u19|wicket|over|innings)\b/i.test(combinedText) ||
            (b.externalMatchId && b.externalMatchId.startsWith('cric_'));
        }
        return catLower === selectedCategory.toLowerCase() || tagsLower.includes(selectedCategory.toLowerCase());
      });

  // Dynamic Real-Time Search Query Filter (Searches "everytime" the user types)
  const filteredBlogs = !searchQuery.trim()
    ? categoryFilteredBlogs
    : categoryFilteredBlogs.filter(b => {
        const q = searchQuery.toLowerCase().trim();
        const title = (b.title || '').toLowerCase();
        const desc = (b.description || '').toLowerCase();
        const cat = (b.category || '').toLowerCase();
        const author = (b.author || '').toLowerCase();
        const t1Name = (b.matchStatus?.team1?.name || '').toLowerCase();
        const t2Name = (b.matchStatus?.team2?.name || '').toLowerCase();
        const matchInfo = (b.matchStatus?.matchInfo || '').toLowerCase();
        const tags = Array.isArray(b.tags) ? b.tags.join(' ').toLowerCase() : '';
        const customStats = Array.isArray(b.matchStatus?.customStats)
          ? b.matchStatus.customStats.map(s => `${s.label} ${s.value}`).join(' ').toLowerCase()
          : '';
        const updatesText = Array.isArray(b.updates)
          ? b.updates.slice(0, 15).map(u => `${u.title} ${u.content}`).join(' ').toLowerCase()
          : '';

        return (
          title.includes(q) ||
          desc.includes(q) ||
          cat.includes(q) ||
          author.includes(q) ||
          t1Name.includes(q) ||
          t2Name.includes(q) ||
          matchInfo.includes(q) ||
          tags.includes(q) ||
          customStats.includes(q) ||
          updatesText.includes(q)
        );
      });

  const getTimeElapsed = (dateString) => {
    if (!dateString) return 'Just now';
    const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  // Sort live streams to appear first for editorial presentation
  const sortedBlogs = [...filteredBlogs].sort((a, b) => {
    const aLive = isBlogActive(a);
    const bLive = isBlogActive(b);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0f172a] min-h-screen pb-24 text-slate-800 dark:text-gray-100 font-sans selection:bg-red-600 selection:text-white transition-colors duration-200">
      
      {/* 1. Newsroom Broadcast Telemetry Header */}
      <div className="bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800 relative overflow-hidden transition-colors duration-200">
        {/* Subtle decorative glow effects */}
        <div className="absolute -top-48 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-[90px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider uppercase bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <span className="w-2 h-2 rounded-full bg-red-600 absolute"></span>
                <span className="font-extrabold">Real-Time Newsroom Desk</span>
                <span className="text-red-300 dark:text-red-600">•</span>
                <span className="text-slate-600 dark:text-gray-300 font-medium">Updated {getTimeElapsed(lastUpdatedTime)}</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-slate-950 dark:text-white tracking-tight font-serif">
                Live Coverage <span className="text-red-600 dark:text-red-500">&</span> Streams
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300 max-w-2xl font-normal leading-relaxed">
                Experience unfolding world events, thrilling sports matches, and political analysis with continuous instant bulletins, interactive reader polls, and live score telemetry.
              </p>
            </div>

            {canBroadcast && (
              <div className="shrink-0">
                <Link
                  to="/live-blog-studio"
                  className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-4 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all border border-red-700/20"
                >
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Enter Broadcast Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Live vs Concluded Navigation Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-200 dark:border-gray-800 pt-6">
            <button
              onClick={() => setStatusTab('live')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all shadow-xs ${
                statusTab === 'live'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25 ring-2 ring-red-500/50 scale-102'
                  : 'bg-gray-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusTab === 'live' ? 'bg-white animate-ping' : 'bg-red-500'}`}></span>
              <span>Live Streams ({activeBlogsList.length})</span>
            </button>

            <button
              onClick={() => setStatusTab('archive')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all shadow-xs ${
                statusTab === 'archive'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md ring-2 ring-slate-700/50 scale-102'
                  : 'bg-gray-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Concluded Archives ({concludedBlogsList.length})</span>
            </button>
          </div>

          {/* Sleek Category Filter Bar */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-2">
            <span className="text-xs font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1.5 shrink-0 font-mono">
              <Filter className="w-3.5 h-3.5 text-red-600 dark:text-red-500" /> TOPICS:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-red-600 text-white shadow-md border border-slate-900 dark:border-red-500 scale-105'
                    : 'bg-white dark:bg-gray-800/80 text-slate-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:text-slate-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Real-time Live Coverage Search Bar */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="w-4 h-4 text-slate-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search live matches, teams, venues, or commentary..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-gray-400">
                <span>Found <strong className="text-red-600 dark:text-red-400">{sortedBlogs.length}</strong> matching "{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-red-600 dark:text-red-400 hover:underline cursor-pointer ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Live Coverage Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {loading ? (
          <div className="py-32 text-center flex flex-col items-center justify-center">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-red-200 dark:border-red-900/40 border-t-red-600 dark:border-t-red-500 animate-spin"></div>
              <Radio className="w-6 h-6 text-red-600 dark:text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-sm font-extrabold tracking-widest text-slate-500 dark:text-gray-400 uppercase font-mono">Synchronizing Live Telemetry...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 p-16 text-center max-w-xl mx-auto my-12 shadow-md">
            <Radio className="w-16 h-16 text-red-600/30 dark:text-red-500/30 mx-auto mb-5 animate-pulse" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-serif mb-2">
              {searchQuery.trim() 
                ? `No live coverage found for "${searchQuery}"`
                : statusTab === 'live' ? 'No Active Live Streams' : 'No Concluded Events Found'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-300 mb-6 leading-relaxed">
              {searchQuery.trim()
                ? 'Try searching by a different team name (e.g. India, Australia, Arsenal), tournament, or stadium.'
                : statusTab === 'live' 
                  ? 'All live broadcasts have concluded. Our autonomous scanner monitors outside world cricket, sports, and breaking feeds continuously every 60 seconds.'
                  : 'No archived events found matching this topic filter.'}
            </p>
            {searchQuery.trim() ? (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Clear Search
              </button>
            ) : (statusTab === 'live' && concludedBlogsList.length > 0) ? (
              <button
                onClick={() => setStatusTab('archive')}
                className="bg-slate-900 dark:bg-red-600 hover:bg-slate-800 dark:hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl transition-all shadow-sm"
              >
                View Concluded Coverage ({concludedBlogsList.length})
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${statusTab === 'live' ? 'bg-red-600 dark:bg-red-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {statusTab === 'live' ? 'Active Newsroom Streams & Coverage' : 'Concluded Archives & Past Coverage'}
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400 uppercase">
                {sortedBlogs.length} {statusTab === 'live' ? 'STREAMS ACTIVE' : 'EVENTS RECORDED'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {sortedBlogs.map((blog) => {
                const isSaved = savedIds.includes(blog._id);
                const isLive = isBlogActive(blog);
                const latestBulletin = blog.updates && blog.updates.length > 0 ? blog.updates[0] : null;

                return (
                  <div
                    key={blog._id}
                    onClick={() => handleOpenModal(blog._id)}
                    className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 hover:border-red-500/40 dark:hover:border-red-500/60 hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full justify-between cursor-pointer group hover:-translate-y-1.5 shadow-md"
                  >
                    <div className="flex-1 flex flex-col">
                      {/* Image Header */}
                      <div className="h-56 shrink-0 relative overflow-hidden bg-slate-100 dark:bg-[#0b0e14]">
                        {blog.mainImageUrl && !blog.mainImageUrl.includes('unsplash.com') ? (
                          <img
                            src={blog.mainImageUrl}
                            alt={blog.title}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-400 p-6 text-center select-none">
                            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-3 shadow-inner">
                              <Radio className={`w-6 h-6 ${isLive ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
                            </div>
                            <span className="text-[11px] font-mono font-extrabold tracking-widest uppercase text-slate-200">
                              {blog.category?.toUpperCase() || 'EDITORIAL'} {isLive ? 'LIVE DESK' : 'ARCHIVE'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans mt-1">Real-Time Newsroom Telemetry</span>
                          </div>
                        )}

                        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10 max-w-[80%]">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold shadow-md uppercase tracking-wider ${
                            isLive ? 'bg-red-600 text-white animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.5)]' : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}>
                            {isLive ? '● LIVE COVERAGE' : '⬛ ARCHIVED'}
                          </span>
                          <span className="bg-black/70 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                            {blog.category}
                          </span>
                          {blog.isStreamActive && blog.streamType !== 'none' && blog.streamUrl && (
                            <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xl flex items-center gap-1 animate-pulse border border-yellow-400/30">
                              <span>📺 LIVE VIDEO ON</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleToggleBookmark(e, blog._id)}
                          className={`absolute top-4 right-4 p-2.5 rounded-xl backdrop-blur-md border transition-all z-10 ${
                            isSaved ? 'bg-red-600 text-white border-red-500 shadow-md' : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                          }`}
                          title="Bookmark Stream"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                            <span>{getTimeElapsed(blog.updatedAt || blog.createdAt)}</span>
                            <span>•</span>
                            <span className="text-slate-800 dark:text-gray-200 font-extrabold">{blog.updates?.length || 0} BULLETINS</span>
                          </div>

                          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg font-serif line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-snug">
                            {blog.title}
                          </h2>

                          <p className="text-slate-600 dark:text-gray-300 text-xs line-clamp-3 leading-relaxed font-normal">
                            {blog.description}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          {/* Live metrics widgets & telemetry badge */}
                          {((blog.matchStatus && ((blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '') || blog.matchStatus.matchInfo || (blog.matchStatus.customStats && blog.matchStatus.customStats.length > 0))) || (blog.poll && blog.poll.question)) && (
                            <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800/80">
                              {blog.matchStatus && blog.matchStatus.team1?.name && blog.matchStatus.team1.name.trim() !== '' && (
                                <span className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-[#0b0e14] text-amber-400 border border-slate-800 dark:border-gray-700 text-[11px] font-mono font-extrabold px-2.5 py-1 rounded-lg shadow-2xs">
                                  <Trophy className="w-3 h-3 text-yellow-400" />
                                  {blog.matchStatus.team1?.name} {blog.matchStatus.team1?.score} - {blog.matchStatus.team2?.score} {blog.matchStatus.team2?.name}
                                </span>
                              )}
                              {blog.matchStatus && (!blog.matchStatus.team1?.name || blog.matchStatus.team1.name.trim() === '') && blog.matchStatus.matchInfo && (
                                <span className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[11px] font-mono font-extrabold px-2.5 py-1 rounded-lg shadow-2xs">
                                  <Trophy className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                  {blog.matchStatus.matchInfo}
                                </span>
                              )}
                              {blog.matchStatus?.customStats && blog.matchStatus.customStats.slice(0, 2).map((stat, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-mono font-bold px-2 py-1 rounded-lg truncate max-w-[160px]" title={`${stat.label}: ${stat.value}`}>
                                  <span className="text-amber-700 dark:text-amber-400 font-extrabold">{stat.label}:</span> {stat.value}
                                </span>
                              ))}
                              {blog.poll && blog.poll.question && (
                                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                                  <BarChart2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  Live Poll Active
                                </span>
                              )}
                            </div>
                          )}

                          {/* Latest Bulletin Preview */}
                          {latestBulletin && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 flex items-center gap-2 text-xs text-slate-800 dark:text-gray-200">
                              <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 shrink-0 animate-pulse"></span>
                              <span className="font-serif font-bold truncate">{latestBulletin.title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 shrink-0 bg-slate-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:bg-slate-100/70 dark:group-hover:bg-gray-800/70 transition-colors">
                      <span className="flex items-center gap-2">
                        {isLive && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 animate-ping"></span>
                            <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 absolute"></span>
                          </>
                        )}
                        <span className={`uppercase font-mono tracking-wider text-[11px] ${isLive ? 'ml-4 text-red-600 dark:text-red-400 font-black' : 'text-slate-600 dark:text-gray-400'}`}>
                          {isLive ? 'Join Live Stream' : 'View Archive'}
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Interactive Detail Modal (Triggered by click) */}
      <LiveBlogDetailModal
        blogId={activeBlogId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
