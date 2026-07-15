import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const news = await News.find({ category: 'jokes' }).lean();
    console.log(news.map(n => ({ title: n.title, status: n.status })));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
