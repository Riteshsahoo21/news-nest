import { Queue, Worker } from 'bullmq';
import { fetchAndSaveCurrentsNews } from '../services/currentsService.js';
import { fetchAndSaveYouTubeNews, fetchAndSaveCategoryVideos } from '../services/youtubeService.js';
import News from '../models/News.js';
import redisClient from '../config/redis.js';

// Define Queues
export const currentsQueue = new Queue('currentsQueue', { connection: redisClient });
export const youtubeQueue = new Queue('youtubeQueue', { connection: redisClient });
export const publisherQueue = new Queue('publisherQueue', { connection: redisClient });

// Add repeatable jobs (Equivalent to node-cron)
export const initQueues = async () => {
  console.log('Initializing BullMQ queues...');

  // Currents API: Every hour
  await currentsQueue.add('fetchCurrents', {}, {
    repeat: { pattern: '0 * * * *' }
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
};

// Define Workers
export const currentsWorker = new Worker('currentsQueue', async (job) => {
  console.log('BullMQ: Running Currents API fetch...');
  await fetchAndSaveCurrentsNews();
}, { connection: redisClient });

export const youtubeWorker = new Worker('youtubeQueue', async (job) => {
  console.log('BullMQ: Running YouTube API fetch...');
  await fetchAndSaveYouTubeNews();

  const categoriesToFetch = ['World', 'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'Science', 'Lifestyle'];
  for (const category of categoriesToFetch) {
    await fetchAndSaveCategoryVideos(category);
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}, { connection: redisClient });

export const publisherWorker = new Worker('publisherQueue', async (job) => {
  const now = new Date();
  const result = await News.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'approved' } }
  );
  if (result.modifiedCount > 0) {
    console.log(`BullMQ: Published ${result.modifiedCount} scheduled posts.`);
  }
}, { connection: redisClient });

// Error handling for workers
[currentsWorker, youtubeWorker, publisherWorker].forEach(worker => {
  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in queue ${worker.name}:`, err.message);
  });
});
