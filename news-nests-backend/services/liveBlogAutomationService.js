import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
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
  'ended',
  'this blog is now closed',
  'as it happened'
];

/**
 * Prunes concluded live blogs to strictly keep at most maxKeep (default 5).
 * Permanently deletes any older concluded live blogs from the database.
 */
export const pruneConcludedLiveBlogs = async (maxKeep = 5) => {
  try {
    const concludedBlogs = await LiveBlog.find({ isLive: false })
      .sort({ updatedAt: -1, createdAt: -1 });

    if (concludedBlogs.length > maxKeep) {
      const toDelete = concludedBlogs.slice(maxKeep);
      const idsToDelete = toDelete.map(b => b._id);
      await LiveBlog.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`[Live Archiver] Strict limit enforced: Kept latest ${maxKeep} concluded blogs. Permanently deleted ${idsToDelete.length} older records.`);
    }
  } catch (err) {
    console.error('[Live Archiver] Error pruning concluded blogs:', err.message);
  }
};

/**
 * Checks if a live blog or stream has ended in real life
 */
export const isMatchOrStreamEnded = (blog) => {
  if (!blog) return true;
  if (blog.isLive === false) return true;

  const titleLower = String(blog.title || '').toLowerCase();
  if (COMPLETE_WORDS.some(w => titleLower.endsWith(w) || titleLower.includes('as it happened'))) {
    return true;
  }

  // Check matchStatus string
  const matchInfo = String(blog.matchStatus?.matchInfo || '').toLowerCase();
  if (COMPLETE_WORDS.some(w => matchInfo.includes(w))) return true;

  const t1Score = String(blog.matchStatus?.team1?.score || '').toLowerCase();
  const t2Score = String(blog.matchStatus?.team2?.score || '').toLowerCase();
  if (COMPLETE_WORDS.some(w => t1Score.includes(w) || t2Score.includes(w))) return true;

  // Check if latest bulletin is a MATCH OVER bulletin
  if (Array.isArray(blog.updates) && blog.updates.length > 0) {
    const firstUpdateTitle = String(blog.updates[0].title || '').toUpperCase();
    if (firstUpdateTitle.includes('MATCH OVER') || firstUpdateTitle.includes('FINAL RESULT') || firstUpdateTitle.includes('CONCLUDED') || firstUpdateTitle.includes('BLOG CLOSED')) {
      return true;
    }
  }

  // Pure stream that was stopped
  if (blog.streamType && blog.streamType !== 'none' && blog.isStreamActive === false && (!blog.updates || blog.updates.length === 0)) {
    return true;
  }

  // Inactivity timeout: If an active blog has received no updates in over 3 hours
  const lastUpdate = blog.updates && blog.updates.length > 0
    ? new Date(blog.updates[0].createdAt || blog.updatedAt || blog.createdAt).getTime()
    : new Date(blog.updatedAt || blog.createdAt).getTime();

  if (Date.now() - lastUpdate > 3 * 60 * 60 * 1000) {
    return true;
  }

  return false;
};

/**
 * Audit active live blogs: close any that have finished in real life or stalled,
 * and enforce the strict 5-archive limit.
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
        console.log(`[Live Scanner] Concluded live blog: "${blog.title}"`);
      }
    }

    if (closedCount > 0) {
      await pruneConcludedLiveBlogs(5);
    }

    return closedCount;
  } catch (err) {
    console.error('[Live Scanner] Error during ended blogs audit:', err.message);
    return 0;
  }
};

/**
 * Source 1: Sync Cricket Live Matches via Cricbuzz Scraper Service
 */
