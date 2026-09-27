import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Clock, ThumbsUp, Share2, User, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

import AdSlot from '../components/ads/AdSlot';
import NewsletterSignup from '../components/NewsletterSignup';
import SeoHead from '../components/SeoHead';
import FormattedArticleContent from '../components/FormattedArticleContent';
import AiSummaryCard from '../components/AiSummaryCard';
import BackstoryCard from '../components/BackstoryCard';
import SafeImage from '../components/common/SafeImage';
import RelatedNewsSection from '../components/RelatedNewsSection';

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
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = article ? article.title : 'News Nests Article';
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert(`Share link: ${shareUrl}`);
    }
  };

  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await api.get(`/news/article/${id}`);
        const art = response.data.article || response.data;
        if (art && (!art.relatedArticles || art.relatedArticles.length === 0)) {
          try {
            const relRes = await api.get(`/news/related?articleId=${art._id}&category=${art.category}`);
            if (relRes.data && relRes.data.length > 0) {
              art.relatedArticles = relRes.data;
            }
          } catch (_) {}
        }
        setArticle(art);
        
        // Only staff preview custom interstitials
        if (isStaff) {
          let readArticles = [];
          try {
            readArticles = JSON.parse(sessionStorage.getItem('staff_articles_read_list')) || [];
          } catch (e) {
            readArticles = [];
          }
          
          if (!readArticles.includes(id)) {
            readArticles.push(id);
            sessionStorage.setItem('staff_articles_read_list', JSON.stringify(readArticles));
          }
          
          let readCount = readArticles.length;
          if (readCount > 0 && readCount % 8 === 0) {
            setInterstitialType('video_interstitial');
            setCountdown(15);
            setShowInterstitial(true);
          } else if (readCount > 0 && readCount % 10 === 0) {
            setInterstitialType('interstitial');
            setCountdown(5);
            setShowInterstitial(true);
          }
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, isStaff]);

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
    if (!isStaff) {
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
            </div>
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <div className={`max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 w-full max-w-full overflow-hidden min-w-0 ${showInterstitial ? 'opacity-0 h-screen overflow-hidden' : 'opacity-100'}`}>
        
        {/* Main Article Content */}
        <article className="lg:col-span-2 min-w-0">
          <header className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4 font-mono flex-wrap gap-y-1">
              <span>{article.category || 'GLOBAL NEWS'}</span>
              {article.country && article.country !== 'global' && (
                <span className="bg-muted text-foreground/80 px-2 py-0.5 rounded text-xs ml-1 font-sans font-semibold border border-border/50">
                  {article.country === 'in' ? '🇮🇳 India' : article.country === 'us' ? '🇺🇸 USA' : article.country === 'gb' ? '🇬🇧 UK' : article.country.toUpperCase()}
                </span>
              )}
              {article.subCategory === 'esports' && (
                <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded text-xs ml-1 font-sans font-bold border border-purple-300 dark:border-purple-700">
                  🎮 Esports
                </span>
              )}
              {article.sourceName && (
                <span className="text-muted-foreground text-xs font-normal normal-case font-sans ml-1">
                  via {article.sourceName}
                </span>
              )}
              {article.isPremiumContent && (
                 <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs ml-2 font-sans font-extrabold">Premium</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold font-serif leading-tight mb-4 sm:mb-6 break-words text-foreground">
              {article.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-muted-foreground border-b border-border/50 pb-4 sm:pb-6 font-sans">
              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-foreground">{article.author || 'News Desk'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="flex space-x-2 sm:self-auto self-end">
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold shadow-xs">
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  {article.likesCount || 0}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold shadow-xs" onClick={handleShare}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? 'Copied Link!' : 'Share'}
                </Button>
              </div>
            </div>
          </header>

          {article.mediaUrls && article.mediaUrls.length > 1 ? (
            <div className="mb-10 grid gap-4">
              <figure className="rounded-xl overflow-hidden shadow-lg border border-border/50">
                <SafeImage 
                  src={article.mediaUrls[0].startsWith('http') ? article.mediaUrls[0] : `http://localhost:5000/${article.mediaUrls[0].replace('\\', '/')}`} 
                  alt={article.title} 
                  category={article.category}
                  subCategory={article.subCategory}
                  country={article.country}
                  className="w-full max-h-[500px] object-cover" 
                />
              </figure>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {article.mediaUrls.slice(1).map((url, idx) => (
                  <figure key={idx} className="rounded-xl overflow-hidden shadow-md border border-border/50">
                    <SafeImage 
                      src={url.startsWith('http') ? url : `http://localhost:5000/${url.replace('\\', '/')}`} 
                      alt={`${article.title} - Media ${idx + 2}`} 
                      category={article.category}
                      subCategory={article.subCategory}
                      country={article.country}
                      className="w-full h-32 object-cover transition-transform hover:scale-105" 
                    />
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <figure className="mb-10 rounded-xl overflow-hidden shadow-lg border border-border/50">
              <SafeImage 
                src={article.imageUrl || article.mainImageUrl} 
                alt={article.title} 
                category={article.category}
                subCategory={article.subCategory}
                country={article.country}
                className="w-full max-h-[500px] object-cover" 
              />
            </figure>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed mb-8 font-medium">
              {article.summary}
            </p>
            
            {/* AI Executive Briefing / Key Takeaways */}
            <div className="mb-8 not-prose">
              <AiSummaryCard 
                aiSummary={article.aiSummary} 
                keyTakeaways={article.keyTakeaways} 
              />
            </div>

            <BackstoryCard 
              articleId={article.slug || article._id} 
              initialBackstoryData={article.backstoryData}
              initialBackstory={article.backstory}
              className="mb-8" 
            />

            <FormattedArticleContent 
              content={article.content} 
              author={article.author || 'News Bureau'} 
              mediaUrls={article.mediaUrls || []}
              category={article.category}
              subCategory={article.subCategory}
              country={article.country}
            />

            {/* Mobile Sidebar Ad Replacement (Staff Preview Only) */}
            {isStaff && (
              <div className="lg:hidden my-8 w-full">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase text-xs tracking-wider font-mono">Advertisement (Staff Preview)</h3>
                <AdSlot position="sidebar" className="m-0 w-full rounded-xl overflow-hidden shadow-sm" />
              </div>
            )}

            {/* Past News & Related Coverage Timeline */}
            <RelatedNewsSection 
              articles={article.relatedArticles} 
              variant="grid" 
              title="Past News & Related Coverage" 
            />

            <NewsletterSignup className="mt-12" />
          </div>
        </article>

        {/* Sticky Sidebar */}
        <aside className="hidden lg:block relative">
          <div className="sticky top-24 space-y-8">
            {isStaff && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider">Advertisement (Staff Preview)</h3>
                <AdSlot position="sidebar" className="m-0" />
              </div>
            )}
            
            <RelatedNewsSection 
              articles={article.relatedArticles} 
              variant="sidebar" 
              title="Past Related News" 
            />
          </div>
        </aside>

      </div>
    </>
  );
}
