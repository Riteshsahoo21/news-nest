import axios from 'axios';
import News from '../models/News.js';

export const fetchAndSaveGNews = async () => {
  try {
    let apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      console.warn('GNews API key is missing. Skipping news fetch.');
      return;
    }
    apiKey = apiKey.trim();

    // Mapping GNews categories to our DB categories
    const categoryMap = {
      'world': 'world',
      'nation': 'politics',
      'business': 'business',
      'technology': 'technology',
      'entertainment': 'entertainment',
      'sports': 'sports',
      'science': 'science',
      'health': 'health'
    };

    let totalInserted = 0;

    // Fetch for each category
    for (const [gnewsCategory, ourCategory] of Object.entries(categoryMap)) {
      try {
        console.log(`Fetching GNews for category: ${gnewsCategory}...`);
        const response = await axios.get(`https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&apikey=${apiKey}`);
        
        if (response.data && response.data.articles) {
          const articles = response.data.articles;
          let newCount = 0;

          for (const article of articles) {
            const newsData = {
              title: article.title,
              content: article.content || article.description, 
              category: ourCategory, 
              author: article.source?.name || 'GNews',
              imageUrl: article.image,
              status: 'approved',
              isEditorPick: false,
              isTrending: true, 
              readTime: Math.max(1, Math.ceil((article.content?.length || 500) / 1000)),
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
          console.log(`Inserted ${newCount} new articles for category: ${ourCategory}`);
          totalInserted += newCount;
        }
      } catch (err) {
        console.error(`Error fetching category ${gnewsCategory}:`, err?.response?.data || err.message);
      }
    }

    console.log(`Successfully inserted a total of ${totalInserted} new articles from GNews into the database.`);
  } catch (error) {
    console.error('Error fetching from GNews API:', error?.response?.data || error.message);
  }
};
