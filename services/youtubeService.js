import axios from 'axios';
import VideoNews from '../models/VideoNews.js';

const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/ig, '&')
    .replace(/&lt;/ig, '<')
    .replace(/&gt;/ig, '>')
    .replace(/&quot;/ig, '"')
    .replace(/&#x27;/ig, "'")
    .replace(/&apos;/ig, "'")
    .replace(/&nbsp;/ig, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9A-Fa-f]+);/ig, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

const cleanDescription = (text) => {
  if (!text) return '';
  // Split by lines and filter out boilerplate lines
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const lower = line.toLowerCase();
    // Remove lines with common social media / subscription prompts
    if (lower.includes('subscribe') || lower.includes('follow us') || lower.includes('find us on') || lower.includes('check our website') || lower.includes('check out our') || (lower.includes('download') && lower.includes('app')) || lower.includes('read more here') || lower.includes('click here')) {
      return false;
    }
    // Remove lines that are just URLs
    if (line.match(/^[\s]*http[s]?:\/\/[^\s]+[\s]*$/)) return false;
    return true;
  });
  
  // Further remove standalone URLs that might be mixed in text
  let cleanedText = cleanedLines.join('\n');
  cleanedText = cleanedText.replace(/http[s]?:\/\/[^\s]+/g, '').trim();
  
  // Remove all hashtags
  cleanedText = cleanedText.replace(/(?:^|\s)#[^\s]+/g, '').trim();
  
  // Remove multiple consecutive newlines
  cleanedText = cleanedText.replace(/\n\s*\n/g, '\n\n');
  
  return cleanedText.trim();
};

