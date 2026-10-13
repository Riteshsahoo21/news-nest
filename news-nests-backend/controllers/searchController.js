import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';
import { 
  buildSearchFilter, 
  buildRelaxedSearchFilter,
  findClosestQueryCorrection,
  normalizeSearchQuery, 
  parsePagination 
} from '../utils/searchQuery.js';
import { discoverSearchNews, triggerSearchNewsDiscovery } from '../services/liveDiscoveryService.js';

const getSortObject = (sort, supportsPublishedAt = false) => {
  if (sort === 'most_viewed') return { views: -1, createdAt: -1 };
  if (sort === 'most_liked') return { likesCount: -1, createdAt: -1 };
  return supportsPublishedAt ? { publishedAt: -1, createdAt: -1 } : { createdAt: -1 };
};

const SEARCH_FIELDS = {
  news: [
    'title', 'subtitle', 'content', 'category', 'subCategory', 'tags', 'author',
    'sourceName', 'country', 'region', 'city', 'aiSummary', 'keyTakeaways'
  ],
  liveBlogs: [
    'title', 'description', 'category', 'author', 'tags',
    'matchStatus.team1.name', 'matchStatus.team2.name', 'matchStatus.matchInfo',
    'updates.title', 'updates.content'
  ],
  videos: ['title', 'description', 'category', 'reporter', 'tags'],
  photoGalleries: ['title', 'description', 'category', 'photographer', 'tags', 'photos.caption']
};

export const fetchRankedNewsPage = async ({ query, sort, skip, limit, isRelaxed = false }) => {
  const filterFn = isRelaxed ? buildRelaxedSearchFilter : buildSearchFilter;
  const allMatches = filterFn(query, SEARCH_FIELDS.news);
  const headlineMatches = filterFn(query, ['title', 'subtitle']);
  if (!allMatches) return { news: [], total: 0 };

  const newsFilter = { status: 'approved', ...allMatches };
  const headlineFilter = { status: 'approved', ...(headlineMatches || allMatches) };
  const sortObject = getSortObject(sort, true);

  const [total, headlineTotal] = await Promise.all([
    News.countDocuments(newsFilter),
    News.countDocuments(headlineFilter)
  ]);

  const headlineSkip = Math.min(skip, headlineTotal);
  const headlineLimit = Math.min(limit, Math.max(0, headlineTotal - headlineSkip));
  const headlineNews = headlineLimit > 0
    ? await News.find(headlineFilter)
      .select('-content')
      .sort(sortObject)
      .skip(headlineSkip)
      .limit(headlineLimit)
    : [];

  const remaining = limit - headlineNews.length;
  const bodySkip = Math.max(0, skip - headlineTotal);
  const nonHeadlineNews = remaining > 0
    ? await News.find({
      $and: [
        newsFilter,
        { $nor: [headlineMatches || allMatches] }
      ]
    })
      .select('-content')
      .sort(sortObject)
      .skip(bodySkip)
      .limit(remaining)
    : [];

  return { news: [...headlineNews, ...nonHeadlineNews], total };
};

