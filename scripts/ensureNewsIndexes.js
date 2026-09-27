import 'dotenv/config';
import mongoose from 'mongoose';
import News from '../models/News.js';

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  await mongoose.connect(process.env.MONGO_URI);
  await News.syncIndexes();
  const indexes = await News.collection.indexes();
  const sourceUrlIndex = indexes.find((index) => index.key?.sourceUrl === 1);
  console.log(JSON.stringify({
    sourceUrlIndexPresent: Boolean(sourceUrlIndex),
    unique: Boolean(sourceUrlIndex?.unique),
    sparse: Boolean(sourceUrlIndex?.sparse),
    name: sourceUrlIndex?.name || null
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(`[NewsIndexes] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
