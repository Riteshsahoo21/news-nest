import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import api from '../services/api';
import { formatViews, timeAgo } from './Videos';

export default function CategoryVideos() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

  useEffect(() => {
    const fetchCategoryVideos = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/videos?category=${categoryId}`);
        setVideos(res.data);
      } catch (err) {
        console.error(err);
        setError(`Failed to fetch ${categoryName} videos.`);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchCategoryVideos();
    }
  }, [categoryId, categoryName]);

  const handleVideoClick = (id) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('videoId', id);
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto md:py-6 pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-4 py-4 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 -ml-1 mr-4 hover:bg-muted rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center pr-8">
          {categoryName} Videos
        </h1>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center text-destructive py-10">{error}</div>
        ) : videos.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No videos found for {categoryName}.
          </div>
        ) : (
          videos.map((video) => (
            <div 
              key={video._id} 
              className="relative flex flex-col w-full bg-card rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-border/50 group hover:shadow-md transition-shadow"
              onClick={() => handleVideoClick(video._id)}
            >
              <div className="relative w-full aspect-video bg-muted flex-shrink-0">
                <img 
                  src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center pl-1 backdrop-blur-sm">
                    <Play className="text-white w-6 h-6 fill-current" />
                  </div>
                </div>
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-white text-[10px] font-medium tracking-wide">
                    {video.duration}
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                    {video.category || 'NEWS'}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base leading-tight text-foreground line-clamp-2 group-hover:text-red-600 transition-colors">
                    {video.title}
                  </h3>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center space-x-2 mt-3">
                  <span>{formatViews(video.views || 0)}</span>
                  <span className="w-1 h-1 bg-muted-foreground/50 rounded-full"></span>
                  <span>{timeAgo(video.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
