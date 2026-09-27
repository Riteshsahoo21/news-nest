import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fetchAndSaveCurrentsNews } from './services/currentsService.js';
import News from './models/News.js';

dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');
        
        // Let's delete the most recent 3 articles to guarantee we fetch something "new"
        const recent = await News.find().sort({ createdAt: -1 }).limit(3);
        if (recent.length > 0) {
            console.log('\nDeleting the following 3 recent articles so the scraper is forced to fetch them fresh:');
            for(let doc of recent) {
                console.log(`- ${doc.title}`);
                await News.findByIdAndDelete(doc._id);
            }
        }

        console.log('\nRunning fetch service...');
        await fetchAndSaveCurrentsNews();
        
        console.log('\nDone fetching! The articles should now have full content.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
