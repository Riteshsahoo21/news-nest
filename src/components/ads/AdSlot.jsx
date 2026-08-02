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

  // Determine if user has premium subscription
  // NOTE: We temporarily removed 'admin' from this list so that admins can verify ads are showing correctly on the frontend.
  const isPremium = user?.isPremium || user?.roles?.some(role => ['editor', 'reporter'].includes(role));

  useEffect(() => {
    if (isPremium) return;

    let isMounted = true;
    const initAd = async () => {
      try {
        let siteSettings = null;
        try {
          const settingsRes = await api.get('/settings');
          siteSettings = settingsRes.data;
          if (isMounted) setSettings(siteSettings);
        } catch (e) {
          console.error("Failed to load settings", e);
        }

        const forceAdSense = position === 'in-article' || position === 'in-feed';
        const isVideoInterstitial = position === 'video_interstitial';
        const priority = siteSettings?.adPriority || 'adsense_first';

        // Fetch custom ad if:
        // 1. It is a video interstitial (AdSense does not handle these well)
        // 2. OR priority is custom_first AND we are not forcing AdSense
        const shouldFetchCustomAd = isVideoInterstitial || (!forceAdSense && priority === 'custom_first');

        if (shouldFetchCustomAd) {
          try {
            const res = await api.get(`/ads/serve?position=${position}&t=${Date.now()}`);
            if (isMounted) {
              if (res.data) {
                setAd(res.data);
              } else if (isVideoInterstitial && onAdEmpty) {
                onAdEmpty();
              }
            }
          } catch (error) {
            if (isMounted && isVideoInterstitial && onAdEmpty) {
              onAdEmpty();
            }
          }
        } else {
          // If we are strictly relying on AdSense and it's a video interstitial (which shouldn't happen, but just in case)
          if (isVideoInterstitial && onAdEmpty) {
            onAdEmpty();
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAd();

    return () => { isMounted = false; };
  }, [position, isPremium]);

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

  if (isPremium || loading) return null;

  const forceAdSense = position === 'in-article' || position === 'in-feed';
  const isVideoInterstitial = position === 'video_interstitial';
  const priority = settings?.adPriority || 'adsense_first';

  // Render Custom Ad if we successfully fetched one
  if (ad) {
    return (
      <div 
        ref={adRef} 
        className={`relative w-full overflow-hidden bg-gray-50 flex items-center justify-center my-4 group ${
          !className.includes('h-') && position !== 'interstitial' ? 'max-h-[250px]' : ''
        } ${className}`}
      >
        <span className="absolute top-0 right-0 bg-black/20 text-white text-[10px] uppercase px-2 py-0.5 z-10 backdrop-blur-sm rounded-bl">
          Advertisement
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

  // If no custom ad was fetched, and it's NOT a video interstitial, render Google AdSense
  if (!isVideoInterstitial) {
    return (
      <GoogleAdSense 
        clientId={settings?.adsenseClientId} 
        className={className} 
      />
    );
  }

  return null;
}