// Global, intelligent search across every public content collection.
// Includes compound phrase tolerance, typo correction, and live web discovery.
export const globalSearch = async (req, res) => {
  try {
    const rawQuery = req.query.q;
    const query = normalizeSearchQuery(rawQuery);
    if (!query) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }

    const { page, limit, skip } = parsePagination(req.query, { limit: 24, maxLimit: 100 });
    const secondaryLimit = Math.min(limit, 24);

    const correctedQuery = findClosestQueryCorrection(query);
    let didYouMean = null;

    let liveBlogFilter = buildSearchFilter(query, SEARCH_FIELDS.liveBlogs);
    let videoFilter = { status: 'approved', ...buildSearchFilter(query, SEARCH_FIELDS.videos) };
    let galleryFilter = { status: 'approved', ...buildSearchFilter(query, SEARCH_FIELDS.photoGalleries) };

    let [
      newsPage,
      liveBlogs,
      videos,
      photoGalleries,
      liveBlogTotal,
      videoTotal,
      galleryTotal
    ] = await Promise.all([
      fetchRankedNewsPage({ query, sort: req.query.sort, skip, limit }),
      page === 1 && liveBlogFilter
        ? LiveBlog.find(liveBlogFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      page === 1 && videoFilter
        ? VideoNews.find(videoFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      page === 1 && galleryFilter
        ? PhotoGallery.find(galleryFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      liveBlogFilter ? LiveBlog.countDocuments(liveBlogFilter) : Promise.resolve(0),
      videoFilter ? VideoNews.countDocuments(videoFilter) : Promise.resolve(0),
      galleryFilter ? PhotoGallery.countDocuments(galleryFilter) : Promise.resolve(0)
    ]);
    let { news, total: newsTotal } = newsPage;

    // Fallback 1: If a typo-corrected variant exists and yields results
    if (correctedQuery && correctedQuery.toLowerCase() !== query.toLowerCase()) {
      const correctedPage = await fetchRankedNewsPage({ query: correctedQuery, sort: req.query.sort, skip, limit });
      if (correctedPage.total >= newsTotal || newsTotal === 0) {
        newsPage = correctedPage;
        news = newsPage.news;
        newsTotal = newsPage.total;
        didYouMean = correctedQuery;
      }
    }

    // Fast live discovery if inventory is low (< 6 articles)
    let discovery = { attempted: false };
    const minimumSearchInventory = 6;
    if (page === 1 && newsTotal < minimumSearchInventory) {
      try {
        const queryToDiscover = (newsTotal === 0 && correctedQuery) ? correctedQuery : query;
        // Fast live discovery with a 3.5s timeout guard so users get results immediately in ~1.5s!
        await Promise.race([
          discoverSearchNews(queryToDiscover, { limit: Math.min(6, Math.max(3, minimumSearchInventory - newsTotal)) }),
          new Promise((resolve) => setTimeout(resolve, 3500))
        ]);
        // Re-query database to return the newly discovered articles in this single instant response!
        newsPage = await fetchRankedNewsPage({ query: queryToDiscover, sort: req.query.sort, skip, limit });
        if (newsPage.total === 0 && queryToDiscover !== query) {
          newsPage = await fetchRankedNewsPage({ query, sort: req.query.sort, skip, limit });
        }
        if (newsPage.total > 0) {
          news = newsPage.news;
          newsTotal = newsPage.total;
          if (queryToDiscover !== query) didYouMean = queryToDiscover;
        }
        discovery = { attempted: true, status: 'complete', immediate: true };
      } catch (discErr) {
        console.error('Fast live discovery search error:', discErr.message);
        discovery = triggerSearchNewsDiscovery(query, {
          limit: Math.min(6, Math.max(3, minimumSearchInventory - newsTotal))
        });
      }
    }

    // Fallback 2: Only after live discovery has run, if STILL 0 results and multi-word query, try relaxed OR-search
    if (newsTotal === 0 && query.includes(' ')) {
      const relaxedPage = await fetchRankedNewsPage({ query, sort: req.query.sort, skip, limit, isRelaxed: true });
      if (relaxedPage.total > 0) {
        newsPage = relaxedPage;
        news = newsPage.news;
        newsTotal = newsPage.total;
        if (correctedQuery) didYouMean = correctedQuery;
      }
    }

    const totals = {
      news: newsTotal,
      liveBlogs: liveBlogTotal,
      videos: videoTotal,
      photoGalleries: galleryTotal
    };

    let recommendations = [];
    if (newsTotal < 6) {
      recommendations = await News.find({ status: 'approved' })
        .sort({ views: -1, publishedAt: -1, createdAt: -1 })
        .limit(6)
        .select('title slug subtitle summary category imageUrl mainImageUrl publishedAt views');
    }

    const stripUnsplashFallbackImages = (item) => {
      if (!item) return item;
      const doc = item.toObject ? item.toObject() : { ...item };
      const isUnsplash = (url) => typeof url === 'string' && url.includes('unsplash.com');
      if (isUnsplash(doc.imageUrl)) doc.imageUrl = '';
      if (isUnsplash(doc.mainImageUrl)) doc.mainImageUrl = '';
      if (Array.isArray(doc.mediaUrls)) {
        doc.mediaUrls = doc.mediaUrls.filter((u) => !isUnsplash(u));
      }
      return doc;
    };

    return res.json({
      query,
      didYouMean,
      results: { 
        news: news.map(stripUnsplashFallbackImages), 
        liveBlogs, 
        videos, 
        photoGalleries, 
        recommendations 
      },
      totals,
      totalMatches: Object.values(totals).reduce((sum, count) => sum + count, 0),
      discovery,
      pagination: {
        news: {
          page,
          limit,
          total: newsTotal,
          totalPages: Math.max(1, Math.ceil(newsTotal / limit)),
          hasMore: skip + news.length < newsTotal
        }
      }
    });
  } catch (error) {
    console.error('Error during global search:', error);
    return res.status(500).json({ error: 'Internal server error during search' });
  }
};

// Get search recommendations (top trending, cross-category highlights, and contextual suggestions)
export const getSearchRecommendations = async (req, res) => {
  try {
    const { category, limit = 8 } = req.query;
    const filter = { status: 'approved' };
    if (category && category !== 'All') {
      filter.category = category.toLowerCase();
    }

    const recommendations = await News.find(filter)
      .sort({ views: -1, publishedAt: -1, createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 8, 20))
      .select('title slug subtitle summary category imageUrl mainImageUrl publishedAt views readingTime');

    const topics = [
      'Artificial Intelligence', 'Cricket Live Score', 'Global Geopolitics', 
      'World Economy', 'Stock Markets', 'Cinema & Awards',
      'Renewable Energy', 'Space Science'
    ];

    res.json({
      recommendations,
      trendingTopics: topics
    });
  } catch (error) {
    console.error('Error fetching search recommendations:', error);
    res.status(500).json({ error: 'Internal server error fetching recommendations' });
  }
};
