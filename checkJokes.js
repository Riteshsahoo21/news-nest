import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const news = await News.find({ category: 'jokes' }).lean();
    console.log('Jokes articles:', news.length);
    console.log(news.map(n => n.title));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
