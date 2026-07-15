import axios from 'axios';
import News from '../models/News.js';

export const fetchAndSaveCurrentsNews = async () => {
  try {
    let apiKey = process.env.CURRENTS_API_KEY;
    if (!apiKey) {
      console.warn('Currents API key is missing. Skipping news fetch.');
      return;
    }
    apiKey = apiKey.trim();

    // Currents API categories
    const categories = [
      'world', 'politics', 'business', 'technology', 
      'entertainment', 'sports', 'science', 'health', 'lifestyle'
    ];

    let totalInserted = 0;

    // Fetch for each category
    for (const category of categories) {
      try {
        console.log(`Fetching Currents News for category: ${category}...`);
        const response = await axios.get(`https://api.currentsapi.services/v1/latest-news?language=en&category=${category}&apiKey=${apiKey}`);
        
        if (response.data && response.data.news) {
          const articles = response.data.news;
          let newCount = 0;

          for (const article of articles) {
            const newsData = {
              title: article.title,
              content: article.description || article.title, 
              category: category, 
              author: article.author || 'Currents API',
              imageUrl: article.image === 'None' ? null : article.image,
              status: 'approved',
              isEditorPick: false,
              isTrending: true, 
              readTime: Math.max(1, Math.ceil((article.description?.length || 500) / 1000)),
              views: Math.floor(Math.random() * 5000), // Ensures mixed categories on home page
            };

            const updated = await News.findOneAndUpdate(
              { title: article.title },
              { $setOnInsert: newsData },
              { upsert: true, new: true, rawResult: true }
            );
            
            if (updated.lastErrorObject?.updatedExisting === false) {
               newCount++;
            }
          }
          console.log(`Inserted ${newCount} new articles for category: ${category}`);
          totalInserted += newCount;
        }
      } catch (err) {
        console.error(`Error fetching category ${category}:`, err?.response?.data || err.message);
      }
    }

    console.log(`Successfully inserted a total of ${totalInserted} new articles from Currents API into the database.`);
  } catch (error) {
    console.error('Error fetching from Currents API:', error?.response?.data || error.message);
  }
};
