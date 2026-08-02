import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import indexingService from '../services/indexingService.js';

// @desc    Get overarching SEO & Sitemap analytics for admin dashboard
// @route   GET /api/admin/seo/analytics
// @access  Private/Admin only
export const getSeoAnalytics = async (req, res) => {
  try {
    const totalArticles = await News.countDocuments();
    const publishedArticles = await News.countDocuments({ status: 'published' });
    const totalLiveBlogs = await LiveBlog.countDocuments();
    const activeLiveBlogs = await LiveBlog.countDocuments({ isLive: true });

    // Calculate items modified within last 48 hours (Google News Top Stories window)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const googleNewsArticlesCount = await News.countDocuments({
      status: 'published',
      updatedAt: { $gte: twoDaysAgo }
    });
    const googleNewsStreamsCount = await LiveBlog.countDocuments({
      isLive: true,
      updatedAt: { $gte: twoDaysAgo }
    });

    // Count items needing SEO improvements (missing explicit metaDescription)
    const unoptimizedArticles = await News.countDocuments({
      status: 'published',
      $or: [{ metaDescription: { $exists: false } }, { metaDescription: '' }, { metaDescription: null }]
    });

    const unoptimizedStreams = await LiveBlog.countDocuments({
      $or: [{ description: { $exists: false } }, { description: '' }, { description: null }]
    });

    const serverUrl = process.env.API_URL || 'http://localhost:5000';

    res.status(200).json({
      success: true,
      metrics: {
        totalArticles,
        publishedArticles,
        totalLiveBlogs,
        activeLiveBlogs,
        googleNewsEligibleCount: googleNewsArticlesCount + googleNewsStreamsCount,
        unoptimizedCount: unoptimizedArticles + unoptimizedStreams,
        overallSeoHealth: Math.max(30, Math.round(100 - ((unoptimizedArticles + unoptimizedStreams) / Math.max(1, publishedArticles + activeLiveBlogs) * 40)))
      },
      sitemaps: {
        general: `${serverUrl}/api/sitemap.xml`,
        googleNews: `${serverUrl}/api/news-sitemap.xml`,
        rssFeed: `${serverUrl}/api/feed/rss.xml`
      },
      indexingStatus: {
        indexNowEnabled: true,
        enginesPinged: ['Bing', 'Yandex', 'Seznam', 'Naver', 'Yahoo'],
        googleIndexingApiReady: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      }
    });
  } catch (error) {
    console.error('[SeoAdmin] Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving SEO analytics' });
  }
};

// @desc    Audit content items and return SEO health scores with diagnostic flags
// @route   GET /api/admin/seo/audit
// @access  Private/Admin only
export const auditContentSeo = async (req, res) => {
  try {
    const { filter = 'all', limit = 50 } = req.query;
    let items = [];

    if (filter === 'all' || filter === 'news') {
      const news = await News.find()
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .lean();

      news.forEach(item => {
        const flags = [];
        let score = 100;

        const title = item.seoTitle || item.title || '';
        if (title.length > 65) {
          flags.push('Title exceeds 65 chars (may crop in Google Search)');
          score -= 15;
        } else if (title.length < 15) {
          flags.push('Title too short (< 15 chars)');
          score -= 15;
        }

        const desc = item.metaDescription || item.subtitle || '';
        if (!desc || desc.length < 50) {
          flags.push('Missing or short Meta Description (< 50 chars)');
          score -= 25;
        } else if (desc.length > 160) {
          flags.push('Meta Description exceeds 160 chars');
          score -= 10;
        }

        if (!item.imageUrl && !item.thumbnail) {
          flags.push('Missing Social OG Thumbnail Image');
          score -= 20;
        }
        if (!item.slug) {
          flags.push('Missing Semantic Slug (Fallback ID Routing used)');
          score -= 15;
        }

        items.push({
          _id: item._id,
          type: 'news',
          title: item.title,
          slug: item.slug || item._id.toString(),
          seoTitle: item.seoTitle || '',
          metaDescription: item.metaDescription || item.subtitle || '',
          imageUrl: item.imageUrl || item.thumbnail || '',
          updatedAt: item.updatedAt || item.createdAt,
          category: item.category,
          status: item.status,
          score: Math.max(0, score),
          flags
        });
      });
    }

    if (filter === 'all' || filter === 'liveblogs') {
      const blogs = await LiveBlog.find()
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .lean();

      blogs.forEach(blog => {
        const flags = [];
        let score = 100;

        const title = blog.seoTitle || blog.title || '';
        if (title.length > 65) {
          flags.push('Title exceeds 65 chars');
          score -= 15;
        }
        const desc = blog.metaDescription || blog.description || '';
        if (!desc || desc.length < 40) {
          flags.push('Missing or short stream description');
          score -= 25;
        }
        if (!blog.mainImageUrl) {
          flags.push('Missing Live Stream Hero Image');
          score -= 20;
        }
        if (!blog.isLive) {
          flags.push('Stream Ended (Unlisted from public catalog)');
        }

        items.push({
          _id: blog._id,
          type: 'liveblog',
          title: blog.title,
          slug: blog.slug || blog._id.toString(),
          seoTitle: blog.seoTitle || '',
          metaDescription: blog.metaDescription || blog.description || '',
          imageUrl: blog.mainImageUrl || '',
          updatedAt: blog.updatedAt || blog.createdAt,
          category: blog.category || 'Live',
          isLive: blog.isLive,
          score: Math.max(0, score),
          flags
        });
      });
    }

    // Sort by items with lowest score (most urgently needing optimization)
    items.sort((a, b) => a.score - b.score);

    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('[SeoAdmin] Error auditing SEO:', error);
    res.status(500).json({ success: false, message: 'Server error generating SEO audit report' });
  }
};