const TRUSTED_CHANNELS = [
  // Major International Breaking & World News Networks
  'cnn', 'bbc news', 'bbc', 'reuters', 'associated press', 'ap news', 'nbc news', 'nbc', 'sky news', 'wion', 'ndtv',
  'cbs news', 'cbs', 'abc news', 'fox news', 'msnbc', 'bloomberg', 'cnbc', 'the guardian', 'france 24', 'al jazeera',
  'dw news', 'wall street journal', 'wsj', 'washington post', 'new york times', 'the telegraph', 'channel 4 news',
  'global news', 'cbc news', 'cbc', 'pbs newshour', 'npr', 'forbes', 'business insider', 'scmp', 'cna',

  // Premier Indian National News Broadcasts (English & Hindi)
  'aaj tak', 'ndtv india', 'ndtv 24x7', 'ndtv profit', 'times now', 'times now navbharat', 'mirror now', 'india today', 'india tv',
  'abp news', 'abp live', 'zee news', 'news18', 'cnn-news18', 'republic world', 'republic bharat', 'times of india',
  'hindustan times', 'indian express', 'firstpost', 'the lallantop', 'bbc news hindi', 'dd news', 'sansad tv', 'news24',
  'mint', 'economic times', 'business standard', 'cnbc tv18', 'cnbc awaaz', 'et now', 'cnbc-tv18',

  // Recognized Sports Broadcast Journalism Networks & Channels
  'espn', 'sky sports', 'bbc sport', 'cbs sports', 'nbc sports', 'fox sports', 'tnt sports', 'star sports', 'sony sports', 'sports 18',
  'sports tak', 'olympics', 'eurosport', 'cricbuzz', 'espncricinfo', 'tsn', 'beinsports', 'the athletic', 'ndtv sports',
  'india today sports', 'sportskeeda', 'fifa', 'icc', 'bcci', 'premier league', 'uefa', 'la liga', 'bundesliga', 'formula 1', 'f1', 'nba', 'nfl', 'mlb', 'tennis tv',
  'sports', 'sport', 'cricket', 'football', 'tennis', 'highlights', 'championship', 'league', 'tournament', 'badminton', 'athletics',

  // Verified Medical Institutions, Hospitals & Clinical Health Desks
  'mayo clinic', 'cleveland clinic', 'johns hopkins', 'world health organization', 'who', 'cdc', 'nhs', 'harvard health',
  'stanford medicine', 'medscape', 'healthline', 'webmd', 'american heart association', 'cnn health', 'bbc health',
  'ndtv health', 'health tak', 'doctor', 'hospital', 'medical', 'clinical', 'surgery', 'oncology', 'cardiology',
  'health', 'wellness', 'nutrition', 'fitness', 'medicine', 'pharmacy', 'healthcare', 'therapy', 'dental', 'neuro',

  // Recognized Science Foundations & Research Journalism
  'nasa', 'esa', 'isro', 'national geographic', 'natgeo', 'discovery', 'bbc earth', 'smithsonian', 'pbs space time',
  'kurzgesagt', 'scishow', 'veritasium', 'nature video', 'new scientist', 'science news', 'ieee spectrum', 'royal society', 'mit',
  'science', 'space', 'physics', 'quantum', 'laboratory', 'scientific', 'astrophysics', 'universe', 'earth', 'documentary', 'research',

  // Premier Technology & Innovation News Rooms
  'techcrunch', 'the verge', 'cnet', 'engadget', 'wired', 'bloomberg tech', 'mkbhd', 'linus tech tips', 'trakin tech',
  'gadgets 360', 'ndtv gadgets', 'cnbc tech', 'ars technica', 'wsj tech',
  'tech', 'technology', 'gadgets', 'mobile', 'software', 'ai', 'review', 'digital', 'hardware', 'geek',

  // Recognized Entertainment, Studios & Cinema Journalism Desks
  'the hollywood reporter', 'variety', 'people', 'entertainment tonight', 'e! news', 'access hollywood', 'billboard',
  'rolling stone', 'deadline hollywood', 'vanity fair', 'tmz', 'pinkvilla', 'bollywood hungama', 'film companion',
  'ndtv entertainment', 'india today entertainment', 'extra tv', 'hollywood', 'bollywood', 'ign', 'rotten tomatoes', 'netflix', 'prime video',
  'studio', 'studios', 'films', 'film', 'productions', 'cinema', 'trailers', 'trailer', 'movies', 'movie', 'entertainment', 'music', 'media',

  // Institutional Lifestyle, Culture & Travel Publications
  'vogue', 'gq', 'architectural digest', 'condé nast traveler', 'bbc travel', 'bbc culture', 'nyt style', 'cnn style',
  'today show', 'good morning america', 'gma', 'ndtv good times', 'tlc', 'bon appetit', 'food network', 'harper\'s bazaar', 'elle',
  'lifestyle', 'style', 'fashion', 'design', 'travel', 'luxury', 'living', 'home', 'architecture', 'culture', 'food', 'chef', 'gourmet', 'kitchen', 'beauty', 'décor'
];

const BANNED_KEYWORDS = [
  // Shorts, Status edits, viral TikTok clips & full movie upload spam
  '#shorts', '#short', 'shorts', 'short video', 'whatsapp status', 'status', 'viral video', 'viral shorts', 'reels', 'tiktok',
  'full movie', 'hindi dubbed', 'movie scene', 'attitude status', 'bgm', 'destroying world records', 'stunned!', 'shocking truth', 'you wont believe',
  // Regional non-Hindi Indian languages
  'marathi', 'telugu', 'tamil', 'kannada', 'malayalam', 'punjabi', 'bangla', 'bengali', 'gujarati', 'odia', 'assamese',
  // Urdu, Arabic, & non-relevant regional political channels/keywords
  'urdu', 'haqeeqat', 'ary news', 'geo news', 'samma', 'express news', 'bol news', 'dunya', '24 news', 'pakistan', 'rashid zaheer', 'baqiri', 'arabic', 'aljazeera arabic',
  // Financial spam, IPO promotions, stock tips & exam tutoring spam
  'gmp today', 'stock analysis', 'share price target', 'intraday', 'nifty prediction', 'banknifty', 'option trading', 'call put',
  'upsssc', 'anm 5272', 'sarkari result', 'admit card', 'coaching', 'cut off marks', 'merit list out',
  // AI-generated sci-fi clickbait & deceptive channel names
  'global news space', 'what no one wanted to see', 'prayed was wrong', 'shattered physics', 'left nasa speechless', 'terrified scientists', 'changes everything!', 'impossible encounter', 'unimaginable discovery',
  // Non-English / Non-Hindi international language spam (Spanish, German, French, Vietnamese)
  'vida divina', 'tendencias', 'pasarela', 'diseños', 'desfile', 'nachrichtensender', 'deutschland:', 'sinh viên', 'y khoa', 'nhà trường', 'bệnh viện', 'tiêm thuốc'
];

