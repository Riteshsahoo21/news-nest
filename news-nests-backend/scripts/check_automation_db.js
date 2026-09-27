import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import Subscriber from '../models/Subscriber.js';

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const totalNews = await News.countDocuments();
  const approvedNews = await News.countDocuments({ status: 'approved' });
  const pendingEmbedding = await News.countDocuments({
    status: 'approved',
    $or: [{ embeddingId: { $exists: false } }, { embeddingId: '' }, { embeddingId: null }]
  });
  const embeddedNews = await News.countDocuments({
    status: 'approved',
    embeddingId: { $exists: true, $nin: ['', null] }
  });
  const totalLiveBlogs = await LiveBlog.countDocuments();
  const activeLiveBlogs = await LiveBlog.countDocuments({ isLive: true });
  const totalSubscribers = await Subscriber.countDocuments();
  const activeSubscribers = await Subscriber.countDocuments({ isActive: true });

  console.log(JSON.stringify({
    totalNews,
    approvedNews,
    pendingEmbedding,
    embeddedNews,
    totalLiveBlogs,
    activeLiveBlogs,
    totalSubscribers,
    activeSubscribers
  }, null, 2));

  const sampleArticles = await News.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(3).select('title backstory embeddingId relatedArticles isDuplicateEcho');
  console.log('Sample approved articles:', JSON.stringify(sampleArticles, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);
