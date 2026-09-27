import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, PlayCircle, Image as ImageIcon, FileText, Radio, Sparkles, TrendingUp } from 'lucide-react';
import api from '../services/api';
import EditorsPick from '../components/home/EditorsPick';
import RelatedNewsSection from '../components/RelatedNewsSection';
import { Input } from '../components/ui/input';

const EMPTY_RESULTS = { news: [], liveBlogs: [], videos: [], photoGalleries: [] };

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [totalMatches, setTotalMatches] = useState(0);
  const [newsPagination, setNewsPagination] = useState({ page: 1, hasMore: false, total: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const latestRequestId = useRef(0);
  const liveRefreshTimer = useRef(null);
  const livePollCount = useRef(0);

  useEffect(() => {
    // Fetch curated search recommendations and trending topics
    const fetchRecommendations = async () => {
      try {
        const res = await api.get('/search/recommendations');
        setRecommendations(res.data.recommendations || []);
        setTrendingTopics(res.data.trendingTopics || []);
      } catch (err) {
        console.error('Error fetching search recommendations:', err);
      }
    };
    fetchRecommendations();
  }, []);
  
  useEffect(() => {
    if (liveRefreshTimer.current) clearTimeout(liveRefreshTimer.current);
    livePollCount.current = 0;
    setRefreshingLive(false);
    if (initialQuery) {
      setQuery(initialQuery);
      fetchResults(initialQuery, 1, false);
    } else {
      latestRequestId.current += 1;
      setResults(EMPTY_RESULTS);
      setTotalMatches(0);
      setNewsPagination({ page: 1, hasMore: false, total: 0 });
    }

    return () => {
      if (liveRefreshTimer.current) clearTimeout(liveRefreshTimer.current);
    };
  }, [initialQuery]);

  const scheduleLiveRefresh = (searchQuery, discovery) => {
    if (discovery?.status !== 'running' || livePollCount.current >= 12) {
      setRefreshingLive(false);
      return;
    }

    setRefreshingLive(true);
    if (liveRefreshTimer.current) clearTimeout(liveRefreshTimer.current);
    liveRefreshTimer.current = setTimeout(() => {
      livePollCount.current += 1;
      fetchResults(searchQuery, 1, false, true);
    }, 2500);
  };

  const fetchResults = async (searchQuery, page = 1, append = false, background = false) => {
    if (!searchQuery.trim()) return;
    const requestId = ++latestRequestId.current;
    try {
      if (!background) setLoading(true);
      if (!background) setError('');
      const res = await api.get('/search', { params: { q: searchQuery.trim(), page, limit: 24 } });
      if (requestId !== latestRequestId.current) return;
      const nextResults = { ...EMPTY_RESULTS, ...(res.data.results || {}) };
      setResults((current) => append
        ? { ...current, news: [...(current.news || []), ...(nextResults.news || [])] }
        : nextResults
      );
      if (res.data.results?.recommendations && res.data.results.recommendations.length > 0) {
        setRecommendations(res.data.results.recommendations);
      }
      setTotalMatches(res.data.totalMatches || 0);
      setNewsPagination(res.data.pagination?.news || { page, hasMore: false, total: nextResults.news.length });
      if (page === 1) scheduleLiveRefresh(searchQuery, res.data.discovery);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      console.error('Search error:', err);
      if (!background) setError('Failed to fetch search results. Please try again.');
      setRefreshingLive(false);
    } finally {
      if (!background && requestId === latestRequestId.current) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleVideoClick = (video) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('videoId', video._id);
    navigate(`/search?${nextParams.toString()}`);
  };

  const totalResults = totalMatches;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 mb-20 md:mb-0">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Search Across Platform</h1>
      </div>

      <form onSubmit={handleSearchSubmit} className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search for articles, videos, or photo galleries..." 
          className="pl-12 h-14 bg-muted border-none rounded-2xl text-lg w-full focus-visible:ring-1 focus-visible:ring-primary"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </form>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm">Searching saved articles...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {refreshingLive && !loading && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground" role="status">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          Saved results are ready. Checking live publishers for newer matches…
        </div>
      )}

      {!loading && !error && initialQuery && (
        <div>
          <p className="text-muted-foreground mb-8 text-center text-lg">
            Found <span className="font-bold text-foreground">{totalResults}</span> result(s) for "<span className="font-bold text-foreground">{initialQuery}</span>"
          </p>
          
          {totalResults > 0 ? (
            <div className="space-y-12">
              
              {/* Articles Section */}
              {results.news && results.news.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <FileText className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">News Articles ({results.news.length})</h2>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <EditorsPick articles={results.news} showSnippet={true} variant="grid-3" />
                  </div>
                </section>
              )}

              {/* Live Blogs Section */}
              {results.liveBlogs && results.liveBlogs.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <Radio className="text-red-600 w-6 h-6" />
                    <h2 className="text-xl font-bold">Live Coverage ({results.liveBlogs.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.liveBlogs.map((blog) => (
                      <Link
                        key={blog._id}
                        to={`/live-blogs?id=${blog._id}`}
                        className="block rounded-xl border border-border bg-card p-5 hover:border-red-500/50 hover:shadow-md transition-all"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600">{blog.category || 'Live'}</span>
                        <h3 className="font-bold mt-2 line-clamp-2">{blog.title}</h3>
                        {blog.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{blog.description}</p>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Videos Section */}
              {results.videos && results.videos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <PlayCircle className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">Video News ({results.videos.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.videos.map((video) => (
                      <div 
                        key={video._id} 
                        className="group cursor-pointer bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
                        onClick={() => handleVideoClick(video)}
                      >
                        <div className="relative aspect-video overflow-hidden bg-black">
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                              <PlayCircle className="w-6 h-6 ml-1" fill="currentColor" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                            {video.duration || '00:00'}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                            {video.category}
                          </div>
                          <h3 className="font-bold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {video.title}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Photo Galleries Section */}
              {results.photoGalleries && results.photoGalleries.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <ImageIcon className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">Photo Galleries ({results.photoGalleries.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.photoGalleries.map((gallery) => (
                      <Link 
                        to={`/photo-gallery/${gallery._id}`}
                        key={gallery._id} 
                        className="group block bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          {(gallery.photos || gallery.images)?.length > 0 ? (
                            <img 
                              src={(gallery.photos || gallery.images)[0].url} 
                              alt={gallery.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                            <ImageIcon className="w-3 h-3" />
                            {gallery.photos?.length || gallery.images?.length || 0} Photos
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                            {gallery.category}
                          </div>
                          <h3 className="font-bold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {gallery.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center py-14 bg-muted/40 rounded-2xl border border-dashed border-border mt-4">
                <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-1">No direct matches found</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                  {refreshingLive
                    ? 'Checking live publishers for newer matches…'
                    : `We couldn't find exact matches for "${initialQuery}". Explore our recommended coverage below:`}
                </p>
                {trendingTopics.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto px-4">
                    {trendingTopics.slice(0, 5).map((topic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuery(topic);
                          navigate(`/search?q=${encodeURIComponent(topic)}`);
                        }}
                        className="text-xs bg-card border border-border px-3 py-1.5 rounded-full hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Stories when search is empty */}
              {recommendations.length > 0 && (
                <RelatedNewsSection 
                  articles={recommendations} 
                  variant="grid" 
                  title="Recommended Stories For You" 
                />
              )}
            </div>
          )}

          {/* Recommended Past Stories when results exist */}
          {totalResults > 0 && recommendations.length > 0 && (
            <RelatedNewsSection 
              articles={recommendations} 
              variant="grid" 
              title="Recommended Companion Stories" 
            />
          )}
        </div>
      )}

      {/* Zero Search State: Show Trending Topics and Recommendations */}
      {!loading && !initialQuery && (
        <div className="space-y-10 mt-6">
          {trendingTopics.length > 0 && (
            <div className="bg-muted/30 border border-border/70 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Trending Discovery Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(topic);
                      navigate(`/search?q=${encodeURIComponent(topic)}`);
                    }}
                    className="text-xs sm:text-sm font-medium bg-card border border-border px-4 py-2 rounded-xl hover:border-primary/60 hover:text-primary transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>{topic}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <RelatedNewsSection 
              articles={recommendations} 
              variant="grid" 
              title="Recommended Coverage For You" 
            />
          )}
        </div>
      )}

      {!loading && initialQuery && newsPagination.hasMore && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={() => fetchResults(initialQuery, newsPagination.page + 1, true)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Load more news ({results.news.length} of {newsPagination.total})
          </button>
        </div>
      )}
    </div>
  );
}
