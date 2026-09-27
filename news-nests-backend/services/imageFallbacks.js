/**
 * Curated high-resolution editorial fallback images by category and region.
 */
export const CATEGORY_FALLBACK_IMAGES = {
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

export const getCategoryFallbackImage = (category = '', subCategory = '', country = '') => {
  const cat = (category || '').toLowerCase().trim();
  const sub = (subCategory || '').toLowerCase().trim();
  const c = (country || '').toLowerCase().trim();

  if (sub === 'esports') return CATEGORY_FALLBACK_IMAGES.esports;
  if (c === 'in' && ['world', 'general', 'politics', ''].includes(cat)) {
    return CATEGORY_FALLBACK_IMAGES.in;
  }
  if (CATEGORY_FALLBACK_IMAGES[cat]) {
    return CATEGORY_FALLBACK_IMAGES[cat];
  }
  return CATEGORY_FALLBACK_IMAGES.default;
};