export const syncLiveCricketMatches = async () => {
  try {
    let upcomingMatches = [];
    try {
      const res = await axios.get(`${SCRAPER_URL}/api/sports/upcoming-cricket`, { timeout: 15000 });
      upcomingMatches = res.data?.matches || [];
    } catch (err) {
      console.warn('[Live Scanner] Cricket scraper upcoming query skipped:', err.message);
    }

    for (const match of upcomingMatches) {
      const externalMatchId = match.externalMatchId;
      if (!externalMatchId) continue;

      const statusLower = String(match.status || '').toLowerCase();
      const isPreview = statusLower.includes('preview') || statusLower.includes('upcoming');
      const isLiveMatch = !isPreview && (match.isLive === true || 
        ['live', 'opt to bat', 'opt to bowl', 'toss', 'innings break', 'lunch', 'tea'].some(m => 
          statusLower.includes(m)
        ));

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
            mainImageUrl: (match.imageUrl && !match.imageUrl.includes('unsplash.com')) ? match.imageUrl : '',
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
          console.log(`[Live Scanner] Auto-discovered outside cricket event: "${title}" (${externalMatchId})`);
        }
      }
    }

    // Continuously poll scores for all active cricket live blogs
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
          console.log(`[Live Scanner] Concluded cricket match: "${blog.title}" (${resultText})`);
          await pruneConcludedLiveBlogs(5);
          continue;
        }

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

        if (Array.isArray(scoreData.updates) && scoreData.updates.length > 0) {
          const now = Date.now();
          // Use composite key (Title + Content) so unique balls like Over 56.1 and Over 54.2 are never false-deduped
          const existingKeys = new Set(
            blog.updates.map(u => `${(u.title || '').trim()}::${String(u.content || '').trim()}`)
          );
          const brandNewItems = [];

          // scoreData.updates is ordered newest first
          for (let i = 0; i < scoreData.updates.length; i++) {
            const item = scoreData.updates[i];
            const rawContent = (item && typeof item === 'object')
              ? (item.content || item.text || item.description || item.comm || item.bulletin || '')
              : item;
            const content = String(rawContent || '').trim();
            const title = (item && item.title) ? String(item.title).trim() : 'LIVE UPDATE';
            const itemKey = `${title}::${content}`;

            if (content && content !== '[object Object]' && !existingKeys.has(itemKey)) {
              brandNewItems.push({
                title,
                content,
                // Assign fresh current timestamps so new live balls always appear at the top!
                createdAt: new Date(now - brandNewItems.length * 1000)
              });
              existingKeys.add(itemKey);
            }
          }

          if (brandNewItems.length > 0) {
            for (const newItem of brandNewItems.reverse()) {
              blog.updates.unshift(newItem);
            }
            blog.updates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            updated = true;
          }
        }

        if (updated) {
          blog.updatedAt = new Date();
          await blog.save();
        }
      } catch (err) {
        console.warn(`[Live Scanner] Failed to poll cricket score for ${blog.externalMatchId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[Live Scanner] Error in cricket sync:', error.message);
  }
};

/**
 * Source 2: Sync Football (Soccer) Matches via ESPN Live Scoreboard & Summary APIs
 * Leagues covered: Premier League, UEFA Champions League, La Liga, Serie A, Bundesliga, MLS
 */
export const syncLiveFootballMatches = async () => {
  const LEAGUES = [
    { code: 'eng.1', name: 'Premier League' },
    { code: 'uefa.champions', name: 'UEFA Champions League' },
    { code: 'esp.1', name: 'La Liga' },
    { code: 'ita.1', name: 'Serie A' },
    { code: 'ger.1', name: 'Bundesliga' },
    { code: 'usa.1', name: 'MLS' }
  ];

  try {
    for (const league of LEAGUES) {
      try {
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard`;
        const res = await axios.get(scoreboardUrl, { timeout: 10000 });
        const events = res.data?.events || [];

        // Prioritize in-progress matches ('in'); also support active matches of matchday
        const targetEvents = events.filter(e => {
          const state = e.status?.type?.state;
          return state === 'in' || state === 'pre';
        });

        // If no match is currently live or upcoming today, check if we need coverage for the top feature match
        const eventsToProcess = targetEvents.length > 0 ? targetEvents : events.slice(0, 1);

        for (const ev of eventsToProcess) {
          const externalMatchId = `espn_fb_${league.code}_${ev.id}`;
          const comp = ev.competitions?.[0];
          if (!comp) continue;

          const home = comp.competitors?.find(c => c.homeAway === 'home') || comp.competitors?.[0];
          const away = comp.competitors?.find(c => c.homeAway === 'away') || comp.competitors?.[1];

          const team1Name = away?.team?.displayName || 'Away Team';
          const team1Score = away?.score != null ? String(away.score) : '0';
          const team2Name = home?.team?.displayName || 'Home Team';
          const team2Score = home?.score != null ? String(home.score) : '0';
          const venue = comp.venue?.fullName 
            ? `${comp.venue.fullName}${comp.venue.address?.city ? `, ${comp.venue.address.city}` : ''}`
            : 'Football Stadium';

          const state = ev.status?.type?.state; // 'in' | 'pre' | 'post'
          const clock = ev.status?.type?.shortDetail || ev.status?.displayClock || 'Live';
          const isLive = state === 'in';
          const isFinished = state === 'post';

          // Fetch summary endpoint for live commentary and boxscore telemetry
          let commentary = [];
          let customStats = [
            { label: 'Tournament', value: league.name },
            { label: 'Venue', value: venue },
            { label: 'Status', value: clock }
          ];

          try {
            const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/summary?event=${ev.id}`;
            const sumRes = await axios.get(sumUrl, { timeout: 8000 });
            commentary = sumRes.data?.commentary || [];
            
            const stats = sumRes.data?.boxscore?.teams?.[0]?.statistics || [];
            const possession = stats.find(s => s.name === 'possessionPct')?.displayValue;
            if (possession) customStats.push({ label: 'Possession', value: `${possession}%` });
            const shots = stats.find(s => s.name === 'shotsOnTarget')?.displayValue;
            if (shots) customStats.push({ label: 'Shots on Target', value: shots });
            const fouls = stats.find(s => s.name === 'foulsCommitted')?.displayValue;
            if (fouls) customStats.push({ label: 'Fouls', value: fouls });
          } catch (sumErr) {
            // Summary fetch failure is non-blocking
          }

          const title = `${team1Name} vs ${team2Name} - ${league.name} Live Coverage`;
          let liveBlog = await LiveBlog.findOne({ externalMatchId });

          if (!liveBlog) {
            // Only auto-create if match is in progress or if active portal requires football coverage
            if (!isLive && targetEvents.length > 0) continue;

            const initialUpdates = [];
            if (commentary.length > 0) {
              const recentComms = commentary.slice(-15).reverse();
              recentComms.forEach((c, idx) => {
                const commClock = c.time?.displayValue || `${idx * 4}'`;
                initialUpdates.push({
                  title: `${commClock} - MATCH ACTION`,
                  content: c.text,
                  createdAt: new Date(Date.now() - idx * 2 * 60 * 1000)
                });
              });
            } else {
              initialUpdates.push({
                title: 'KICK-OFF / MATCH COVERAGE',
                content: `Real-time live coverage commenced for ${title} at ${venue}.`,
                createdAt: new Date()
              });
            }

            const heroImg = away?.team?.logo || home?.team?.logo || '';

            liveBlog = await LiveBlog.create({
              title,
              description: `Live score, minute-by-minute text commentary, possession stats, and instant bulletins for ${title}.`,
              category: 'football',
              isLive: isLive,
              author: 'News Nests Football Desk',
              mainImageUrl: heroImg,
              externalMatchId,
              tags: ['Football', 'Soccer', league.name, team1Name, team2Name, 'Live Coverage'],
              matchStatus: {
                team1: { name: team1Name, score: team1Score },
                team2: { name: team2Name, score: team2Score },
                matchInfo: `${league.name} • ${clock}`,
                customStats
              },
              poll: {
                question: `Who will win the clash between ${team1Name} and ${team2Name}?`,
                options: [
                  { text: team1Name, votes: 20 },
                  { text: team2Name, votes: 15 },
                  { text: 'Draw', votes: 6 }
                ]
              },
              updates: initialUpdates
            });
            console.log(`[Live Scanner] Auto-discovered football match: "${title}" (${league.name} - ${clock})`);
          } else {
            // Update existing football match
            let updated = false;
            liveBlog.matchStatus.team1.name = team1Name;
            liveBlog.matchStatus.team1.score = team1Score;
            liveBlog.matchStatus.team2.name = team2Name;
            liveBlog.matchStatus.team2.score = team2Score;
            liveBlog.matchStatus.matchInfo = `${league.name} • ${clock}`;
            liveBlog.matchStatus.customStats = customStats;
            updated = true;

            if (isFinished && liveBlog.isLive) {
              liveBlog.isLive = false;
              liveBlog.updates.unshift({
                title: 'FULL TIME - MATCH CONCLUDED',
                content: `Final whistle at ${venue}: ${team1Name} ${team1Score} - ${team2Score} ${team2Name}.`,
                createdAt: new Date()
              });
              await liveBlog.save();
              console.log(`[Live Scanner] Concluded football match: "${title}"`);
              await pruneConcludedLiveBlogs(5);
              continue;
            }

            // Ingest new commentary updates using composite key
            if (commentary.length > 0) {
              const existingCommKeys = new Set(
                liveBlog.updates.map(u => `${(u.title || '').trim()}::${String(u.content || '').trim()}`)
              );
              for (const c of commentary.slice(-20)) {
                const commText = String(c.text || '').trim();
                const commClock = c.time?.displayValue || 'LIVE';
                const commTitle = `${commClock} - MATCH UPDATE`;
                const commKey = `${commTitle}::${commText}`;

                if (commText && !existingCommKeys.has(commKey)) {
                  liveBlog.updates.unshift({
                    title: commTitle,
                    content: commText,
                    createdAt: new Date()
                  });
                  existingCommKeys.add(commKey);
                  updated = true;
                }
              }
            }

            if (updated) {
              liveBlog.updatedAt = new Date();
              await liveBlog.save();
            }
          }
        }
      } catch (leagueErr) {
        console.warn(`[Live Scanner] Error querying league ${league.name}:`, leagueErr.message);
      }
    }
  } catch (error) {
    console.error('[Live Scanner] Error in football sync:', error.message);
  }
};

