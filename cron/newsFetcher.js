import cron from 'node-cron';
import { fetchAndSaveCurrentsNews } from '../services/currentsService.js';
import { fetchAndSaveYouTubeNews } from '../services/youtubeService.js';
import News from '../models/News.js';

// Schedule the cron job to run every hour (at minute 0)
// This translates to 24 requests per day, well within the 100 limit.
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled news fetch job from Currents API & YouTube API...');
    await fetchAndSaveCurrentsNews();
    await fetchAndSaveYouTubeNews();
  });

  console.log('Cron jobs initialized: News fetchers scheduled every hour.');
  
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

  // Run it immediately on startup
  setTimeout(() => {
    fetchAndSaveCurrentsNews();
    fetchAndSaveYouTubeNews();
  }, 5000); 
};
