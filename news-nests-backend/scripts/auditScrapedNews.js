import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import {
  COMPLETE_ARTICLE_FILTER,
  NEWS_CATEGORIES
} from '../services/unifiedNewsAggregator.js';

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  await mongoose.connect(process.env.MONGO_URI);

  const total = await News.countDocuments();
  const complete = await News.countDocuments(COMPLETE_ARTICLE_FILTER);
  const categoryCounts = await News.aggregate([
    { $match: COMPLETE_ARTICLE_FILTER },
    { $group: { _id: '$category', count: { $sum: 1 }, minBodyLength: { $min: { $strLenCP: '$content' } } } },
    { $sort: { _id: 1 } }
  ]);
  const [duplicateSourceUrls, duplicateTitles] = await Promise.all([
    News.aggregate([
      { $match: { sourceUrl: { $regex: /^https?:\/\//i } } },
      { $group: { _id: '$sourceUrl', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' }
    ]),
    News.aggregate([
      { $group: { _id: { $toLower: '$title' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' }
    ])
  ]);
  const counts = new Map(categoryCounts.map((item) => [item._id, item]));
  const categories = NEWS_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category)?.count || 0,
    minBodyLength: counts.get(category)?.minBodyLength || 0
  }));

  console.log(JSON.stringify({
    total,
    complete,
    incomplete: total - complete,
    duplicateSourceUrlGroups: duplicateSourceUrls[0]?.groups || 0,
    duplicateTitleGroups: duplicateTitles[0]?.groups || 0,
    everyStoredArticleIsComplete: total === complete,
    everyCategoryHasAtLeast12: categories.every((item) => item.count >= 12),
    categories
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(`[NewsAudit] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