/**
 * Source 3: Sync Breaking World Events & Live News via The Guardian Minute-by-Minute Live Feed
 * Enriches portal with active political events, global summits, security & investigative live blogs.
 */
export const syncLiveWorldNews = async () => {
  try {
    const rssUrl = 'https://www.theguardian.com/tone/minutebyminute/rss';
    const res = await axios.get(rssUrl, { timeout: 12000 });
    const $ = cheerio.load(res.data, { xmlMode: true });

    const items = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();
      const desc = $(el).find('description').text().trim();

      const isClosed = desc.toLowerCase().includes('this blog is now closed') || 
                       title.toLowerCase().endsWith('as it happened');

      if (!isClosed && link) {
        items.push({ title, link, pubDate, desc });
      }
    });

    // Ingest top 3 active world live blogs
    for (const item of items.slice(0, 3)) {
      const hashId = crypto.createHash('md5').update(item.link).digest('hex').slice(0, 12);
      const externalMatchId = `guardian_live_${hashId}`;

      let liveBlog = await LiveBlog.findOne({ externalMatchId });
      
      // If blog already exists, check if we need to poll new updates
      try {
        const pageRes = await axios.get(item.link, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsNestsDesk/1.0' },
          timeout: 10000
        });
        const page$ = cheerio.load(pageRes.data);

        let ldData = null;
        page$('script[type="application/ld+json"]').each((_, el) => {
          try {
            const parsed = JSON.parse(page$(el).html());
            const doc = Array.isArray(parsed) ? parsed[0] : parsed;
            if (doc['@type'] === 'LiveBlogPosting') {
              ldData = doc;
            }
          } catch (e) {}
        });

        if (!ldData) continue;

        const pageHtmlLower = pageRes.data.toLowerCase();
        const isEnded = ldData.headline.toLowerCase().includes('as it happened') ||
          pageHtmlLower.includes('this blog is now closed');

        const category = item.link.includes('/politics/') ? 'politics'
          : item.link.includes('/business/') ? 'business'
          : item.link.includes('/sport/') || item.link.includes('/football/') ? 'sports'
          : 'world';

        const mainImageUrl = Array.isArray(ldData.image) ? ldData.image[0] : (ldData.image || '');
        const authorName = ldData.author?.[0]?.name || 'Guardian Global News Desk';
        const liveUpdates = Array.isArray(ldData.liveBlogUpdate) ? ldData.liveBlogUpdate : [];

        if (!liveBlog) {
          if (isEnded) continue; // Don't create new if already closed

          const updates = liveUpdates.slice(0, 15).map(u => ({
            title: u.headline || 'BREAKING BULLETIN',
            content: u.articleBody || u.text || 'Developing coverage.',
            createdAt: u.datePublished ? new Date(u.datePublished) : new Date()
          }));

          if (updates.length === 0) {
            updates.push({
              title: 'LIVE COVERAGE COMMENCED',
              content: item.desc.replace(/<[^>]+>/g, '').trim() || ldData.headline,
              createdAt: new Date()
            });
          }

          liveBlog = await LiveBlog.create({
            title: ldData.headline,
            description: item.desc.replace(/<[^>]+>/g, '').trim() || `Real-time coverage and rolling updates for ${ldData.headline}.`,
            category,
            isLive: true,
            author: authorName,
            mainImageUrl,
            externalMatchId,
            tags: ['Live Coverage', 'Breaking News', category.toUpperCase(), 'Rolling Updates'],
            matchStatus: {
              team1: { name: 'Breaking Story', score: 'LIVE' },
              team2: { name: 'Newsroom Desk', score: 'ON AIR' },
              matchInfo: 'Live Rolling Coverage',
              customStats: [
                { label: 'Type', value: 'Minute-by-Minute' },
                { label: 'Desk', value: `${category.toUpperCase()} Desk` },
                { label: 'Updates', value: `${updates.length} Bulletins` }
              ]
            },
            poll: {
              question: 'How significant do you expect the outcome of this developing story to be?',
              options: [
                { text: 'Major Global Impact', votes: 24 },
                { text: 'Moderate / Regional Impact', votes: 11 },
                { text: 'Developing / Uncertain', votes: 5 }
              ]
            },
            updates
          });
          console.log(`[Live Scanner] Auto-discovered breaking world live blog: "${ldData.headline}" (${category})`);
        } else {
          // Update existing live blog
          let updated = false;

          if (isEnded && liveBlog.isLive) {
            liveBlog.isLive = false;
            liveBlog.updates.unshift({
              title: 'LIVE COVERAGE CONCLUDED',
              content: 'Rolling coverage for this story has concluded. See complete timeline of bulletins below.',
              createdAt: new Date()
            });
            await liveBlog.save();
            console.log(`[Live Scanner] Concluded world live blog: "${liveBlog.title}"`);
            await pruneConcludedLiveBlogs(5);
            continue;
          }

          // Ingest any newer updates
          for (const u of liveUpdates) {
            const body = String(u.articleBody || u.text || '').trim();
            if (body && !liveBlog.updates.some(existing => existing.content === body)) {
              liveBlog.updates.unshift({
                title: u.headline || 'LIVE UPDATE',
                content: body,
                createdAt: u.datePublished ? new Date(u.datePublished) : new Date()
              });
              updated = true;
            }
          }

          if (updated) {
            liveBlog.updatedAt = new Date();
            await liveBlog.save();
          }
        }
      } catch (pageErr) {
        console.warn(`[Live Scanner] Failed to parse live blog ${item.link}:`, pageErr.message);
      }
    }
  } catch (error) {
    console.error('[Live Scanner] Error in world news sync:', error.message);
  }
};

