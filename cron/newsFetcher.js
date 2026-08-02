import cron from 'node-cron';
import { fetchAndSaveCurrentsNews } from '../services/currentsService.js';
import { fetchAndSaveYouTubeNews, fetchAndSaveCategoryVideos, balanceAllCategoryCounts } from '../services/youtubeService.js';
import News from '../models/News.js';

// Schedule Currents API to run every hour
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled news fetch job from Currents API...');
    await fetchAndSaveCurrentsNews();
  });

  // Schedule YouTube API to run every 6 hours to respect the 100 requests/day limit safely
  // 8 categories + 2 generic searches = 10 requests per run * 4 runs/day = 40 requests/day.
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled YouTube video fetch job for all categories...');
    try {
      await fetchAndSaveYouTubeNews();
      
      const categoriesToFetch = ['World', 'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'Science', 'Lifestyle'];
      for (const category of categoriesToFetch) {
         await fetchAndSaveCategoryVideos(category);
         // Add a small delay between requests to avoid rate limit spikes
         await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Ensure equal volume of news articles/videos across all 9 categories
      await balanceAllCategoryCounts(15);
    } catch (err) {
      console.error('Scheduled YouTube fetch failed:', err.message);
    }
  });

  console.log('Cron jobs initialized: Currents (1h), YouTube (6h).');
  
  // Job to publish scheduled posts every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find posts where status is scheduled and scheduledAt is in the past
      const result = await News.updateMany(
        { status: 'scheduled', scheduledAt: { $lte: now } },
        { $set: { status: 'approved' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Published ${result.modifiedCount} scheduled posts.`);
      }
    } catch (error) {
      console.error('Error in scheduled post publisher:', error);
    }
  });

  // Run it immediately on startup (Currents API ONLY)
  // We DO NOT run YouTube API on startup to prevent nodemon restarts from burning the 100 searches/day quota.
  setTimeout(async () => {
    fetchAndSaveCurrentsNews();
  }, 5000); 
};
