import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';
import User from './models/User.js';
import { getFullArticleContent } from './services/hybridNewsService.js';

dotenv.config();

const run = async () => {
  try {
    console.log('--- Connecting to MongoDB ---');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Purge external aggregator articles older than 7 days (preserving native reporters and saved articles)
    const expiredResult = await News.deleteMany({
      authorId: null,
      isPermanent: false,
      savedBy: { $size: 0 },
      createdAt: { $lt: sevenDaysAgo }
    });
    console.log(`Purged ${expiredResult.deletedCount} expired external articles (> 7 days old).`);

    // 2. Find any remaining external articles with short text (< 350 chars)
    const stubs = await News.find({
      authorId: null,
      $or: [
        { content: { $exists: false } },
        { $expr: { $lt: [{ $strLenCP: { $ifNull: ["$content", ""] } }, 350] } }
      ]
    });

    console.log(`Found ${stubs.length} short/stub articles remaining.`);
    let enriched = 0;
    let deleted = 0;

    for (const doc of stubs) {
      if (doc.sourceUrl) {
        try {
          const updated = await getFullArticleContent(doc);
          if (updated && updated.content && updated.content.length >= 350) {
            enriched++;
            continue;
          }
        } catch {
          // ignore extraction error, will delete below
        }
      }

      // If cannot be enriched and has less than 350 characters, delete the poor quality stub
      await News.findByIdAndDelete(doc._id);
      deleted++;
    }

    console.log(`\n🎉 Cleanup Complete! Purged Expired: ${expiredResult.deletedCount} | Enriched: ${enriched} | Stubs Deleted: ${deleted}`);
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

run();
