import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import LiveTicker from '../components/home/LiveTicker';
import BreakingNewsCarousel from '../components/home/BreakingNewsCarousel';
import CategoryPills from '../components/home/CategoryPills';
import CountryFilterPills from '../components/home/CountryFilterPills';
import EditorsPick from '../components/home/EditorsPick';
import RecommendedCarousel from '../components/home/RecommendedCarousel';
import FeaturedVideoCarousel from '../components/home/FeaturedVideoCarousel';
import NewsletterSignup from '../components/NewsletterSignup';
import AdSlot from '../components/ads/AdSlot';
import TrendingStories from '../components/home/TrendingStories';
import { useAuth } from '../context/AuthContext';
import SeoHead from '../components/SeoHead';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [coordinates, setCoordinates] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(false);

  const getLocaleCountry = () => {
    if (typeof navigator === 'undefined') return '';
    const match = (navigator.language || '').match(/-([A-Za-z]{2})$/);
    return match ? match[1].toLowerCase() : '';
  };

  const requestLocalNews = () => {
    if (coordinates) {
      setSelectedRegion('nearby');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Location is not supported by this browser. Choose a country instead.');
      return;
    }

    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: Number(coords.latitude.toFixed(4)),
          longitude: Number(coords.longitude.toFixed(4))
        });
        setSelectedRegion('nearby');
        setLocating(false);
      },
      (error) => {
        const message = error.code === 1
          ? 'Location permission was denied. Allow it in your browser or choose a country.'
          : 'Your location could not be detected. Please try again or choose a country.';
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
    );
  };

  const handleRegionSelect = (filterId) => {
    setLocationError('');
    if (filterId === 'nearby') {
      requestLocalNews();
      return;
    }
    setSelectedRegion(filterId);
  };
  
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['news', 'latest', 50, selectedRegion, coordinates?.latitude, coordinates?.longitude],
    queryFn: async () => {
      if (selectedRegion === 'nearby') {
        try {
          const res = await api.get('/news/local', {
            params: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              country: getLocaleCountry(),
              limit: 50
            }
          });
          return res.data;
        } catch {
          const fallbackCountry = getLocaleCountry();
          const fallbackRes = await api.get('/news', {
            params: { limit: 50, ...(fallbackCountry ? { country: fallbackCountry } : {}) }
          });
          return {
            articles: fallbackRes.data.data || fallbackRes.data || [],
            locationError: 'Exact regional lookup is temporarily unavailable; showing the closest country feed.'
          };
        }
      }

      let endpoint = '/news?limit=50';
      if (selectedRegion === 'esports') {
        endpoint += '&subCategory=esports';
      } else if (selectedRegion !== 'all') {
        endpoint += `&country=${selectedRegion}`;
      }
      const res = await api.get(endpoint);
      return { articles: res.data.data || res.data || [] };
    },
    enabled: selectedRegion !== 'nearby' || Boolean(coordinates),
  });

  useEffect(() => {
    if (data?.location) setLocationInfo(data.location);
    if (data?.locationError) setLocationError(data.locationError);
  }, [data?.location, data?.locationError]);

  useEffect(() => {
    setLocalExpanded(false);
  }, [selectedRegion, coordinates?.latitude, coordinates?.longitude]);

  const articles = data?.articles || [];
  const error = isError ? 'Failed to fetch latest news.' : null;

  // Prepare complete editorial pool without dropping articles
  const allReturnedArticles = Array.isArray(articles) ? articles : [];
  const isNearbyView = selectedRegion === 'nearby';
  const exactCount = Number.isFinite(data?.exactMatches) ? data.exactMatches : 0;
  const localArticles = Array.isArray(data?.localArticles)
    ? data.localArticles
    : allReturnedArticles.slice(0, exactCount);
  const fallbackArticles = Array.isArray(data?.fallbackArticles)
    ? data.fallbackArticles
    : allReturnedArticles.slice(exactCount);
  // Local mode never mixes national/global fallbacks into its Odisha/city
  // carousels or View More grid. Fallback coverage remains separately labeled.
  const safeArticles = isNearbyView ? localArticles : allReturnedArticles;
  const visibleLocalArticles = localExpanded ? localArticles : localArticles.slice(0, 4);
  const localRegionLabel = locationInfo?.region || locationInfo?.city || 'Regional';
  
  // Breaking news banner
  const breakingNews = safeArticles.slice(0, 3);
  
  // Sort by popularity and engagement
  const sortedByViews = [...safeArticles].sort((a, b) => (b.views || 0) - (a.views || 0));
  
  // 2 Editor's Picks as requested
  const editorPicks = sortedByViews.slice(0, 2);
  
  // Trending Stories for sidebar (Next 7 most viral)
  const trendingNews = sortedByViews.slice(1, 8);
  
  // Recommended for you (Broad collection for scrolling carousel)
  const recommendedNews = sortedByViews.slice(2, 18);
  
  // Latest News Reports (Comprehensive chronologically sorted list)
  const latestNews = [...safeArticles]
    .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
    .slice(0, 24);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-10 font-medium">{error}</div>
    );
  }

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "name": "News Nests",
    "url": window.location.origin,
    "logo": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600",
    "description": "Next-generation real-time journalism, live WebRTC interactive streaming, and investigative news repository.",
    "sameAs": [
      "https://twitter.com/NewsNests",
      "https://facebook.com/NewsNests",
      "https://youtube.com/NewsNests"
    ]
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 md:pb-24 pt-2 md:py-8 px-3.5 sm:px-6 lg:px-8 bg-background overflow-hidden min-w-0">
      <SeoHead 
        title="News Nests - Real-Time Journalism & Live WebRTC News Streams"
        description="Breaking headline news, interactive live blog coverage, in-depth politics and sports commentary, and community journalism."
        type="website"
        schema={orgSchema}
      />
      {isStaff && (
        <div className="mb-4 sm:mb-6 w-full max-w-full min-w-0">
          <AdSlot position="leaderboard" />
        </div>
      )}
      
      <LiveTicker fallbackTitle="Explore Real-Time Newsroom Streams & Live Event Coverage" />
      
      {/* Top Section: Hero + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mt-4 sm:mt-6 w-full max-w-full min-w-0">
        
        {/* Main Hero & Content Column */}
        <div className="lg:col-span-8 w-full max-w-full min-w-0 space-y-8 sm:space-y-10">
          
          <div>
            <BreakingNewsCarousel articles={breakingNews} />
            
            {/* Country & Region Filter Bar */}
            <div className="mt-4 sm:mt-5">
              <CountryFilterPills
                selectedFilter={selectedRegion}
                onSelectFilter={handleRegionSelect}
                locationLabel={locationInfo?.city || locationInfo?.region || ''}
                locating={locating}
              />
              {locationError && (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400" role="status">
                  {locationError}
                </p>
              )}
              {selectedRegion === 'nearby' && locationInfo?.label && (
                <p className="mt-2 text-xs text-muted-foreground" role="status">
                  Showing {safeArticles.length} local and regional report{safeArticles.length === 1 ? '' : 's'} for {locationInfo.label}.
                </p>
              )}
            </div>

            <div className="mt-2.5 sm:mt-3">
              <CategoryPills 
                selectedCategory="all"
                onSelectCategory={(cat) => {
                  if (cat._id !== 'all') {
                    navigate(`/category/${encodeURIComponent(cat.name.toLowerCase())}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Nearby reporting stays location-specific, including View More. */}
          {isNearbyView && visibleLocalArticles.length > 0 && (
            <section className="pt-1 sm:pt-2">
              <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5 border-b border-border/60 pb-2.5 sm:pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0" />
                    <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground truncate">
                      {localRegionLabel} News
                    </h3>
                  </div>
                  <p className="mt-1.5 ml-4 sm:ml-5 text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    Verified reporting for {locationInfo?.city || localRegionLabel} and {localRegionLabel}
                  </p>
                </div>
              </div>
              <EditorsPick articles={visibleLocalArticles} showSnippet={true} variant="grid-4" />
              {localArticles.length > 4 && (
                <div className="flex justify-center mt-5">
                  <button
                    type="button"
                    onClick={() => setLocalExpanded((expanded) => !expanded)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-600/30 bg-red-600/5 px-5 py-2.5 text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                  >
                    {localExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {localExpanded ? 'Show fewer stories' : `View more ${localRegionLabel} news`}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Recommended For You */}
          {!isNearbyView && recommendedNews.length > 0 && (
            <section className="pt-1 sm:pt-2">
              <RecommendedCarousel articles={recommendedNews} />
            </section>
          )}

          {/* Advertisement (Staff Preview) */}
          {isStaff && (
            <div className="py-1 sm:py-2">
              <AdSlot position="in-feed" />
            </div>
          )}

          {/* Editor's Spotlight (2 Featured Articles) */}
          {editorPicks && editorPicks.length > 0 && (
            <section className="pt-1 sm:pt-2 w-full max-w-full min-w-0">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 border-b border-border/60 pb-2.5 sm:pb-3">
                <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0"></span>
                <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground truncate">
                  Editor's Spotlight
                </h3>
              </div>
              <EditorsPick articles={editorPicks} showSnippet={true} variant="grid-2" />
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8 mt-4 lg:mt-0 w-full max-w-full min-w-0">
          <TrendingStories articles={trendingNews} />
          
          <div className="bg-card rounded-2xl p-1 shadow-sm border border-border/50 w-full max-w-full min-w-0">
            <NewsletterSignup variant="sidebar" />
          </div>
          
          {isStaff && (
            <div className="w-full pt-4 lg:sticky lg:top-24">
               <AdSlot position="sidebar" className="m-0 shadow-sm rounded-2xl overflow-hidden border border-border/50 w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Full Width Sections: Utilizing entire layout horizon with zero empty sidebar voids */}
      <div className="mt-10 sm:mt-14 space-y-10 sm:space-y-14 w-full max-w-full min-w-0">
        {/* Featured Video Broadcast */}
        <section className="w-full max-w-full min-w-0">
          <FeaturedVideoCarousel />
        </section>

        {/* Latest Reports (Full-Width 4-Column Journalism Wire Grid) */}
        {latestNews.length > 0 && (
          <section className="w-full max-w-full min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 border-b border-border/60 pb-2.5 sm:pb-3">
              <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-red-600 rounded-sm shrink-0"></span>
              <h3 className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground truncate">
                Latest Reports & Wire Dispatches
              </h3>
            </div>
            <EditorsPick articles={latestNews} showSnippet={true} variant="grid-4" />
          </section>
        )}

        {isNearbyView && fallbackArticles.length > 0 && (
          <section className="w-full max-w-full min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 border-b border-border/60 pb-2.5 sm:pb-3">
              <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-muted-foreground/50 rounded-sm shrink-0" />
              <div>
                <h3 className="text-base sm:text-xl font-black uppercase tracking-tight font-serif text-foreground">
                  More from {locationInfo?.country || 'your country'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Country-level fallback coverage, kept separate from {localRegionLabel} news.</p>
              </div>
            </div>
            <EditorsPick articles={fallbackArticles.slice(0, 4)} showSnippet={true} variant="grid-4" />
          </section>
        )}
      </div>
    </div>
  );
}
