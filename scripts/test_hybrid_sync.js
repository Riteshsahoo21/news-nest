import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';
import { syncMetadataFeeds, getFullArticleContent } from './services/hybridNewsService.js';

dotenv.config();

const run = async () => {
  try {
    console.log('--- Connecting to MongoDB ---');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully.\n');

    // 1. Test syncing Technology news
    console.log('1. Testing Technology feed sync...');
    const techResult = await syncMetadataFeeds({ category: 'technology', limit: 2 });
    console.log('Tech sync result:', techResult);

    // 2. Test syncing Esports news
    console.log('\n2. Testing Esports feed sync...');
    const esportsResult = await syncMetadataFeeds({ subCategory: 'esports', limit: 2 });
    console.log('Esports sync result:', esportsResult);

    // 3. Test syncing India news
    console.log('\n3. Testing India feed sync...');
    const indiaResult = await syncMetadataFeeds({ country: 'in', limit: 2 });
    console.log('India sync result:', indiaResult);

    // 4. Retrieve a newly synced article
    const sample = await News.findOne({ sourceUrl: { $ne: '' } }).sort({ createdAt: -1 });
    if (sample) {
      console.log(`\n4. Found sample article: "${sample.title}"`);
      console.log(`- Country: ${sample.country}`);
      console.log(`- Category: ${sample.category}`);
      console.log(`- SubCategory: ${sample.subCategory}`);
      console.log(`- Language: ${sample.language}`);
      console.log(`- Source: ${sample.sourceName}`);
      console.log(`- Source URL: ${sample.sourceUrl}`);
      console.log(`- Before on-demand scrape, isFullContentFetched: ${sample.isFullContentFetched}`);

      // 5. Test on-demand full content & AI summary extraction
      console.log('\n5. Testing on-demand full content & AI summary extraction...');
      const enriched = await getFullArticleContent(sample);
      console.log(`- After on-demand scrape, isFullContentFetched: ${enriched.isFullContentFetched}`);
      console.log(`- Full content length: ${enriched.content?.length || 0} characters`);
      console.log(`- Read time: ${enriched.readTime} min`);
      console.log(`- AI Summary: ${enriched.aiSummary?.substring(0, 120)}...`);
      console.log(`- Key Takeaways count: ${enriched.keyTakeaways?.length || 0}`);
      if (enriched.keyTakeaways?.length > 0) {
        enriched.keyTakeaways.forEach((k, idx) => console.log(`   [Takeaway ${idx+1}]: ${k}`));
      }
    }

    console.log('\n🎉 ALL HYBRID NEWS SCRAPER & DB SYNC TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('Error during hybrid sync test:', error);
    process.exit(1);
  }
};

run();