// @desc    Quick-edit SEO metadata (Title override, Meta Description, Slug)
// @route   PUT /api/admin/seo/update
// @access  Private/Admin only
export const updateSeoMetadata = async (req, res) => {
  try {
    const { id, type, seoTitle, metaDescription, slug } = req.body;
    if (!id || !type) {
      return res.status(400).json({ success: false, message: 'ID and type are required' });
    }

    let updatedDoc = null;
    let url = '';
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (type === 'news') {
      const doc = await News.findById(id);
      if (!doc) return res.status(404).json({ success: false, message: 'Article not found' });

      if (seoTitle !== undefined) doc.seoTitle = seoTitle;
      if (metaDescription !== undefined) doc.metaDescription = metaDescription;
      if (slug && slug !== doc.slug) doc.slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

      updatedDoc = await doc.save();
      url = `${baseUrl}/article/${updatedDoc.slug || updatedDoc._id}`;
    } else if (type === 'liveblog') {
      const doc = await LiveBlog.findById(id);
      if (!doc) return res.status(404).json({ success: false, message: 'Live Blog not found' });

      if (seoTitle !== undefined) doc.seoTitle = seoTitle;
      if (metaDescription !== undefined) doc.metaDescription = metaDescription;
      if (slug && slug !== doc.slug) doc.slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

      updatedDoc = await doc.save();
      url = `${baseUrl}/live-blogs?id=${updatedDoc.slug || updatedDoc._id}`;
    }

    // Trigger immediate re-index ping so search engines crawl the fresh meta tags
    if (url) {
      indexingService.submitUrl(url).catch(e => console.error('[SeoAdmin] Webhook ping failed:', e));
    }

    res.status(200).json({ success: true, item: updatedDoc, urlPinged: url });
  } catch (error) {
    console.error('[SeoAdmin] Error updating SEO metadata:', error);
    res.status(500).json({ success: false, message: 'Server error saving metadata update' });
  }
};

// @desc    Manually trigger instant IndexNow & Google Indexing webhooks for custom URLs or in bulk
// @route   POST /api/admin/seo/ping-index
// @access  Private/Admin only
export const triggerManualIndex = async (req, res) => {
  try {
    const { urls = [], bulkMode = '' } = req.body;
    let targetUrls = [...urls];
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (bulkMode === 'active_streams') {
      const activeStreams = await LiveBlog.find({ isLive: true }, 'slug _id').lean();
      activeStreams.forEach(stream => {
        targetUrls.push(`${baseUrl}/live-blogs?id=${stream.slug || stream._id}`);
      });
    } else if (bulkMode === 'recent_news') {
      const recentNews = await News.find({ status: 'published' })
        .sort({ updatedAt: -1 })
        .limit(25)
        .select('slug _id')
        .lean();
      recentNews.forEach(article => {
        targetUrls.push(`${baseUrl}/article/${article.slug || article._id}`);
      });
    } else if (bulkMode === 'all') {
      const streams = await LiveBlog.find({ isLive: true }, 'slug _id').lean();
      const news = await News.find({ status: 'published' }).sort({ updatedAt: -1 }).limit(40).select('slug _id').lean();
      
      targetUrls.push(baseUrl);
      streams.forEach(s => targetUrls.push(`${baseUrl}/live-blogs?id=${s.slug || s._id}`));
      news.forEach(n => targetUrls.push(`${baseUrl}/article/${n.slug || n._id}`));
    }

    // Remove duplicate URLs
    targetUrls = [...new Set(targetUrls.filter(Boolean))];

    if (targetUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid target URLs provided or found for bulk indexing.' });
    }

    console.log(`[SeoAdmin] Dispatching instant IndexNow pings for ${targetUrls.length} targets...`);
    
    // Broadcast indexing notification
    if (targetUrls.length === 1) {
      await indexingService.submitUrl(targetUrls[0]);
    } else {
      // Execute concurrently in batched promises
      const batchSize = 10;
      for (let i = 0; i < targetUrls.length; i += batchSize) {
        const batch = targetUrls.slice(i, i + batchSize);
        await Promise.all(batch.map(url => indexingService.submitUrl(url).catch(e => console.error(e))));
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully broadcasted ${targetUrls.length} URLs to search engine indexing webhooks (IndexNow, Bing, Google).`,
      pingCount: targetUrls.length,
      urls: targetUrls.slice(0, 20) // send back sample of pinged URLs
    });
  } catch (error) {
    console.error('[SeoAdmin] Error triggering index pings:', error);
    res.status(500).json({ success: false, message: 'Server error communicating with indexing receptors' });
  }
};
