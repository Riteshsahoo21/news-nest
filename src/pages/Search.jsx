import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, PlayCircle, Image as ImageIcon, FileText, Clock } from 'lucide-react';
import api from '../services/api';
import EditorsPick from '../components/home/EditorsPick';
import { Input } from '../components/ui/input';
import VideoModal from '../components/VideoModal';

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ news: [], videos: [], photoGalleries: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Video Modal State
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchResults(initialQuery);
    } else {
      setResults({ news: [], videos: [], photoGalleries: [] });
    }
  }, [initialQuery]);

  const fetchResults = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(res.data.results || { news: [], videos: [], photoGalleries: [] });
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch search results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const totalResults = (results.news?.length || 0) + (results.videos?.length || 0) + (results.photoGalleries?.length || 0);

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
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          {error}
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
                    <EditorsPick articles={results.news} showSnippet={true} />
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
                          {gallery.images && gallery.images.length > 0 ? (
                            <img 
                              src={gallery.images[0].url} 
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
                            {gallery.images?.length || 0} Photos
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
            <div className="text-center py-20 bg-muted/50 rounded-2xl border border-dashed border-border mt-4">
              <SearchIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No results found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any articles, videos, or galleries matching your search terms. Try using different keywords.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Video Modal */}
      <VideoModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        video={selectedVideo}
      />
    </div>
  );
}
