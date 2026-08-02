import axios from 'axios';
import mongoose from 'mongoose';
import News from '../models/News.js';
import * as cheerio from 'cheerio';
import { createSlug } from '../utils/slugify.js';

const VALID_CATEGORIES = ['world', 'politics', 'sports', 'technology', 'business', 'entertainment', 'health', 'science', 'lifestyle'];

const isValidPublisherImage = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'None') return false;
  const l = url.toLowerCase();
  if (l.includes('tass') || l.includes('logo') || l.includes('default') || l.includes('placeholder') || l.includes('favicon') || l.includes('unsplash.com')) {
    return false;
  }
  return true;
};

const cleanText = (str) => {
  if (!str) return '';
  return str
    .replace(/\\u([\d\w]{4})/gi, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const isAnomalyOrOffTopic = (article, category) => {
  const title = (article.title || '').toLowerCase().trim();
  const content = (article.content || '').toLowerCase().trim();
  const author = (article.author || '').toLowerCase().trim();
  const combined = `${title} ${content.slice(0, 600)}`;

  const universalBanned = [
    'dwuibdwq', 'wkjqdbjkqd', 'what a joke', 'test_', '/u/', 'daily reporter', 
    'anime billionaire codes', 'cookie run', 'roblox', 'genshin impact codes', 
    'redeem code', 'free codes', 'mod apk', 'onlyfans'
  ];
  if (universalBanned.some(b => title.includes(b) || author.includes(b)) || title.length < 15) {
    return true;
  }

  switch (category) {
    case 'sports': {
      const banned = [
        'codes', 'code', 'anime', 'roblox', 'cookie run', 'genshin', 'honkai', 'valorant', 
        'fortnite', 'warzone', 'black ops', 'call of duty', 'minecraft', 'pokemon', 'gta ', 
        'wwe ', 'wrestlemania', 'aew ', 'royal rumble', 'logan paul', 'jake paul', 'kai cenat', 
        'twitch', 'streamer', 'esports', 'e-sports', 'nintendo', 'playstation', 'xbox', 'tier list'
      ];
      if (banned.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'health': {
      const banned = ['erling haaland', 'premier league', 'world cup', 'champions league', 'nba finals', 'cricket match', 'fortnite', 'warzone', 'roblox', 'afl'];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'science': {
      const banned = [
        'election polling', 'parliamentary vote', 'warzone', 'fortnite', 'nba', 'nfl', 
        'premier league', 'roblox', 'codes', 'logan paul', 'zuckerberg', 'meta ceo', 
        'cnn business', 'stock market', 'earnings call'
      ];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'technology': {
      const banned = [
        'anime billionaire codes', 'cookie run codes', 'roblox codes', 'plunging gown', 
        'wardrobe malfunction', 'avengers:', 'doomsday', 'movie trailer', 'film festival', 
        'box office', 'actor', 'actress', 'hollywood', 'marvel'
      ];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'entertainment': {
      const banned = ['bbc license fee', 'quarterly dividend', 'ebitda', 'fiscal deficit', '/u/', 'subreddit', 'warzone cheat', 'roblox codes'];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'lifestyle': {
      const banned = [
        'rides high on her thighs', 'couldn\'t possibly be more see-through', 'plunging gown', 
        'warzone', 'murder', 'assault', 'nfl', 'nba', 'codes', 'roblox', 'logan paul', 
        'afl star', 'footballer', 'cricket', 'rugby', 'match score', 'cut ties'
      ];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'business': {
      const banned = ['studscout', 'anime codes', 'cookie run', 'wwe', 'warzone', 'roblox', 'logan paul'];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
    case 'world':
    case 'politics': {
      const banned = ['codes', 'roblox', 'anime', 'cookie run', 'wwe', 'warzone', 'zendaya', 'nicole kidman', 'logan paul', 'jake paul', 'avengers', 'movie trailer'];
      if (banned.some(b => title.includes(b))) return true;
      break;
    }
  }

  return false;
};

const scrapeArticleFullText = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    
    let content = '';
    const articleSelectors = [
      'article', '.article-content', '.story-body', '.entry-content', 'main', '.post-content', '#main-content'
    ];

    for (const selector of articleSelectors) {
      if ($(selector).length > 0) {
        $(selector).find('p').each((i, el) => {
          content += $(el).text().trim() + '\n\n';
        });
        if (content.trim().length > 0) break;
      }
    }

    if (content.trim().length === 0) {
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) {
          content += text + '\n\n';
        }
      });
    }

    return content.trim();
  } catch (error) {
    return null;
  }
};

export const fetchAndSaveGNews = async () => {
  try {
    let apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      console.warn('GNews API key is missing. Skipping news fetch.');
      return;
    }
    apiKey = apiKey.trim();

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

    for (const [gnewsCategory, ourCategory] of Object.entries(categoryMap)) {
      try {
        console.log(`Fetching GNews for category: ${gnewsCategory}...`);
        const response = await axios.get(`https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&apikey=${apiKey}`);
        
        if (response.data && response.data.articles) {
          const articles = response.data.articles;
          let newCount = 0;
          let tassCount = 0;

          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            if (!article.title) continue;
            const cleanTitle = cleanText(article.title);
            const cleanAuthorText = cleanText(article.source?.name || 'GNews');

            if (cleanTitle.toLowerCase().includes('/tass/') || cleanAuthorText.toLowerCase().includes('tass')) {
              tassCount++;
              if (tassCount > 1) continue;
            }

            const photoUrl = article.image;
            if (!isValidPublisherImage(photoUrl)) {
              continue; 
            }

            const existingImage = await News.findOne({ imageUrl: photoUrl });
            if (existingImage && existingImage.title !== cleanTitle) {
              continue; 
            }

            const existingArticle = await News.findOne({ title: cleanTitle });
            if (existingArticle) continue; 

            let fullContent = null;
            if (article.url) {
                fullContent = await scrapeArticleFullText(article.url);
            }
            
            const finalContent = cleanText(fullContent || article.content || article.description || cleanTitle);

            if (isAnomalyOrOffTopic({ title: cleanTitle, content: finalContent, author: cleanAuthorText }, ourCategory)) {
              continue;
            }

            let authorToSave = cleanAuthorText;
            if (authorToSave.startsWith('/u/') || !authorToSave || authorToSave === 'None' || authorToSave.toLowerCase().includes('daily reporter')) {
              authorToSave = `${ourCategory.charAt(0).toUpperCase() + ourCategory.slice(1)} Editorial Desk`;
            }

            const newsData = {
              title: cleanTitle,
              slug: createSlug(cleanTitle, new mongoose.Types.ObjectId()),
              content: finalContent, 
              category: ourCategory, 
              author: authorToSave,
              imageUrl: photoUrl,
              status: 'approved',
              isEditorPick: false,
              isTrending: true, 
              readTime: Math.max(1, Math.ceil((finalContent?.length || 500) / 1000)),
            };

            const updated = await News.findOneAndUpdate(
              { title: cleanTitle },
              { $setOnInsert: newsData },
              { upsert: true, new: true, rawResult: true }
            );
            
            if (updated.lastErrorObject?.updatedExisting === false) {
               newCount++;
            }
          }
          console.log(`Inserted ${newCount} pristine publisher-photo articles for category: ${ourCategory}`);
          totalInserted += newCount;
        }
      } catch (err) {
        console.error(`Error fetching category ${gnewsCategory}:`, err?.response?.data || err.message);
      }
    }

    console.log(`Successfully inserted a total of ${totalInserted} new articles from GNews.`);

  } catch (error) {
    console.error('Error fetching from GNews API:', error?.response?.data || error.message);
  }
};
