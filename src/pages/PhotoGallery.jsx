import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Camera } from 'lucide-react';
import api from '../services/api';

export default function PhotoGallery() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1640px] mx-auto px-4 sm:px-6 md:px-10 xl:px-12 py-8 bg-background">
      <div className="flex items-center space-x-3 mb-8">
        <ImageIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Photo Galleries</h1>
      </div>

      {galleries.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No photo galleries available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {galleries.map((gallery) => (
            <Link 
              key={gallery._id} 
              to={`?galleryId=${gallery._id}`}
              className="group flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full"
            >
              <div className="relative aspect-video bg-muted overflow-hidden shrink-0">
                {gallery.photos && gallery.photos.length > 0 ? (
                  <img 
                    src={gallery.photos[0].url} 
                    alt={gallery.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {gallery.category}
                </div>
                
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs font-semibold flex items-center shadow-md">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  {gallery.photos?.length || 0} Photos
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-lg md:text-xl mb-2.5 line-clamp-2 group-hover:text-primary transition-colors text-foreground font-serif leading-snug">
                    {gallery.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {gallery.description}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-4 border-t border-border/60 font-medium">
                  <span className="font-semibold text-primary truncate max-w-[60%]">
                    By {gallery.photographer || 'Anonymous'}
                  </span>
                  <span className="shrink-0 text-foreground/70">
                    {new Date(gallery.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
