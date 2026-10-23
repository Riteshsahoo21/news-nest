import axios from 'axios';
import mongoose from 'mongoose';
import News from '../models/News.js';
import * as cheerio from 'cheerio';
import { createSlug } from '../utils/slugify.js';
import { generateTags } from '../utils/tagGenerator.js';

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

export const isStrictlyMiscategorizedOrOffTopic = (article, category) => {
  const title = (article.title || '').toLowerCase().trim();
  const content = (article.content || '').toLowerCase().trim();
  const author = (article.author || '').toLowerCase().trim();
  const combined = `${title} ${content.slice(0, 600)}`;

  const universalBanned = [
    'dwuibdwq', 'wkjqdbjkqd', 'what a joke', 'test_', '/u/', 'daily reporter', 
    'anime billionaire codes', 'cookie run', 'roblox', 'genshin impact codes', 
    'redeem code', 'free codes', 'mod apk', 'onlyfans', 'horoscope', 'zodiac sign', 'tarot reading'
  ];
  if (universalBanned.some(b => title.includes(b) || author.includes(b) || combined.includes(b)) || title.length < 15) {
    return true;
  }

  switch (category) {
    case 'business': {
      const notBusiness = [
        'ekadashi', 'diwali', 'holi', 'puja', 'parana time', 'astrology', 'horoscope',
        'experience life magazine', 'celebrates 25 years', 'wedding dress', 'bridal',
        'bhopal gas tragedy', 'murder', 'assault', 'robbery', 'serial killer',
        'warzone', 'fortnite', 'roblox', 'logan paul', 'jake paul', 'kpop', 'bts '
      ];
      if (notBusiness.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'technology': {
      const notTech = [
        'anime billionaire codes', 'cookie run codes', 'roblox codes', 'plunging gown', 
        'wardrobe malfunction', 'avengers:', 'doomsday', 'movie trailer', 'film festival', 
        'box office', 'actor', 'actress', 'hollywood', 'marvel', 'premier league', 'cricket match'
      ];
      if (notTech.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'science': {
      const notScience = [
        'election polling', 'parliamentary vote', 'warzone', 'fortnite', 'nba', 'nfl', 
        'premier league', 'roblox', 'codes', 'logan paul', 'zuckerberg', 'meta ceo', 
        'cnn business', 'stock market', 'earnings call', 'divorce', 'celebrity'
      ];
      if (notScience.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'health': {
      const notHealth = [
        'erling haaland', 'premier league', 'world cup', 'champions league', 'nba finals', 
        'cricket match', 'fortnite', 'warzone', 'roblox', 'afl star', 'stock dividend', 'fiscal quarter'
      ];
      if (notHealth.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'sports': {
      const notSports = [
        'codes', 'code', 'anime', 'roblox', 'cookie run', 'genshin', 'honkai', 'valorant', 
        'fortnite', 'warzone', 'black ops', 'call of duty', 'minecraft', 'pokemon', 'gta ', 
        'wwe ', 'wrestlemania', 'aew ', 'royal rumble', 'logan paul', 'jake paul', 'kai cenat', 
        'twitch', 'streamer', 'esports', 'e-sports', 'nintendo', 'playstation', 'xbox', 'tier list',
        'earnings report', 'parliament bill'
      ];
      if (notSports.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'entertainment': {
      const notEnt = ['bbc license fee', 'quarterly dividend', 'ebitda', 'fiscal deficit', '/u/', 'subreddit', 'warzone cheat', 'roblox codes', 'central bank', 'inflation rate'];
      if (notEnt.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'lifestyle': {
      const notLife = [
        'rides high on her thighs', 'couldn\'t possibly be more see-through', 'plunging gown', 
        'warzone', 'murder', 'assault', 'nfl', 'nba', 'codes', 'roblox', 'logan paul', 
        'afl star', 'footballer', 'cricket', 'rugby', 'match score', 'cut ties', 'stock drop', 'bankruptcy'
      ];
      if (notLife.some(b => title.includes(b) || combined.includes(b))) return true;
      break;
    }
    case 'world':
    case 'politics': {
      const notPol = ['codes', 'roblox', 'anime', 'cookie run', 'wwe', 'warzone', 'zendaya', 'nicole kidman', 'logan paul', 'jake paul', 'avengers', 'movie trailer', 'horoscope', 'zodiac'];
      if (notPol.some(b => title.includes(b) || combined.includes(b))) return true;
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

const KEYWORD_MAP = {
  business: ['economy', 'banking', 'finance', 'stock market', 'investment', 'corporate trade', 'central bank', 'inflation', 'global commerce'],
  technology: ['artificial intelligence', 'semiconductors', 'cybersecurity', 'cloud computing', 'quantum computing', 'smartphones', 'electric vehicles', 'software engineering'],
  science: ['space exploration', 'nasa telescope', 'astrophysics', 'archaeology discovery', 'paleontology fossil', 'marine biology', 'renewable energy science'],
  health: ['medical clinical trial', 'cardiovascular health', 'neuroscience research', 'nutrition wellness', 'hospital medical oncology', 'public health healthcare'],
  sports: ['premier league soccer', 'tennis grand slam', 'nba basketball game', 'nfl football championship', 'cricket test match', 'formula 1 race', 'golf pga tournament'],
  entertainment: ['cinema film box office', 'music grammy award', 'television streaming series', 'theater show premiere', 'actor film performance'],
  lifestyle: ['architecture design home', 'sustainable fashion trend', 'culinary luxury dining', 'travel tourism resort', 'wellness mindfulness habit'],
  world: ['international diplomacy summit', 'united nations global', 'cross border alliance', 'global humanitarian relief', 'geopolitics diplomacy'],
  politics: ['parliament legislative session', 'senate policy bill', 'supreme court ruling', 'government fiscal debate', 'election diplomacy policy']
};

export const fetchAndSaveCurrentsNews = async ({
  includeKeywordExpansion = true,
  maxCandidatesPerCategory = Number.POSITIVE_INFINITY
} = {}) => {
  try {
    let apiKey = process.env.CURRENTS_API_KEY;
    if (!apiKey) {
      console.warn('Currents API key is missing. Skipping Currents fetch.');
      return { totalInserted: 0, reason: 'missing api key' };
    }
    apiKey = apiKey.trim();

    let totalInserted = 0;

    for (const category of VALID_CATEGORIES) {
      console.log(`\n--- Processing category: [ ${category.toUpperCase()} ] via Currents API & Keyword Expansion ---`);
      
      // We gather articles from both standard category endpoint and keyword search endpoints
      const endpoints = [
        `https://api.currentsapi.services/v1/latest-news?category=${category}&language=en&apiKey=${apiKey}`
      ];
      
      if (includeKeywordExpansion) {
        const keywords = KEYWORD_MAP[category] || [];
        for (const kw of keywords) {
          endpoints.push(`https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(kw)}&language=en&apiKey=${apiKey}`);
        }
      }

      let newCount = 0;
      let candidateCount = 0;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { timeout: 12000 });
          const articles = response.data?.news || [];
          let tassCount = 0;

          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            if (!article.title || !article.url) continue;
            if (candidateCount >= maxCandidatesPerCategory) break;
            const cleanTitle = cleanText(article.title);
            const cleanAuthorText = cleanText(article.author || 'Currents News');

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
            const existingSource = await News.findOne({ sourceUrl: article.url });
            if (existingSource) continue;

            candidateCount++;

            let fullContent = null;
            if (article.url) {
                fullContent = await scrapeArticleFullText(article.url);
            }
            
            const finalContent = cleanText(fullContent || article.description || cleanTitle);

            if (finalContent.length < 80 || /we use cookies and data|privacytools/i.test(finalContent)) {
              continue;
            }

            // STRICT CATEGORY & ANOMALY FILTER
            if (isStrictlyMiscategorizedOrOffTopic({ title: cleanTitle, content: finalContent, author: cleanAuthorText }, category)) {
              continue; 
            }

            let authorToSave = cleanAuthorText;
            if (authorToSave.startsWith('/u/') || !authorToSave || authorToSave === 'None' || authorToSave.toLowerCase().includes('daily reporter')) {
              authorToSave = `${category.charAt(0).toUpperCase() + category.slice(1)} Editorial Desk`;
            }

            const autoTags = generateTags(cleanTitle, finalContent, category);

            const newsData = {
              title: cleanTitle,
              slug: createSlug(cleanTitle, new mongoose.Types.ObjectId()),
              content: finalContent, 
              category: category, 
              author: authorToSave,
              imageUrl: photoUrl,
              mainImageUrl: photoUrl,
              mediaUrls: [photoUrl],
              sourceUrl: article.url,
              sourceName: cleanAuthorText,
              publishedAt: article.published && !Number.isNaN(new Date(article.published).getTime())
                ? new Date(article.published)
                : new Date(),
              country: 'global',
              isFeaturedOnHome: true,
              isFullContentFetched: finalContent.length >= 350,
              status: 'approved',
              isEditorPick: false,
              isTrending: true, 
              tags: autoTags,
              readTime: Math.max(1, Math.ceil((finalContent?.length || 500) / 1000)),
              views: Math.floor(Math.random() * 400) + 50,
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
        } catch (err) {
          // Ignore individual keyword rate-limit or temporary error
        }
      }
      console.log(`Inserted ${newCount} newly verified publisher articles into [ ${category.toUpperCase()} ]!`);
      totalInserted += newCount;
    }

    console.log(`\n🎉 Successfully inserted a total of ${totalInserted} new articles from Currents API and keyword expansion.`);
    return { totalInserted };

  } catch (error) {
    console.error('Error fetching from Currents API:', error?.response?.data || error.message);
    return { totalInserted: 0, error: error?.message || 'Currents API request failed' };
  }
};
