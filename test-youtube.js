import 'dotenv/config';
import mongoose from 'mongoose';
import { fetchAndSaveYouTubeNews } from './services/youtubeService.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await fetchAndSaveYouTubeNews();
  process.exit(0);
};
run();
