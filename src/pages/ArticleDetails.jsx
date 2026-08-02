import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Clock, ThumbsUp, Share2, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

import AdSlot from '../components/ads/AdSlot';
import NewsletterSignup from '../components/NewsletterSignup';
import SeoHead from '../components/SeoHead';

export default function ArticleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialType, setInterstitialType] = useState('interstitial');
  const [countdown, setCountdown] = useState(5);

  const isPremium = user?.subscription?.status === 'active' || user?.roles?.includes('admin');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await api.get(`/news/article/${id}`);
        setArticle(response.data.article || response.data);
        if (isPremium) {
          console.log(`[Ad System] User is Premium/Admin. Skipping ad trap.`);
        }
        if (!isPremium) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('free_articles_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(id)) {
            readArticles.push(id);
            sessionStorage.setItem('free_articles_read_list', JSON.stringify(readArticles));
          }
          
          let readCount = readArticles.length;
          console.log(`[Ad System] User has read ${readCount} unique articles:`, readArticles);

          if (readCount > 0 && readCount % 8 === 0) {
            setInterstitialType('video_interstitial');
            setCountdown(15);
            setShowInterstitial(true);
          } else if (readCount > 0 && readCount % 10 === 0) {
            setInterstitialType('interstitial');
            setCountdown(5);
            setShowInterstitial(true);
          } else {
            setShowInterstitial(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch article', err);
        setError('Article not found or server error.');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id, isPremium]);

  useEffect(() => {
    let timer;
    if (showInterstitial && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showInterstitial, countdown]);

  const renderContentWithAds = (htmlContent) => {
    if (isPremium) {
      return <div className="text-foreground leading-relaxed space-y-6" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    const parts = htmlContent.split('</p>');
    return (
      <div className="text-foreground leading-relaxed space-y-6">
        {parts.map((part, index) => {
          if (!part.trim()) return null;
          const pContent = part.includes('<p') ? part + '</p>' : part;
          
          return (
            <React.Fragment key={index}>
              <div dangerouslySetInnerHTML={{ __html: pContent }} />
              {(index + 1) % 2 === 0 && (
                <div className="my-8 flex justify-center border-y border-gray-100 py-4 bg-gray-50/50">
                  <div className="w-full">
                    <AdSlot position="in-article" className="mx-auto" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !article) {
    return <div className="text-center text-destructive py-12">{error}</div>;
  }

  const articleSchema = [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title || "News Report",
      "description": (article.metaDescription || article.subtitle || article.content || "Read news report on News Nests").toString().replace(/<[^>]*>?/gm, '').substring(0, 160),
      "image": [article.imageUrl || article.thumbnail || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200"],
      "datePublished": article.createdAt || new Date().toISOString(),
      "dateModified": article.updatedAt || new Date().toISOString(),
      "author": [{
        "@type": "Person",
        "name": article.author || "News Desk",
        "url": `${window.location.origin}/author/${article.authorId || 'editorial'}`
      }],
      "publisher": {
        "@type": "Organization",
        "name": "News Nests",
        "logo": {
          "@type": "ImageObject",
          "url": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600"
        }
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": window.location.origin },
        { "@type": "ListItem", "position": 2, "name": article.category || "News", "item": `${window.location.origin}/category/${encodeURIComponent((article.category || 'news').toLowerCase())}` },
        { "@type": "ListItem", "position": 3, "name": article.title || "Report", "item": window.location.href }
      ]
    }
  ];

  return (
    <>
      <SeoHead 
        title={`${article.seoTitle || article.title} | News Nests`}
        description={article.metaDescription || article.subtitle || article.content}
        image={article.imageUrl || article.thumbnail}
        type="article"
        publishedTime={article.createdAt}
        modifiedTime={article.updatedAt}
        author={article.author}
        schema={articleSchema}
      />
      {/* Interstitial Ad Overlay */}
      {showInterstitial && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full ${interstitialType === 'video_interstitial' ? 'max-w-4xl' : 'max-w-2xl'} bg-gray-50 rounded-xl p-8 text-center flex flex-col items-center shadow-xl border border-gray-200 relative my-auto`}>
            <h2 className="text-2xl font-bold mb-2">Sponsor Message</h2>
            <p className="text-gray-500 mb-8">Your article will load shortly...</p>
            
            <div className={`w-full bg-black border border-gray-100 rounded overflow-hidden flex items-center justify-center mb-8 ${interstitialType === 'video_interstitial' ? 'aspect-video' : 'h-[30vh] min-h-[200px] max-h-[400px]'}`}>
              <AdSlot position={interstitialType} className="m-0 w-full h-full" />
            </div>
            
            <div className="flex flex-col items-center gap-4 w-full max-w-sm">
              <button 
                disabled={countdown > 0}
                onClick={() => setShowInterstitial(false)}
                className={`w-full py-3 rounded-lg font-bold transition-all ${countdown > 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'}`}
              >
                {countdown > 0 ? `Skip Ad in ${countdown}s` : 'Skip Ad & Read Article'}
              </button>
              
              <button 
                onClick={() => navigate('/subscribe')}
                className="text-primary font-medium hover:underline text-sm"
              >
                Remove Ads with Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <div className={`max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10 ${showInterstitial ? 'opacity-0 h-screen overflow-hidden' : 'opacity-100'}`}>
        
        {/* Main Article Content */}
        <article className="lg:col-span-2">
          <header className="mb-8">
            <div className="flex items-center space-x-2 text-primary font-semibold uppercase tracking-wider text-sm mb-4">
              <span>{article.category}</span>
              {article.isPremiumContent && (
                 <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs ml-2">Premium</span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight mb-6">
              {article.title}
            </h1>
            
            <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{article.author || 'News Desk'}</span>
                </div>
                <div className="flex items-center space-x-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="h-8">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {article.likesCount || 0}
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </header>

          {article.mainImageUrl && (
            <figure className="mb-10 rounded-xl overflow-hidden shadow-lg border border-border/50">
              <img src={article.mainImageUrl} alt={article.title} className="w-full h-auto object-cover" />
            </figure>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed mb-8 font-medium">
              {article.summary}
            </p>
            
            {renderContentWithAds(article.content)}

            <NewsletterSignup className="mt-12" />
          </div>
        </article>

        {/* Sticky Sidebar */}
        <aside className="hidden lg:block relative">
          <div className="sticky top-24 space-y-8">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider">Advertisement</h3>
              <AdSlot position="sidebar" className="m-0" />
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider">More News</h3>
              <p className="text-sm text-gray-500">More related articles will appear here.</p>
            </div>
          </div>
        </aside>

      </div>
    </>
  );
}
