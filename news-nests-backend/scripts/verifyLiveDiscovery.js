import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import { discoverSearchNews } from '../services/liveDiscoveryService.js';
import { isCompleteScrapedArticle } from '../services/hybridNewsService.js';
import { buildSearchFilter, normalizeSearchQuery } from '../utils/searchQuery.js';
import { fetchRankedNewsPage } from '../controllers/searchController.js';

const SEARCH_FIELDS = [
  'title', 'subtitle', 'content', 'category', 'subCategory', 'tags', 'author',
  'sourceName', 'country', 'region', 'city', 'aiSummary', 'keyTakeaways'
];

const query = normalizeSearchQuery(process.argv[2] || 'Modi');

try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    status: 'approved',
    sourceUrl: { $regex: /^https?:\/\//i },
    ...buildSearchFilter(query, SEARCH_FIELDS)
  };
  const before = await News.countDocuments(filter);
  const discovery = await discoverSearchNews(query, { limit: 4 });
  const results = await News.find(filter).sort({ publishedAt: -1 }).limit(8);
  const complete = results.filter((article) => isCompleteScrapedArticle(article));
  const rankedPage = await fetchRankedNewsPage({ query, sort: 'newest', skip: 0, limit: 8 });

  console.log(JSON.stringify({
    query,
    searchableBefore: before,
    discovery,
    searchableAfter: results.length,
    completeResults: complete.length,
    rankedTopTitles: rankedPage.news.slice(0, 4).map((article) => article.title),
    samples: complete.slice(0, 4).map((article) => ({
      title: article.title,
      sourceName: article.sourceName,
      provider: article.discoveryProvider,
      contentLength: article.content.length,
      publishedAt: article.publishedAt
    }))
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