const isLanguageAllowed = (text) => {
  // Reject Arabic/Urdu, Cyrillic (Russian), Kanji/Hanzi/Hangul (Chinese/Japanese/Korean), Thai, Sinhala, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Odia, Gurumukhi
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0D80-\u0DFF\u1000-\u109F\u0C00-\u0C7F\u0B80-\u0BFF\u0C80-\u0CFF\u0D00-\u0D7F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0400-\u04FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(text)) {
    return false;
  }
  // Reject Vietnamese specific characters and extended Latin diacritics outside English/standard typography
  if (/[đĐơƠưƯăĂêÊôÔâÂảẢãÃãĩĨọỌụỤýÝ]/.test(text)) {
    return false;
  }
  return true;
};

const isOffTopicForCategory = (category, title) => {
  const cat = (category || '').toLowerCase();
  if (['science', 'health', 'lifestyle', 'entertainment', 'sports'].includes(cat)) {
    // Reject hard political conflicts, military warfare, disasters, and crime from lifestyle/entertainment feeds
    if (/\b(war|airstrike|airstrikes|missile|missiles|bombing|troops|military|killed|murder|rape|crime|police raid|arrested|fraudster|scam|verdict|judge|protest|riot|violence|shooting|earthquake|flood|disaster|crash|election|impeachment|biden|trump|putin|zelensky|militant|terror|hostage)\b/i.test(title)) {
      return true;
    }
  }
  return false;
};

