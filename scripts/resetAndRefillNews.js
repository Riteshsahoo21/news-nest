import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import {
  COMPLETE_ARTICLE_FILTER,
  NEWS_CATEGORIES,
  syncHarmonizedNews
} from '../services/unifiedNewsAggregator.js';

const REQUIRED_CONFIRMATION = 'YES';

const run = async () => {
  if (process.env.CONFIRM_NEWS_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error('Set CONFIRM_NEWS_RESET=YES to confirm deletion of the News collection.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const beforeCount = await News.countDocuments();
  const deletion = await News.deleteMany({});
  console.log(`[NewsReset] Deleted ${deletion.deletedCount} of ${beforeCount} news articles.`);

  const syncResult = await syncHarmonizedNews(12);
  const categoryCounts = await News.aggregate([
    { $match: COMPLETE_ARTICLE_FILTER },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const totalStored = await News.countDocuments();
  const completeStored = await News.countDocuments(COMPLETE_ARTICLE_FILTER);
  const incompleteCount = totalStored - completeStored;
  const countsByCategory = new Map(categoryCounts.map((item) => [item._id, item.count]));
  const insufficientCategories = NEWS_CATEGORIES
    .map((category) => ({ category, count: countsByCategory.get(category) || 0 }))
    .filter((item) => item.count < 12);

  console.log(JSON.stringify({
    deleted: deletion.deletedCount,
    inserted: syncResult.totalInserted,
    updated: syncResult.totalUpdated,
    rejectedBeforeStorage: syncResult.totalRejected,
    incompleteStored: incompleteCount,
    insufficientCategories,
    categoryCounts
  }, null, 2));

  if (incompleteCount > 0 || insufficientCategories.length > 0) {
    throw new Error(
      `Quality verification failed: ${incompleteCount} incomplete articles; ` +
      `${insufficientCategories.length} categories below 12 complete stories.`
    );
  }
};

run()
  .catch((error) => {
    console.error(`[NewsReset] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
