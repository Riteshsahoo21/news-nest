import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Share2, Check } from 'lucide-react';
import api from '../services/api';

export default function PhotoGallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const response = await api.get('/photo-galleries');
        setGalleries(response.data);
      } catch (error) {
        console.error('Error fetching galleries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleries();
  }, []);

  const handleShare = async (e, gallery) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/photo-gallery?galleryId=${gallery._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: gallery.title,
          text: gallery.description,
          url: url,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopiedId(gallery._id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-background min-h-screen">
      
      {/* Professional Header */}
      <div className="mb-10 border-b border-border/60 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-serif text-foreground tracking-tight">
            In Pictures
          </h1>
          <p className="text-muted-foreground mt-3 font-sans text-lg font-medium max-w-2xl">
            Visual storytelling and photojournalism from around the world.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse flex flex-col border border-border">
              <div className="aspect-[3/2] bg-muted w-full"></div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="h-6 bg-muted w-3/4"></div>
                <div className="h-4 bg-muted w-full"></div>
                <div className="h-4 bg-muted w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20 border border-border bg-muted/10">
          <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-serif text-foreground">No photo galleries available at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {galleries.map((gallery) => (
            <Link 
              key={gallery._id} 
              to={`?galleryId=${gallery._id}`}
              className="group flex flex-col h-full cursor-pointer"
            >
              <div className="relative aspect-[3/2] w-full bg-muted overflow-hidden mb-4 border border-border/50">
                {gallery.photos && gallery.photos.length > 0 ? (
                  <img 
                    src={gallery.photos[0].url} 
                    alt={gallery.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Category tag */}
                <div className="absolute top-0 left-0 bg-red-700 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-widest">
                  {gallery.category || 'Gallery'}
                </div>
                
                {/* Photo Count indicator */}
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 text-white text-[11px] font-semibold flex items-center">
                  <Camera className="w-3 h-3 mr-1.5" />
                  {gallery.photos?.length || 0}
                </div>
              </div>
              
              <div className="flex flex-col flex-1">
                <h3 className="font-bold text-xl mb-2 line-clamp-3 text-foreground font-serif leading-snug group-hover:text-red-700 transition-colors">
                  {gallery.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-serif mb-4 flex-1">
                  {gallery.description}
                </p>
                
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[120px]">
                      By {gallery.photographer || 'News Desk'}
                    </span>
                    <span className="text-border">•</span>
                    <span>{new Date(gallery.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                  </div>
                  
                  {/* Share Button */}
                  <button 
                    onClick={(e) => handleShare(e, gallery)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Share Gallery"
                  >
                    {copiedId === gallery._id ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
