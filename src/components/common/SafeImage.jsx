import React, { useState, useEffect } from 'react';

const CATEGORY_FALLBACKS = {
  world: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&h=800&fit=crop",
  politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&h=800&fit=crop",
  business: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop",
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop",
  science: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&h=800&fit=crop",
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=800&fit=crop",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=800&fit=crop",
  esports: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=800&fit=crop",
  entertainment: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop",
  lifestyle: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&h=800&fit=crop",
  in: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&h=800&fit=crop",
  default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=800&fit=crop"
};

export const getCategoryFallback = (category = '', subCategory = '', country = '') => {
  const cat = (category || '').toLowerCase().trim();
  const sub = (subCategory || '').toLowerCase().trim();
  const c = (country || '').toLowerCase().trim();

  if (sub === 'esports') return CATEGORY_FALLBACKS.esports;
  if (c === 'in' && ['world', 'general', 'politics', ''].includes(cat)) {
    return CATEGORY_FALLBACKS.in;
  }
  if (CATEGORY_FALLBACKS[cat]) {
    return CATEGORY_FALLBACKS[cat];
  }
  return CATEGORY_FALLBACKS.default;
};

/**
 * Resilient Image component with:
 * 1. referrerPolicy="no-referrer" to bypass external hotlinking 403 Forbidden blocks.
 * 2. Automatic retry via backend image proxy (/api/news/image-proxy) if direct loading is blocked.
 * 3. Guaranteed graceful fallback to high-resolution category-tailored editorial photography.
 * 4. Smooth opacity transition on load to prevent layout flicker.
 */
export default function SafeImage({
  src,
  alt = 'News Story Image',
  className = 'w-full h-full object-cover',
  category = '',
  subCategory = '',
  country = '',
  loading = 'lazy',
  style = {}
}) {
  const fallbackUrl = getCategoryFallback(category, subCategory, country);
  const initialUrl = (src && src.trim() && src !== 'null' && src !== 'undefined') ? src.trim() : fallbackUrl;

  const [imgSrc, setImgSrc] = useState(initialUrl);
  const [triedProxy, setTriedProxy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync state if src changes
  useEffect(() => {
    const valid = (src && src.trim() && src !== 'null' && src !== 'undefined') ? src.trim() : fallbackUrl;
    setImgSrc(valid);
    setTriedProxy(false);
    setIsLoaded(false);
  }, [src, category, subCategory, country]);

  const handleError = () => {
    // Stage 1: If direct external URL failed and we haven't tried proxy yet, try backend image proxy
    if (!triedProxy && imgSrc && imgSrc.startsWith('http') && !imgSrc.includes('unsplash.com') && !imgSrc.includes('/api/news/image-proxy')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const proxyUrl = `${backendUrl}/api/news/image-proxy?url=${encodeURIComponent(imgSrc)}`;
      setTriedProxy(true);
      setImgSrc(proxyUrl);
      return;
    }

    // Stage 2: If proxy also fails, or URL is invalid, fall back to curated category editorial image
    if (imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-90'} transition-opacity duration-300`}
      style={style}
    />
  );
}
