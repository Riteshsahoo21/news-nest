import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from '../models/News.js';
import VideoNews from '../models/VideoNews.js';
import { generateTags } from '../utils/tagGenerator.js';

dotenv.config();

const backfillTags = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Backfilling tags...');

    // Backfill News
    const newsArticles = await News.find({ $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] });
    console.log(`Found ${newsArticles.length} News articles without tags.`);
    let newsUpdated = 0;
    for (const article of newsArticles) {
      const tags = generateTags(article.title, article.content, article.category);
      if (tags.length > 0) {
        article.tags = tags;
        await article.save();
        newsUpdated++;
      }
    }
    console.log(`Successfully backfilled tags for ${newsUpdated} News articles.`);

    // Backfill VideoNews
    const videos = await VideoNews.find({ $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] });
    console.log(`Found ${videos.length} VideoNews without tags.`);
    let videosUpdated = 0;
    for (const video of videos) {
      const tags = generateTags(video.title, video.description, video.category);
      if (tags.length > 0) {
        video.tags = tags;
        await video.save();
        videosUpdated++;
      }
    }
    console.log(`Successfully backfilled tags for ${videosUpdated} VideoNews.`);

    console.log('Tag backfill complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error backfilling tags:', error);
    process.exit(1);
  }
};

backfillTags();
