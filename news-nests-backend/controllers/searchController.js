import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';
import { buildSearchFilter, normalizeSearchQuery, parsePagination } from '../utils/searchQuery.js';
import { triggerSearchNewsDiscovery } from '../services/liveDiscoveryService.js';

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
  liveBlogs: ['title', 'description', 'category', 'author', 'tags', 'updates.title', 'updates.content'],
  videos: ['title', 'description', 'category', 'reporter', 'tags'],
  photoGalleries: ['title', 'description', 'category', 'photographer', 'tags', 'photos.caption']
};

export const fetchRankedNewsPage = async ({ query, sort, skip, limit }) => {
  const allMatches = buildSearchFilter(query, SEARCH_FIELDS.news);
  const headlineMatches = buildSearchFilter(query, ['title', 'subtitle']);
  const newsFilter = { status: 'approved', ...allMatches };
  const headlineFilter = { status: 'approved', ...headlineMatches };
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
        { $nor: [headlineMatches] }
      ]
    })
      .select('-content')
      .sort(sortObject)
      .skip(bodySkip)
      .limit(remaining)
    : [];

  return { news: [...headlineNews, ...nonHeadlineNews], total };
};

// Global, literal search across every public content collection. Individual
// terms are ANDed while each term can match any relevant field.
export const globalSearch = async (req, res) => {
  try {
    const query = normalizeSearchQuery(req.query.q);
    if (!query) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }

    const { page, limit, skip } = parsePagination(req.query, { limit: 24, maxLimit: 100 });
    const secondaryLimit = Math.min(limit, 24);

    const liveBlogFilter = buildSearchFilter(query, SEARCH_FIELDS.liveBlogs);
    const videoFilter = { status: 'approved', ...buildSearchFilter(query, SEARCH_FIELDS.videos) };
    const galleryFilter = { status: 'approved', ...buildSearchFilter(query, SEARCH_FIELDS.photoGalleries) };

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
      page === 1
        ? LiveBlog.find(liveBlogFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      page === 1
        ? VideoNews.find(videoFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      page === 1
        ? PhotoGallery.find(galleryFilter).sort(getSortObject(req.query.sort)).limit(secondaryLimit)
        : Promise.resolve([]),
      LiveBlog.countDocuments(liveBlogFilter),
      VideoNews.countDocuments(videoFilter),
      PhotoGallery.countDocuments(galleryFilter)
    ]);
    let { news, total: newsTotal } = newsPage;

    let discovery = { attempted: false };
    const minimumSearchInventory = 8;
    if (page === 1 && newsTotal < minimumSearchInventory) {
      // Return saved matches immediately. Full-page discovery continues in the
      // background and the client refreshes this fast endpoint while it runs.
      discovery = triggerSearchNewsDiscovery(query, {
        limit: Math.min(6, Math.max(3, minimumSearchInventory - newsTotal))
      });
    }

    const totals = {
      news: newsTotal,
      liveBlogs: liveBlogTotal,
      videos: videoTotal,
      photoGalleries: galleryTotal
    };

    return res.json({
      query,
      results: { news, liveBlogs, videos, photoGalleries },
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
