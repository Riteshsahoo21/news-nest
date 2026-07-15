import 'dotenv/config';
import mongoose from 'mongoose';
import VideoNews from './models/VideoNews.js';
import { fetchAndSaveYouTubeNews } from './services/youtubeService.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Clear existing VideoNews
    await VideoNews.deleteMany({});
    console.log('Cleared existing VideoNews');
    
    // Fetch fresh ones
    await fetchAndSaveYouTubeNews();
    console.log('Fetched fresh YouTube news');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
