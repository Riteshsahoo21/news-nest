import { useState, useEffect } from 'react';
import { ArrowRight, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function LiveTicker({ fallbackTitle, fallbackLink }) {
  const [liveBlogs, setLiveBlogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const res = await api.get('/live-blogs');
        const blogs = res.data?.data || res.data || [];
        // Filter for active streams or live coverage
        const activeBlogs = Array.isArray(blogs) ? blogs.filter(b => b.isLive !== false) : [];
        if (activeBlogs.length > 0) {
          // Prioritize streams with an active video broadcast
          activeBlogs.sort((a, b) => {
            const aVideo = a.isStreamActive && a.streamType !== 'none' && a.streamUrl ? 1 : 0;
            const bVideo = b.isStreamActive && b.streamType !== 'none' && b.streamUrl ? 1 : 0;
            return bVideo - aVideo;
          });
          setLiveBlogs(activeBlogs);
        }
      } catch (err) {
        console.error('Error fetching live ticker blogs:', err);
      }
    };

    fetchLiveStreams();
    const interval = setInterval(fetchLiveStreams, 10000); // Refresh active stream list every 10s
    return () => clearInterval(interval);
  }, []);

  // Auto cycle through live blogs every 5 seconds if multiple streams are running
  useEffect(() => {
    if (liveBlogs.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % liveBlogs.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [liveBlogs.length]);

  const currentBlog = liveBlogs[currentIndex] || null;
  const displayTitle = currentBlog ? currentBlog.title : fallbackTitle;
  const displayLink = currentBlog ? `/live-blogs?id=${currentBlog.slug || currentBlog._id}` : (fallbackLink || '/live-blogs');
  const hasLiveVideo = currentBlog && currentBlog.isStreamActive && currentBlog.streamType !== 'none' && currentBlog.streamUrl;

  if (!displayTitle) return null;

  return (
    <div className="my-3 sm:my-3.5 w-full max-w-full overflow-hidden min-w-0 animate-fadeIn">
      <Link 
        to={displayLink} 
        className={`group block rounded-2xl p-3 sm:p-3.5 transition-all duration-300 border shadow-md hover:shadow-lg w-full max-w-full overflow-hidden min-w-0 ${
          hasLiveVideo 
            ? 'bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/90 border-red-500/50 hover:border-red-500 text-white shadow-red-950/30' 
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-slate-900 dark:text-white hover:border-red-400'
        }`}
      >
        {/* MOBILE STACKED VIEW (sm:hidden): Guaranteed zero horizontal overflow and super readable */}
        <div className="sm:hidden flex flex-col gap-2 w-full max-w-full overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 w-full max-w-full min-w-0 overflow-hidden">
            {hasLiveVideo ? (
              <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shrink-0 uppercase tracking-wider shadow-md border border-yellow-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>📺 LIVE VIDEO STREAM</span>
              </span>
            ) : (
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg flex items-center shrink-0 uppercase tracking-wider shadow-xs animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></span>
                <span>🔴 LIVE COVERAGE</span>
              </span>
            )}

            {liveBlogs.length > 1 && (
              <div className="flex items-center text-[10px] font-mono text-gray-300 bg-black/30 px-2 py-0.5 rounded-full shrink-0">
                <span>{currentIndex + 1}/{liveBlogs.length} ACTIVE</span>
              </div>
            )}
          </div>
          <p className="font-bold font-serif text-xs sm:text-sm line-clamp-1 w-full max-w-full min-w-0 break-words text-slate-900 dark:text-gray-100 group-hover:text-red-500 transition-colors">
            {displayTitle}
          </p>
        </div>

        {/* DESKTOP HORIZONTAL VIEW (hidden sm:block): Signature single-row ticker */}
        <div className="hidden sm:flex items-center justify-between gap-3 text-sm w-full max-w-full overflow-hidden min-w-0">
          <div className="flex items-center space-x-2.5 overflow-hidden flex-1 min-w-0">
            {hasLiveVideo ? (
              <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0 uppercase tracking-wider shadow-lg animate-pulse border border-yellow-400/30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>📺 LIVE VIDEO STREAM</span>
              </span>
            ) : (
              <span className="bg-red-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center shrink-0 uppercase tracking-wider shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></span>
                <span>🔴 LIVE COVERAGE</span>
              </span>
            )}

            {currentBlog && currentBlog.category && (
              <span className="inline-block bg-black/40 dark:bg-white/10 text-slate-200 border border-white/20 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0">
                {currentBlog.category}
              </span>
            )}

            <span className="font-bold font-serif truncate min-w-0 flex-1 text-slate-900 dark:text-gray-100 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
              {displayTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {liveBlogs.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400 mr-2 bg-black/20 px-2.5 py-0.5 rounded-full">
                <span>{currentIndex + 1}/{liveBlogs.length} ACTIVE</span>
              </div>
            )}
            <span className="flex items-center font-extrabold text-red-600 dark:text-red-400 text-xs whitespace-nowrap group-hover:translate-x-1 transition-transform uppercase font-mono">
              Watch Stream & Updates
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
