import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fetchAndSaveCurrentsNews } from './services/currentsService.js';
import News from './models/News.js';

dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('Deleting "lifestyle" articles to force a fresh fetch from the API...');
        const res = await News.deleteMany({ category: 'lifestyle' });
        console.log(`Deleted ${res.deletedCount} articles.`);
        
        console.log('Running fetch service (this will take 1-2 minutes because it is scraping the full text)...');
        await fetchAndSaveCurrentsNews();
        
        console.log('Done! The "lifestyle" category should now have fully scraped articles.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
