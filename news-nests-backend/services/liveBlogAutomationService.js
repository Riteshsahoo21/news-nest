import axios from 'axios';
import LiveBlog from '../models/LiveBlog.js';

const SCRAPER_URL = process.env.NEWS_NEST_SCRAPER_URL || 'http://127.0.0.1:8000';

const COMPLETE_WORDS = [
  'won by',
  'won the',
  'match complete',
  'complete',
  'match over',
  'abandoned',
  'match drawn',
  'match tied',
  'no result',
  'game over',
  'final result',
  'defeated by',
  'concluded',
  'ended'
];

export const isMatchOrStreamEnded = (blog) => {
  if (!blog) return true;
  if (blog.isLive === false) return true;

  // Check matchStatus string
  const matchInfo = String(blog.matchStatus?.matchInfo || '').toLowerCase();
  if (COMPLETE_WORDS.some(w => matchInfo.includes(w))) return true;

  const t1Score = String(blog.matchStatus?.team1?.score || '').toLowerCase();
  const t2Score = String(blog.matchStatus?.team2?.score || '').toLowerCase();
  if (COMPLETE_WORDS.some(w => t1Score.includes(w) || t2Score.includes(w))) return true;

  // Check if latest bulletin is a MATCH OVER bulletin
  if (Array.isArray(blog.updates) && blog.updates.length > 0) {
    const firstUpdateTitle = String(blog.updates[0].title || '').toUpperCase();
    if (firstUpdateTitle.includes('MATCH OVER') || firstUpdateTitle.includes('FINAL RESULT')) {
      return true;
    }
  }

  // Pure stream that was stopped
  if (blog.streamType && blog.streamType !== 'none' && blog.isStreamActive === false && (!blog.updates || blog.updates.length === 0)) {
    return true;
  }

  return false;
};

