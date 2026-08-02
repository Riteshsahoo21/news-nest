import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import LiveTicker from '../components/home/LiveTicker';
import BreakingNewsCarousel from '../components/home/BreakingNewsCarousel';
import CategoryPills from '../components/home/CategoryPills';
import EditorsPick from '../components/home/EditorsPick';
import RecommendedCarousel from '../components/home/RecommendedCarousel';
import FeaturedVideoCarousel from '../components/home/FeaturedVideoCarousel';
import NewsletterSignup from '../components/NewsletterSignup';
import AdSlot from '../components/ads/AdSlot';
import TrendingStories from '../components/home/TrendingStories';
import { useAuth } from '../context/AuthContext';
import SeoHead from '../components/SeoHead';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['news', 'latest', 50],
    queryFn: async () => {
      const res = await api.get('/news?limit=50');
      return res.data.data || res.data || [];
    },
  });

  const articles = data || [];
  const error = isError ? 'Failed to fetch latest news.' : null;

  // Split articles into different sections conceptually
  const safeArticles = (Array.isArray(articles) ? articles : []).filter(a => a.thumbnail || a.imageUrl || a.coverImage);
  
  // Break news first
  const breakingNews = safeArticles.slice(0, 3);
  
  // Sort remaining by views (descending) to find the most viral
  const remainingForSort = safeArticles.slice(3);
  const sortedByViews = [...remainingForSort].sort((a, b) => (b.views || 0) - (a.views || 0));
  
  // 1 Editor Pick
  const editorPick = sortedByViews.length > 0 ? sortedByViews[0] : null;
  
  // Trending News (Next 4 most viral)
  const trendingNews = sortedByViews.slice(1, 5);
  
  // Recommended for you (Next 3)
  const recommendedNews = sortedByViews.slice(5, 8);
  
  // Latest News (Remaining)
  const latestNews = [...safeArticles]
    .filter(a => a._id !== editorPick?._id && !trendingNews.find(t => t._id === a._id) && !recommendedNews.find(r => r._id === a._id))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

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
    <div className="max-w-7xl mx-auto pb-20 md:py-8 px-4 sm:px-6 lg:px-8 bg-background overflow-hidden min-w-0">
      <SeoHead 
        title="News Nests - Real-Time Journalism & Live WebRTC News Streams"
        description="Breaking headline news, interactive live blog coverage, in-depth politics and sports commentary, and community journalism."
        type="website"
        schema={orgSchema}
      />
      <div className="mb-6 w-full max-w-full min-w-0">
        <AdSlot position="leaderboard" />
      </div>
      
      <LiveTicker fallbackTitle="Explore Real-Time Newsroom Streams & Live Event Coverage" />
      
      {/* Top Section: Hero + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mt-6 w-full max-w-full min-w-0">
        
        {/* Main Hero & Content Column */}
        <div className="lg:col-span-8 w-full max-w-full min-w-0 space-y-10">
          
          <div>
            <BreakingNewsCarousel articles={breakingNews} />
            
            <div className="mt-6">
              <CategoryPills 
                selectedCategory="all"
                onSelectCategory={(cat) => {
                  if (cat._id !== 'all') {
                    navigate(`/category/${cat._id}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Recommended For You */}
          {recommendedNews.length > 0 && (
            <section className="pt-2">
              <RecommendedCarousel articles={recommendedNews} />
            </section>
          )}

          {/* Advertisement */}
          <div className="py-2">
            <AdSlot position="in-feed" />
          </div>

          {/* Editor's Pick */}
          {editorPick && (
            <section className="pt-2">
              <div className="flex items-center space-x-3 mb-5 border-b border-border/60 pb-3">
                <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">Editor's Pick</h3>
              </div>
              <EditorsPick articles={[editorPick]} showSnippet={true} />
            </section>
          )}

          {/* Featured Video */}
          <section className="pt-2">
            <div className="flex items-center space-x-3 mb-5 border-b border-border/60 pb-3">
              <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">Featured Video Broadcast</h3>
            </div>
            <FeaturedVideoCarousel />
          </section>

          {/* Latest News */}
          {latestNews.length > 0 && (
            <section className="pt-2">
              <div className="flex items-center space-x-3 mb-5 border-b border-border/60 pb-3">
                <span className="w-2.5 h-6 bg-red-600 rounded-sm shrink-0"></span>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight font-serif text-foreground">Latest Reports</h3>
              </div>
              <EditorsPick articles={latestNews} showSnippet={true} />
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-8 mt-6 lg:mt-0 w-full max-w-full min-w-0">
          <TrendingStories articles={trendingNews} />
          
          <div className="bg-card rounded-2xl p-1 shadow-sm border border-border/50">
            <NewsletterSignup variant="sidebar" />
          </div>
          
          <div className="sticky top-24 pt-4 hidden lg:block">
             <AdSlot position="sidebar" className="m-0 shadow-sm rounded-2xl overflow-hidden border border-border/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
