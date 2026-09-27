import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import { syncMetadataFeeds } from '../services/hybridNewsService.js';
import { COMPLETE_ARTICLE_FILTER, NEWS_CATEGORIES } from '../services/unifiedNewsAggregator.js';

const run = async () => {
  const category = String(process.argv[2] || '').toLowerCase();
  const limit = Math.min(Math.max(Number.parseInt(process.argv[3], 10) || 30, 1), 30);
  const isEsports = category === 'esports';
  if (!NEWS_CATEGORIES.includes(category) && !isEsports) {
    throw new Error(`Category must be one of: ${NEWS_CATEGORIES.join(', ')}, esports`);
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');

  await mongoose.connect(process.env.MONGO_URI);
  const selector = isEsports ? { subCategory: 'esports' } : { category };
  const result = await syncMetadataFeeds({ ...selector, limit });
  const completeInventory = await News.countDocuments({ ...COMPLETE_ARTICLE_FILTER, ...selector });
  const publishers = await News.distinct('sourceName', { ...COMPLETE_ARTICLE_FILTER, ...selector });
  console.log(JSON.stringify({
    category,
    limit,
    result,
    completeInventory,
    uniquePublishers: publishers.filter(Boolean).length
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(`[CategorySync] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