const getThematicLiveImage = (category = 'sports', title = '') => {
  const cat = String(category || '').toLowerCase();
  const t = String(title || '').toLowerCase();

  if (cat.includes('esport') || t.includes('cs2') || t.includes('valorant') || t.includes('dota') || t.includes('gaming')) {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('cricket') || t.includes('odi') || t.includes('t20') || t.includes('test') || cat.includes('cricket')) {
    return 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('politic') || t.includes('election') || t.includes('parliament') || t.includes('summit')) {
    return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('tech') || t.includes('ai') || t.includes('meta') || t.includes('apple')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';
};

/**
 * Audit active live blogs: close any that have finished in real life
 */
export const auditAndCloseEndedLiveBlogs = async () => {
  try {
    const activeBlogs = await LiveBlog.find({ isLive: true });
    let closedCount = 0;

    for (const blog of activeBlogs) {
      if (isMatchOrStreamEnded(blog)) {
        blog.isLive = false;
        await blog.save();
        closedCount++;
        console.log(`[Live Scanner] Closed concluded live blog: "${blog.title}"`);
      }
    }

    return closedCount;
  } catch (err) {
    console.error('[Live Scanner] Error during ended blogs audit:', err.message);
    return 0;
  }
};

/**
 * Continuously discovers live events from outside world and syncs active scores
 */
export const syncLiveCoverageFromOutsideWorld = async () => {
  try {
    // 1. Audit and close any ended blogs
    await auditAndCloseEndedLiveBlogs();

    // 2. Discover live matches from the scraper service
    let upcomingMatches = [];
    try {
      const res = await axios.get(`${SCRAPER_URL}/api/sports/upcoming-cricket`, { timeout: 15000 });
      upcomingMatches = res.data?.matches || [];
    } catch (err) {
      console.warn('[Live Scanner] Scraper upcoming cricket query skipped:', err.message);
    }

    for (const match of upcomingMatches) {
      const externalMatchId = match.externalMatchId;
      if (!externalMatchId) continue;

      const isLiveMatch = match.isLive === true || 
        ['live', 'opt to bat', 'opt to bowl', 'toss', 'innings break', 'lunch', 'tea'].some(m => 
          String(match.status || '').toLowerCase().includes(m)
        );

      // If the match is live, ensure it exists in MongoDB
      if (isLiveMatch) {
        let liveBlog = await LiveBlog.findOne({ externalMatchId });
        if (!liveBlog) {
          const team1 = match.teams?.team1 || 'Team 1';
          const team2 = match.teams?.team2 || 'Team 2';
          const title = match.title || `${team1} vs ${team2} Live Coverage`;

          liveBlog = await LiveBlog.create({
            title,
            description: `Live score, real-time ball-by-ball commentary, and instant bulletins for ${title}${match.venue ? ` at ${match.venue}` : ''}.`,
            category: 'cricket',
            isLive: true,
            author: 'News Nests Real-Time Sports Desk',
            mainImageUrl: getThematicLiveImage('cricket', title),
            externalMatchId,
            tags: ['Live Coverage', 'Cricket', team1, team2, match.matchType].filter(Boolean),
            matchStatus: {
              team1: { name: team1, score: 'Yet to bat' },
              team2: { name: team2, score: 'Yet to bat' },
              matchInfo: match.status || 'Live Coverage',
              customStats: [
                { label: 'Format', value: match.matchType || 'Official Match' },
                { label: 'Venue', value: match.venue || 'Stadium' }
              ]
            },
            poll: {
              question: `Who will emerge victorious between ${team1} and ${team2}?`,
              options: [
                { text: team1, votes: 12 },
                { text: team2, votes: 9 },
                { text: 'Draw / Tie', votes: 2 }
              ]
            },
            updates: [
              {
                title: 'LIVE COVERAGE COMMENCED',
                content: `${title} is now streaming live on News Nests. Follow live ball commentary and updates below.`
              }
            ]
          });
          console.log(`[Live Scanner] Auto-discovered outside world live event: "${title}" (${externalMatchId})`);
        }
      }
    }

    // 3. Continuously poll scores for all active cricket live blogs
    const activeCricketBlogs = await LiveBlog.find({ 
      isLive: true, 
      externalMatchId: { $regex: /^cric_\d+$/ } 
    });

    for (const blog of activeCricketBlogs) {
      try {
        const scoreRes = await axios.get(`${SCRAPER_URL}/api/sports/live-score/${blog.externalMatchId}`, { timeout: 20000 });
        const scoreData = scoreRes.data;
        if (!scoreData || scoreData.error) continue;

        const isComplete = scoreData.isComplete === true || 
          COMPLETE_WORDS.some(w => String(scoreData.status || '').toLowerCase().includes(w));

        // If completed in outside world, immediately conclude and close
        if (isComplete) {
          blog.isLive = false;
          const resultText = scoreData.result || scoreData.status || 'Match concluded.';
          blog.matchStatus.matchInfo = resultText;
          if (scoreData.team1?.score) blog.matchStatus.team1.score = scoreData.team1.score;
          if (scoreData.team2?.score) blog.matchStatus.team2.score = scoreData.team2.score;

          if (!blog.updates.some(u => u.title === 'MATCH OVER' || u.content === resultText)) {
            blog.updates.unshift({
              title: 'MATCH OVER',
              content: resultText,
              createdAt: new Date()
            });
          }
          await blog.save();
          console.log(`[Live Scanner] Concluded match and removed from live stream: "${blog.title}" (${resultText})`);
          continue;
        }

        // Otherwise update score, telemetry, and commentary
        let updated = false;
        if (scoreData.matchStatus) {
          if (scoreData.team1?.name) blog.matchStatus.team1.name = scoreData.team1.name;
          if (scoreData.team1?.score) blog.matchStatus.team1.score = scoreData.team1.score;
          if (scoreData.team2?.name) blog.matchStatus.team2.name = scoreData.team2.name;
          if (scoreData.team2?.score) blog.matchStatus.team2.score = scoreData.team2.score;
          if (scoreData.matchStatus.matchInfo) blog.matchStatus.matchInfo = scoreData.matchStatus.matchInfo;
          if (Array.isArray(scoreData.matchStatus.customStats) && scoreData.matchStatus.customStats.length > 0) {
            blog.matchStatus.customStats = scoreData.matchStatus.customStats;
          }
          updated = true;
        }

        // Ingest new updates
        if (Array.isArray(scoreData.updates) && scoreData.updates.length > 0) {
          for (const item of [...scoreData.updates].reverse()) {
            const content = String(item.content || '').trim();
            if (content && !blog.updates.some(u => u.content === content)) {
              blog.updates.unshift({
                title: item.title || 'LIVE UPDATE',
                content,
                createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
              });
              updated = true;
            }
          }
        }

        if (updated) {
          blog.updatedAt = new Date();
          await blog.save();
        }
      } catch (err) {
        console.warn(`[Live Scanner] Failed to poll score for ${blog.externalMatchId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[Live Scanner] Unexpected error in sync cycle:', error.message);
  }
};

/**
 * Starts continuous background worker
 */
export const startLiveBlogContinuousWorker = () => {
  console.log('[Live Scanner] Starting autonomous continuous live blog discovery worker (60s cycle)...');
  
  // Initial run after brief delay
  setTimeout(() => {
    syncLiveCoverageFromOutsideWorld().catch(e => console.warn('[Live Scanner] Initial run error:', e.message));
  }, 3000);

  // Recurring 60s background cycle
  setInterval(() => {
    syncLiveCoverageFromOutsideWorld().catch(e => console.warn('[Live Scanner] Interval run error:', e.message));
  }, 60000);
};
