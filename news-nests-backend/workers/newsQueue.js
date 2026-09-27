import { Queue, Worker } from 'bullmq';
import { syncHarmonizedNews } from '../services/unifiedNewsAggregator.js';
import { fetchAndSaveYouTubeNews, fetchAndSaveCategoryVideos } from '../services/youtubeService.js';
import News from '../models/News.js';
import redisClient from '../config/redis.js';

// Define Queues
export const currentsQueue = redisClient ? new Queue('currentsQueue', { connection: redisClient }) : null;
export const youtubeQueue = redisClient ? new Queue('youtubeQueue', { connection: redisClient }) : null;
export const publisherQueue = redisClient ? new Queue('publisherQueue', { connection: redisClient }) : null;

// Add repeatable jobs (Equivalent to node-cron)
export const initQueues = async () => {
  if (!redisClient) {
    console.warn('BullMQ disabled because Redis is not configured.');
    return false;
  }

  console.log('Initializing BullMQ queues...');

  // Curated RSS + multi-provider discovery + full extraction: every hour
  await currentsQueue.add('fetchCurrents', {}, {
    repeat: { pattern: '0 * * * *' }
  });
  await currentsQueue.add('fetchNewsOnStartup', {}, {
    // One warm-up per hour across restarts/deploy replicas. The worker's
    // deduplication keeps the database free of repeated stories.
    jobId: `news-startup-${Math.floor(Date.now() / (60 * 60 * 1000))}`
  });

  // YouTube API: Every 6 hours
  await youtubeQueue.add('fetchYouTube', {}, {
    repeat: { pattern: '0 */6 * * *' }
  });

  // Publisher: Every minute
  await publisherQueue.add('publishScheduled', {}, {
    repeat: { pattern: '* * * * *' }
  });

  console.log('BullMQ repeatable jobs registered.');
  return true;
};

// Define Workers
export const currentsWorker = redisClient ? new Worker('currentsQueue', async (job) => {
  console.log('BullMQ: Running synchronized RSS/GDELT/Google/Bing scraper pipeline...');
  await syncHarmonizedNews(8);
}, { connection: redisClient }) : null;

export const youtubeWorker = redisClient ? new Worker('youtubeQueue', async (job) => {
  console.log('BullMQ: Running YouTube API fetch...');
  await fetchAndSaveYouTubeNews();

  const categoriesToFetch = ['World', 'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'Science', 'Lifestyle'];
  for (const category of categoriesToFetch) {
    await fetchAndSaveCategoryVideos(category);
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}, { connection: redisClient }) : null;

export const publisherWorker = redisClient ? new Worker('publisherQueue', async (job) => {
  const now = new Date();
  const result = await News.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'approved' } }
  );
  if (result.modifiedCount > 0) {
    console.log(`BullMQ: Published ${result.modifiedCount} scheduled posts.`);
  }
}, { connection: redisClient }) : null;

// Error handling for workers
[currentsWorker, youtubeWorker, publisherWorker].filter(Boolean).forEach(worker => {
  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in queue ${worker.name}:`, err.message);
  });
});
