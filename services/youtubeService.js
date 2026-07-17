import axios from 'axios';
import VideoNews from '../models/VideoNews.js';

export const fetchAndSaveYouTubeNews = async () => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('YouTube API key is missing. Skipping video fetch.');
      return;
    }

    console.log('Fetching YouTube News...');

    // 1. Fetch Regular (Medium/Long) Official News
    const regularSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'official breaking news | CNN | BBC | Reuters | NDTV | India Today | WION',
        type: 'video',
        videoDuration: 'medium', // > 4 mins
        maxResults: 10,
        order: 'date',
        regionCode: 'IN',
        relevanceLanguage: 'en',
        key: apiKey,
      }
    });

    // 2. Fetch News Shorts
    const shortsSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'breaking news shorts | CNN | BBC | Reuters | NDTV | India Today | WION',
        type: 'video',
        videoDuration: 'short', // < 4 mins (usually < 1m)
        maxResults: 10,
        order: 'date',
        regionCode: 'IN',
        relevanceLanguage: 'en',
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

    const videoIds = allItems.map(item => item.id.videoId).join(',');

    // Fetch video durations using the /videos endpoint
    const videoDetailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'contentDetails',
        id: videoIds,
        key: apiKey,
      }
    });

    // Create a map of video ID to duration
    const durationMap = {};
    if (videoDetailsRes.data && videoDetailsRes.data.items) {
      videoDetailsRes.data.items.forEach(video => {
        // YouTube returns ISO 8601 duration (e.g., PT15M33S)
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
        } catch (e) {
           console.error('Error parsing duration', e);
        }
        durationMap[video.id] = formattedDuration;
      });
    }

    let newCount = 0;

    const determineCategory = (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('sport') || lower.includes('football') || lower.includes('cricket') || lower.includes('tennis')) return 'Sports';
      if (lower.includes('tech') || lower.includes('apple') || lower.includes('google') || lower.includes('ai')) return 'Technology';
      if (lower.includes('business') || lower.includes('market') || lower.includes('economy') || lower.includes('stock')) return 'Business';
      if (lower.includes('movie') || lower.includes('hollywood') || lower.includes('music') || lower.includes('celebrity')) return 'Entertainment';
      if (lower.includes('election') || lower.includes('president') || lower.includes('minister') || lower.includes('politics')) return 'Politics';
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
      
      const textForCategory = `${snippet.title} ${snippet.description}`;
      const mappedCategory = determineCategory(textForCategory);
      
      const isShort = shortVideoIds.includes(videoId);
      let isFeatured = false;
      
      // Assign the first regular video as featured
      if (!isShort && !featuredAssigned) {
        isFeatured = true;
        featuredAssigned = true;
      }

      const videoData = {
        title: snippet.title,
        description: snippet.description || snippet.title,
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
        { upsert: true, new: true, rawResult: true }
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
    let q = 'official breaking news';
    if (category && category.toLowerCase() !== 'latest' && category.toLowerCase() !== 'trending') {
      q = `official ${category} news | CNN | BBC | Reuters | NDTV | India Today | WION`;
    } else {
      q = 'official breaking news | CNN | BBC | Reuters | NDTV | India Today | WION';
    }

    const regularSearchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: q,
        type: 'video',
        videoDuration: 'medium', // > 4 mins
        maxResults: 10,
        order: 'date',
        regionCode: 'IN',
        relevanceLanguage: 'en',
        key: apiKey,
      }
    });

    const allItems = regularSearchRes.data?.items || [];
    if (allItems.length === 0) return;

    const videoIds = allItems.map(item => item.id.videoId).join(',');
    const videoDetailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'contentDetails',
        id: videoIds,
        key: apiKey,
      }
    });

    const durationMap = {};
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
      });
    }

    let newCount = 0;
    const catName = (category && category !== 'Latest' && category !== 'Trending') ? category : 'World';

    for (const item of allItems) {
      const videoId = item.id.videoId;
      const snippet = item.snippet;
      if (!videoId) continue;

      const videoData = {
        title: snippet.title,
        description: snippet.description || snippet.title,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        category: catName,
        reporter: snippet.channelTitle,
        duration: durationMap[videoId] || '05:00',
        views: 0,
        isShort: false,
        isFeatured: false
      };

      const updated = await VideoNews.findOneAndUpdate(
        { videoUrl: videoData.videoUrl },
        { $setOnInsert: videoData },
        { upsert: true, new: true, rawResult: true }
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
