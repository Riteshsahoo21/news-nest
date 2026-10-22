import News from '../models/News.js';
import { syncMetadataFeeds } from './hybridNewsService.js';

export const NEWS_CATEGORIES = [
  'world',
  'politics',
  'business',
  'technology',
  'science',
  'health',
  'sports',
  'entertainment',
  'lifestyle'
];

const MINIMUM_RECENT_ARTICLES_PER_CATEGORY = 12;
const MINIMUM_COMPLETE_CONTENT_LENGTH = 350;

export const COMPLETE_ARTICLE_FILTER = {
  status: 'approved',
  isFullContentFetched: true,
  sourceUrl: { $regex: /^https?:\/\//i },
  sourceName: { $nin: ['', null] },
  publishedAt: { $ne: null },
  'mediaUrls.0': { $exists: true },
  $expr: {
    $gte: [
      { $strLenCP: { $ifNull: ['$content', ''] } },
      MINIMUM_COMPLETE_CONTENT_LENGTH
    ]
  }
};

export const getProviderStatus = () => ({
  activePrimaryProvider: 'complete-article-scraper',
  discoveryProviders: ['curated-rss', 'gdelt', 'google-news-rss', 'bing-news-rss'],
  liveSearchDiscovery: true,
  regionalDiscovery: true,
  minimumContentCharacters: MINIMUM_COMPLETE_CONTENT_LENGTH,
  minimumRecentArticlesPerCategory: MINIMUM_RECENT_ARTICLES_PER_CATEGORY
});

const syncCategory = async (category, quotaPerCategory) => {
  const recentCount = await News.countDocuments({
    ...COMPLETE_ARTICLE_FILTER,
    category,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  const inventoryDeficit = Math.max(0, MINIMUM_RECENT_ARTICLES_PER_CATEGORY - recentCount);
  const requestedCount = Math.min(30, Math.max(quotaPerCategory, inventoryDeficit));
  const result = await syncMetadataFeeds({ category, limit: requestedCount });
  let completeInventory = await News.countDocuments({ ...COMPLETE_ARTICLE_FILTER, category });

  // If publisher blocks caused a sparse category, request a deeper metadata
  // window once. Already-complete URLs are skipped before extraction.
  if (completeInventory < MINIMUM_RECENT_ARTICLES_PER_CATEGORY) {
    const refill = await syncMetadataFeeds({ category, limit: 30 });
    result.insertedCount = (result.insertedCount || 0) + (refill.insertedCount || 0);
    result.updatedCount = (result.updatedCount || 0) + (refill.updatedCount || 0);
    result.rejectedCount = (result.rejectedCount || 0) + (refill.rejectedCount || 0);
    result.skippedCompleteCount = (result.skippedCompleteCount || 0) + (refill.skippedCompleteCount || 0);
    result.totalFetched = (result.totalFetched || 0) + (refill.totalFetched || 0);
    result.acceptedCount = (result.acceptedCount || 0) + (refill.acceptedCount || 0);
    result.deepRefillAttempted = true;
    completeInventory = await News.countDocuments({ ...COMPLETE_ARTICLE_FILTER, category });
  }

  return {
    requested: requestedCount,
    recentBeforeSync: recentCount,
    completeInventory,
    ...result
  };
};

/**
 * Scraper-only ingestion pipeline. Every persisted external story has already
 * passed full-text extraction and the completeness gate in hybridNewsService.
 */
export const syncHarmonizedNews = async (quotaPerCategory = 8) => {
  const normalizedQuota = Math.min(Math.max(Number.parseInt(quotaPerCategory, 10) || 8, 1), 30);
  console.log('=== [UnifiedAggregator] Starting scraper-only complete-news sync ===');

  const summary = {};
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalRejected = 0;

  // Keep category work sequential so the scraper never floods publishers with
  // dozens of simultaneous requests. Each category still extracts four pages
  // concurrently inside hybridNewsService.
  for (const category of NEWS_CATEGORIES) {
    const result = await syncCategory(category, normalizedQuota);
    summary[category] = result;
    totalInserted += result.insertedCount || 0;
    totalUpdated += result.updatedCount || 0;
    totalRejected += result.rejectedCount || 0;
    console.log(
      `[UnifiedAggregator] ${category}: ${result.insertedCount || 0} inserted, ` +
      `${result.updatedCount || 0} repaired, ${result.rejectedCount || 0} rejected.`
    );
  }

  const esports = await syncMetadataFeeds({
    subCategory: 'esports',
    limit: Math.max(normalizedQuota, 12)
  });
  let esportsInventory = await News.countDocuments({
    ...COMPLETE_ARTICLE_FILTER,
    subCategory: 'esports'
  });
  if (esportsInventory < 12) {
    const esportsRefill = await syncMetadataFeeds({ subCategory: 'esports', limit: 24 });
    esports.insertedCount = (esports.insertedCount || 0) + (esportsRefill.insertedCount || 0);
    esports.updatedCount = (esports.updatedCount || 0) + (esportsRefill.updatedCount || 0);
    esports.rejectedCount = (esports.rejectedCount || 0) + (esportsRefill.rejectedCount || 0);
    esports.skippedCompleteCount = (esports.skippedCompleteCount || 0) + (esportsRefill.skippedCompleteCount || 0);
    esports.totalFetched = (esports.totalFetched || 0) + (esportsRefill.totalFetched || 0);
    esports.acceptedCount = (esports.acceptedCount || 0) + (esportsRefill.acceptedCount || 0);
    esports.deepRefillAttempted = true;
    esportsInventory = await News.countDocuments({ ...COMPLETE_ARTICLE_FILTER, subCategory: 'esports' });
  }
  esports.completeInventory = esportsInventory;
  summary.esports = esports;
  totalInserted += esports.insertedCount || 0;
  totalUpdated += esports.updatedCount || 0;
  totalRejected += esports.rejectedCount || 0;

  const india = await syncMetadataFeeds({
    country: 'in',
    limit: Math.max(normalizedQuota, 12)
  });
  summary.india = india;
  totalInserted += india.insertedCount || 0;
  totalUpdated += india.updatedCount || 0;
  totalRejected += india.rejectedCount || 0;

  console.log(
    `=== [UnifiedAggregator] Scraper sync finished: ${totalInserted} inserted, ` +
    `${totalUpdated} repaired, ${totalRejected} rejected ===`
  );

  return {
    totalInserted,
    totalUpdated,
    totalRejected,
    provider: getProviderStatus(),
    summary
  };
};
