import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';
import { discoverLocalNews } from '../services/liveDiscoveryService.js';
import { isCompleteScrapedArticle } from '../services/hybridNewsService.js';
import { buildLiteralSearchRegex, normalizeSearchQuery } from '../utils/searchQuery.js';

const city = normalizeSearchQuery(process.argv[2] || 'Bhubaneswar').slice(0, 100);
const region = normalizeSearchQuery(process.argv[3] || 'Odisha').slice(0, 100);
const countryCode = normalizeSearchQuery(process.argv[4] || 'in').toLowerCase().slice(0, 2);

try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI);

  const discovery = await discoverLocalNews(
    { city, region, countryCode, country: countryCode.toUpperCase() },
    { limit: 4 }
  );
  const placeRegexes = [city, region].filter(Boolean).map(buildLiteralSearchRegex);
  const placeSignals = placeRegexes.flatMap((regex) => ([
    { city: { $regex: regex } },
    { region: { $regex: regex } },
    { title: { $regex: regex } },
    { subtitle: { $regex: regex } },
    { content: { $regex: regex } },
    { tags: { $regex: regex } }
  ]));
  const results = await News.find({
    status: 'approved',
    sourceUrl: { $regex: /^https?:\/\//i },
    $or: placeSignals
  }).sort({ publishedAt: -1 }).limit(8);
  const complete = results.filter((article) => isCompleteScrapedArticle(article));

  console.log(JSON.stringify({
    location: { city, region, countryCode },
    discovery,
    regionalResults: results.length,
    completeResults: complete.length,
    samples: complete.slice(0, 5).map((article) => ({
      title: article.title,
      sourceName: article.sourceName,
      provider: article.discoveryProvider,
      city: article.city,
      region: article.region,
      contentLength: article.content.length
    }))
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