export const fetchAndSaveYouTubeNews = async () => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('YouTube API key is missing. Skipping video fetch.');
      return;
    }

    console.log('Fetching YouTube News...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch Regular (Medium/Long) Official News (English & Hindi)
    const regularSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'breaking news (CNN | BBC | Al Jazeera | Reuters | AP | NBC News | Sky News | WION | NDTV)',
        type: 'video',
        videoCategoryId: '25', // Strictly News & Politics
        videoDuration: 'medium', // > 4 mins
        maxResults: 50,
        order: 'relevance', // relevance filters out recent spam better than 'date'
        publishedAfter: oneDayAgo,
        key: apiKey,
      }
    });

    // 2. Fetch News Shorts (English & Hindi)
    const shortsSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: '(CNN | BBC | Sky News | NBC News | CBS News | WION | NDTV | Reuters | Global News)',
        type: 'video',
        videoCategoryId: '25',
        videoDuration: 'short', // < 4 mins (usually < 1m)
        maxResults: 50,
        order: 'relevance',
        key: apiKey,
      }
    });

    const regularItems = regularSearchRes.data?.items || [];
    const shortItems = shortsSearchRes.data?.items || [];
    const allItems = [...regularItems, ...shortItems];

    if (allItems.length === 0) {
      console.warn('No items returned from YouTube API.');
      return;
    }

    const videoIds = allItems.map(item => item.id.videoId);

    // Fetch video durations using the /videos endpoint (max 50 per request)
    const durationMap = {};
    const descriptionMap = {};
    
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50).join(',');
      const videoDetailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet',
          id: chunk,
          key: apiKey,
        }
      });

      if (videoDetailsRes.data && videoDetailsRes.data.items) {
        videoDetailsRes.data.items.forEach(video => {
          let rawDuration = video.contentDetails.duration;
          let formattedDuration = '00:00';
          try {
            const match = rawDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            if (match) {
              const h = match[1] ? match[1].replace('H', '') : '0';
              const m = match[2] ? match[2].replace('M', '') : '0';
              const s = match[3] ? match[3].replace('S', '') : '0';
              const mm = parseInt(h) * 60 + parseInt(m);
              formattedDuration = `${mm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
          } catch (e) {}
          durationMap[video.id] = formattedDuration;
          descriptionMap[video.id] = video.snippet?.description || '';
        });
      }
    }

    let newCount = 0;

    const determineCategory = (titleText) => {
      if (/\b(sport|sports|football|cricket|tennis|soccer|nba|nfl|olympic|olympics|badminton|chess|golf)\b/i.test(titleText)) return 'Sports';
      if (/\b(tech|technology|apple|google|ai|artificial intelligence|robot|robotics|smartphone|iphone|software|cybersecurity)\b/i.test(titleText)) return 'Technology';
      if (/\b(business|market|markets|economy|economic|stocks|stock market|finance|financial|inflation|banking|investing|gdp)\b/i.test(titleText)) return 'Business';
      if (/\b(movie|movies|hollywood|bollywood|cinema|actor|actress|celebrity|celebrities|oscar|oscars|grammy|grammys|album|film festival)\b/i.test(titleText)) return 'Entertainment';
      if (/\b(science|scientific|nasa|space|astros|astronomy|physics|biology|chemistry|fossil|species|telescope|quantum|evolution)\b/i.test(titleText)) return 'Science';
      if (/\b(health|medical|medicine|doctor|hospital|disease|cancer|wellness|vaccine|mental health|nutrition|cardiology)\b/i.test(titleText)) return 'Health';
      if (/\b(lifestyle|fashion|vogue|travel|luxury|decor|culture|living|culinary|recipes|wellness)\b/i.test(titleText)) return 'Lifestyle';
      if (/\b(election|elections|president|prime minister|minister|politics|political|parliament|congress|senate|governor)\b/i.test(titleText)) return 'Politics';
      return 'World'; // Fallback
    };

    // Helper array to check if a video ID is from the shorts search
    const shortVideoIds = shortItems.map(i => i.id.videoId);
    let featuredAssigned = false;

    for (const item of allItems) {
      const videoId = item.id.videoId;
      const snippet = item.snippet;

      // Ensure we have a valid videoId before proceeding
      if (!videoId) continue;
      
      const channelName = (snippet.channelTitle || '').toLowerCase();
      
      const titleAndChannel = `${snippet.title} ${channelName}`.toLowerCase();
      const isTrusted = TRUSTED_CHANNELS.some(trusted => channelName.includes(trusted.toLowerCase()));
      const hasBannedKeyword = BANNED_KEYWORDS.some(banned => titleAndChannel.includes(banned.toLowerCase()));
      const allowedLang = isLanguageAllowed(`${snippet.title} ${channelName}`);

      if (!isTrusted || hasBannedKeyword || !allowedLang) {
        console.log(`Skipped untrusted, banned or non-Hindi/English video: [${snippet.channelTitle}] - ${snippet.title}`);
        continue;
      }
      
      const mappedCategory = determineCategory(snippet.title);
      
      const durationStr = durationMap[videoId] || '02:00';
      const durationParts = durationStr.split(':').map(Number);
      const totalSec = durationParts.length === 3 ? (durationParts[0]*3600 + durationParts[1]*60 + durationParts[2]) : (durationParts[0]*60 + durationParts[1]);
      if (totalSec < 90 || totalSec > 2400 || shortVideoIds.includes(videoId)) {
         continue; // Reject Shorts/Statuses under 90s and full movie/untrimmed uploads over 40 mins
      }
      const isShort = false;
      let isFeatured = false;
      
      // Assign the first regular video as featured
      if (!isShort && !featuredAssigned) {
        isFeatured = true;
        featuredAssigned = true;
      }

      const videoData = {
        title: decodeHtmlEntities(snippet.title),
        description: decodeHtmlEntities(cleanDescription(descriptionMap[videoId] || snippet.description || snippet.title)),
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        category: mappedCategory,
        reporter: snippet.channelTitle,
        duration: durationMap[videoId] || '02:00',
        views: 0,
        isShort,
        isFeatured
      };

      const updated = await VideoNews.findOneAndUpdate(
        { videoUrl: videoData.videoUrl },
        { $setOnInsert: videoData },
        { upsert: true, returnDocument: 'after', rawResult: true }
      );
      
      if (updated.lastErrorObject?.updatedExisting === false) {
         newCount++;
      }
    }

    console.log(`Successfully inserted ${newCount} new videos from YouTube API into the database.`);
  } catch (error) {
    console.error('Error fetching from YouTube API:', error?.response?.data || error.message);
  }
};

export const fetchAndSaveCategoryVideos = async (category) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return;

    console.log(`Fetching YouTube News for category: ${category}...`);
    
    // Use a 180-day (6 month) window for specialty categories to ensure an abundant pool of verified institutional journalism
    const isSpecialtyTopic = ['sports', 'business', 'science', 'health', 'technology', 'lifestyle', 'entertainment'].includes(category?.toLowerCase());
    
    const timeWindowMs = isSpecialtyTopic ? (180 * 24 * 60 * 60 * 1000) : (72 * 60 * 60 * 1000);
    const publishedAfter = new Date(Date.now() - timeWindowMs).toISOString();
    
    let q = 'breaking world news report';
    if (category && category.toLowerCase() !== 'latest' && category.toLowerCase() !== 'trending') {
      const catLower = category.toLowerCase();
      if (catLower === 'science') {
        q = 'science space news report';
      } else if (catLower === 'health') {
        q = 'health medical news report';
      } else if (catLower === 'lifestyle') {
        q = 'lifestyle fashion news report';
      } else if (catLower === 'entertainment') {
        q = 'entertainment movies news report';
      } else if (catLower === 'sports') {
        q = 'sports match news report';
      } else if (catLower === 'technology') {
        q = 'technology gadgets news report';
      } else if (catLower === 'business') {
        q = 'business economy news report';
      } else if (catLower === 'politics') {
        q = 'politics government news report';
      } else {
        q = `${category} news report`;
      }
    }

    const searchParams = {
      part: 'snippet',
      q: q,
      type: 'video',
      relevanceLanguage: 'en',
      maxResults: 50,
      order: 'relevance',
      publishedAfter: publishedAfter,
      key: apiKey,
    };

    // Only restrict to News & Politics (25) for general hard news, leaving Sports (17), Education/Health (27), and Science (28) open
    if (!isSpecialtyTopic && category?.toLowerCase() !== 'latest' && category?.toLowerCase() !== 'trending') {
       searchParams.videoCategoryId = '25';
    }

    const regularSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: searchParams
    });

    const allItems = regularSearchRes.data?.items || [];
    if (allItems.length === 0) return;

    const videoIds = allItems.map(item => item.id.videoId);

    // Fetch video durations using the /videos endpoint (max 50 per request)
    const durationMap = {};
    const descriptionMap = {};
    
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50).join(',');
      const videoDetailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet',
          id: chunk,
          key: apiKey,
        }
      });

      const videoDetails = videoDetailsRes.data?.items || [];
      videoDetails.forEach(video => {
        const rawDuration = video.contentDetails?.duration;
        let formattedDuration = '02:00';
        try {
          if (rawDuration) {
            const match = rawDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            if (match) {
              const h = match[1] ? match[1].replace('H', '') : '0';
              const m = match[2] ? match[2].replace('M', '') : '0';
              const s = match[3] ? match[3].replace('S', '') : '0';
              const mm = parseInt(h) * 60 + parseInt(m);
              formattedDuration = `${mm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
          }
        } catch (e) {}
        durationMap[video.id] = formattedDuration;
        descriptionMap[video.id] = video.snippet?.description || '';
      });
    }

    let newCount = 0;
    const catName = (category && category !== 'Latest' && category !== 'Trending') ? category : 'World';

    for (const item of allItems) {
      const videoId = item.id.videoId;
      const snippet = item.snippet;
      if (!videoId) continue;
      
      const channelName = (snippet.channelTitle || '').toLowerCase();
      
      const titleAndChannel = `${snippet.title} ${channelName}`.toLowerCase();
      const isTrusted = TRUSTED_CHANNELS.some(trusted => channelName.includes(trusted.toLowerCase()));
      const hasBannedKeyword = BANNED_KEYWORDS.some(banned => titleAndChannel.includes(banned.toLowerCase()));
      const allowedLang = isLanguageAllowed(`${snippet.title} ${channelName}`);
      const isOffTopic = isOffTopicForCategory(catName, snippet.title);

      const durationStr = durationMap[videoId] || '02:00';
      const durationParts = durationStr.split(':').map(Number);
      const totalSec = durationParts.length === 3 ? (durationParts[0]*3600 + durationParts[1]*60 + durationParts[2]) : (durationParts[0]*60 + durationParts[1]);
      const isShort = false;

      if (!isTrusted || hasBannedKeyword || !allowedLang || isOffTopic || totalSec < 90 || totalSec > 2400) {
        console.log(`Skipped untrusted, banned, short/status/full-movie, or off-topic video: [${snippet.channelTitle}] - ${snippet.title}`);
        continue;
      }

      const videoData = {
        title: decodeHtmlEntities(snippet.title),
        description: decodeHtmlEntities(cleanDescription(descriptionMap[videoId] || snippet.description || snippet.title)),
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        category: catName,
        reporter: snippet.channelTitle,
        duration: durationStr,
        views: 0,
        isShort,
        isFeatured: false
      };

      const updated = await VideoNews.findOneAndUpdate(
        { videoUrl: videoData.videoUrl },
        { $setOnInsert: videoData },
        { upsert: true, returnDocument: 'after', rawResult: true }
      );
      
      if (updated.lastErrorObject?.updatedExisting === false) {
         newCount++;
      }
    }
    console.log(`Successfully inserted ${newCount} new category videos.`);
  } catch (error) {
    console.error('Error fetching category from YouTube:', error?.response?.data || error.message);
  }
};

