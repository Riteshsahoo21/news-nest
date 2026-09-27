import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    
    // Update all News articles
    const newsResult = await mongoose.connection.collection('news').updateMany({}, { $set: { views: 0 } });
    console.log(`Reset views for ${newsResult.modifiedCount} articles.`);
    
    // Update all VideoNews
    const videoResult = await mongoose.connection.collection('videonews').updateMany({}, { $set: { views: 0 } });
    console.log(`Reset views for ${videoResult.modifiedCount} videos.`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

connectDB();
