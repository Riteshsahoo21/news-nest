import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GoogleAdSense from './GoogleAdSense';

export default function AdSlot({ position, className = '', onAdEmpty }) {
  const { user } = useAuth();
  const [ad, setAd] = useState(null);
  const [hasViewed, setHasViewed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const adRef = useRef(null);

  // Only staff (admin, editor, reporter) can preview/view custom ads.
  // Custom ads are hidden for normal users (guests and registered users).
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isNormalUser = !isStaff;

  useEffect(() => {
    // Normal users do not receive custom ads; collapse slot cleanly
    if (isNormalUser) {
      setLoading(false);
      if (onAdEmpty) onAdEmpty();
      return;
    }

    let isMounted = true;
    const initAd = async () => {
      try {
        const normalizedPosition = position ? position.replace('-', '_') : '';
        const isVideoInterstitial = normalizedPosition === 'video_interstitial';

        // Check if active house/custom ad exists for this slot (Staff preview only)
        try {
          const res = await api.get(`/ads/serve?position=${normalizedPosition}&t=${Date.now()}`);
          if (isMounted) {
            if (res.data) {
              setAd(res.data);
            } else if (onAdEmpty) {
              onAdEmpty();
            }
          }
        } catch (error) {
          if (isMounted && onAdEmpty) {
            onAdEmpty();
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAd();

    return () => { isMounted = false; };
  }, [position, isNormalUser, onAdEmpty]);

  useEffect(() => {
    if (!ad || hasViewed) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        api.post(`/ads/${ad._id}/view`).catch(() => {});
        setHasViewed(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, [ad, hasViewed]);

  const handleAdClick = (e) => {
    api.post(`/ads/${ad._id}/click`).catch(() => {});
  };

  if (isNormalUser || loading || !ad) return null;

  // Render Custom Ad for Staff (Admin/Editor/Reporter)
  return (
    <div 
      ref={adRef} 
      className={`relative w-full overflow-hidden bg-muted flex items-center justify-center my-4 rounded-xl group ${
        !className.includes('h-') && position !== 'interstitial' ? 'max-h-[140px] sm:max-h-[250px]' : ''
      } ${className}`}
    >
      <span className="absolute top-0 right-0 bg-black/20 text-white text-[10px] uppercase px-2 py-0.5 z-10 backdrop-blur-sm rounded-bl">
        Advertisement Preview (Staff)
      </span>
      <a 
        href={ad.linkUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        onClick={handleAdClick}
        className={`block w-full h-full ${ad.videoUrl ? '' : 'group-hover:scale-105 transition-transform duration-500'}`}
      >
        {(ad.videoUrl && position === 'video_interstitial') ? (
          (ad.videoUrl.includes('youtube.com') || ad.videoUrl.includes('youtu.be')) ? (
            <iframe
              className="w-full h-full pointer-events-none"
              src={`https://www.youtube.com/embed/${
                ad.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?#]+)/)?.[1]
              }?autoplay=1&mute=1&controls=0&loop=1&playlist=${
                ad.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?#]+)/)?.[1]
              }`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          ) : (
            <video 
              src={ad.videoUrl} 
              autoPlay 
              muted 
              loop
              playsInline
              className="w-full h-full object-cover" 
            />
          )
        ) : (
          <img 
            src={ad.imageUrl} 
            alt={ad.title} 
            className="w-full h-full object-cover" 
            onError={(e) => e.currentTarget.style.display = 'none'} 
          />
        )}
      </a>
    </div>
  );
}