export const balanceAllCategoryCounts = async (targetCount = 15) => {
  try {
    const categories = ['World', 'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'Science', 'Lifestyle'];
    console.log(`\n=== Equalizing category video distribution to an exact uniform count (~${targetCount} videos per category) ===`);
    
    // Check available volume across all categories
    let minCount = targetCount;
    for (const cat of categories) {
      const count = await VideoNews.countDocuments({ category: new RegExp(`^${cat}$`, 'i') });
      if (count < minCount && count > 0) {
        minCount = count;
      }
    }

    const finalEqualQuota = Math.max(Math.min(targetCount, minCount), 12);
    console.log(`Universal Equalization Quota locked at exactly: [ ${finalEqualQuota} items ] per category.`);

    for (const cat of categories) {
      const videos = await VideoNews.find({ category: new RegExp(`^${cat}$`, 'i') }).sort({ _id: -1 });
      if (videos.length > finalEqualQuota) {
        const excessIds = videos.slice(finalEqualQuota).map(v => v._id);
        await VideoNews.deleteMany({ _id: { $in: excessIds } });
        console.log(`Category [${cat}]: equalized from ${videos.length} down to exact quota of ${finalEqualQuota}.`);
      } else {
        console.log(`Category [${cat}]: perfectly balanced at ${videos.length} items.`);
      }
    }
    console.log('=== Universal category equalization completed successfully! ===\n');
  } catch (err) {
    console.error('Error equalizing category counts:', err.message);
  }
};
