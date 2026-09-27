import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function updateViews() {
  await mongoose.connect(process.env.MONGO_URI);
  const News = mongoose.model('News', new mongoose.Schema({}, { strict: false }));
  const articles = await News.find({});
  for (const a of articles) {
     const views = Math.floor(Math.random() * 5000) + 10;
     await News.updateOne({ _id: a._id }, { $set: { views: views } });
  }
  console.log('Assigned random views to all existing articles.');
  process.exit(0);
}

updateViews();
