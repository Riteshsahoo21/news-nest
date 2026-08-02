import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdSlot({ adClient = 'ca-pub-XXXXXXXXXXXXXXXX', adSlot = 'XXXXXXXXXX', format = 'auto', layoutKey, responsive = true, className = '' }) {
  const { user } = useAuth();

  // Hide ads if user is premium OR if they are a staff member (admin, editor, reporter)
  const isAdFree = user?.isPremium || user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));

  useEffect(() => {
    // If the user is premium or staff, we do not initialize the ad.
    if (isAdFree) return;

    try {
      if (window) {
        // Push the ad to the google adsense queue
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e.message);
    }
  }, []); // Remove 'user' from dependency array to prevent multiple pushes

  // If user is premium or staff, render nothing (Ad-free experience)
  if (isAdFree) {
    return null;
  }

  // Google AdSense physically blocks real ads from appearing on 'localhost'.
  // It will always return a blank space or 403 error until deployed to an approved domain.
  // Therefore, in development mode, we show a highly realistic mockup so the UI can be tested.
  const isDev = import.meta.env.DEV;

  return (
    <div className={`ad-container my-6 flex justify-center ${className}`}>
      {isDev ? (
        <div className="w-full relative overflow-hidden group cursor-pointer bg-gray-100 flex items-center justify-center min-h-[250px] shadow-sm border border-gray-200">
          <img 
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800" 
            alt="Advertisement" 
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-bl z-10 font-sans">
            Ad choices
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
          <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
            <span className="bg-red-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 inline-block shadow">Sponsored</span>
            <h4 className="font-bold text-xl leading-tight mb-1 drop-shadow-md">Nike Air Max 2026</h4>
            <p className="text-xs text-gray-200 line-clamp-2 drop-shadow">Experience the next generation of comfort and style. Limited edition available now.</p>
          </div>
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: '250px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-ad-layout-key={layoutKey}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      )}
    </div>
  );
}
