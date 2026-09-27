const mongoose = require('mongoose');
require('dotenv/config');
const VideoNews = require('./models/VideoNews.js').default || require('./models/VideoNews.js');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await VideoNews.deleteMany({ category: { $in: ['Science', 'Health', 'Sports', 'Entertainment', 'Lifestyle'] } });
  console.log('Mocked data removed');
  process.exit(0);
});