/**
 * Continuously discovers live events across all sports and global news from the outside world,
 * syncs updates, and strictly prunes concluded blogs to at most 5.
 */
export const syncLiveCoverageFromOutsideWorld = async () => {
  try {
    // 1. Audit and close any ended blogs
    await auditAndCloseEndedLiveBlogs();

    // 2. Multi-Sport & News Synchronization
    await syncLiveCricketMatches();
    await syncLiveFootballMatches();
    await syncLiveWorldNews();

    // 3. Strictly enforce keeping only the latest 5 concluded archives
    await pruneConcludedLiveBlogs(5);
  } catch (error) {
    console.error('[Live Scanner] Unexpected error in sync cycle:', error.message);
  }
};

/**
 * Starts continuous autonomous background worker
 */
export const startLiveBlogContinuousWorker = () => {
  console.log('[Live Scanner] Starting autonomous continuous live blog discovery worker across Sports & World News...');
  
  // Initial run after brief delay
  setTimeout(() => {
    syncLiveCoverageFromOutsideWorld().catch(e => console.warn('[Live Scanner] Initial run error:', e.message));
  }, 3000);

  // High-frequency 15s polling for active cricket & football live events
  setInterval(() => {
    syncLiveCricketMatches().catch(e => console.warn('[Live Scanner] Live cricket poll error:', e.message));
    syncLiveFootballMatches().catch(e => console.warn('[Live Scanner] Live football poll error:', e.message));
  }, 15000);

  // Recurring 60s background cycle for discovery & strict 5-archive pruning
  setInterval(() => {
    syncLiveCoverageFromOutsideWorld().catch(e => console.warn('[Live Scanner] Interval run error:', e.message));
  }, 60000);
};

export default {
  isMatchOrStreamEnded,
  pruneConcludedLiveBlogs,
  auditAndCloseEndedLiveBlogs,
  syncLiveCoverageFromOutsideWorld,
  startLiveBlogContinuousWorker
};
