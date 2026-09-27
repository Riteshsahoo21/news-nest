import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from '../models/News.js';

dotenv.config();

const check = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const article = await News.findOne({ tags: { $exists: true, $not: { $size: 0 } } });
  console.log('ID:', article._id.toString());
  console.log('Slug:', article.slug);
  console.log('Tags:', article.tags);
  process.exit(0);
};

check();
