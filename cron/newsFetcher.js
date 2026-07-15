import cron from 'node-cron';
import { fetchAndSaveCurrentsNews } from '../services/currentsService.js';
import { fetchAndSaveYouTubeNews } from '../services/youtubeService.js';

// Schedule the cron job to run every hour (at minute 0)
// This translates to 24 requests per day, well within the 100 limit.
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled news fetch job from Currents API & YouTube API...');
    await fetchAndSaveCurrentsNews();
    await fetchAndSaveYouTubeNews();
  });

  console.log('Cron jobs initialized: News fetchers scheduled every hour.');
  
  // Run it immediately on startup
  setTimeout(() => {
    fetchAndSaveCurrentsNews();
    fetchAndSaveYouTubeNews();
  }, 5000); 
};
