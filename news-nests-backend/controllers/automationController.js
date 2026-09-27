import mongoose from 'mongoose';
import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import Subscriber from '../models/Subscriber.js';
import redisClient from '../config/redis.js';
import { sendPersonalizedEmailBlast } from './newsletterController.js';

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const cleanString = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);

const toBoolean = (value) => value === true || value === 'true' || value === '1';

const invalidateNewsCaches = async (article) => {
  if (!redisClient) return;

  const exactKeys = [
    `cache:/api/news/article/${article._id}`,
    article.slug ? `cache:/api/news/article/${article.slug}` : ''
  ].filter(Boolean);

  try {
    if (exactKeys.length) await redisClient.del(...exactKeys);
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', 'cache:/api/news*', 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) await redisClient.del(...keys);
    } while (cursor !== '0');
  } catch (error) {
    console.error('Automation cache invalidation failed:', error.message);
  }
};

export const getAutomationStatus = async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'news-nest-automation-api',
    capabilities: ['semantic-news', 'live-sports', 'newsletter']
  });
};

export const getPendingSemanticNews = async (req, res) => {
  try {
    const limit = clampInteger(req.query.limit, 10, 1, 50);
    const articles = await News.find({
      status: 'approved',
      $or: [
        { embeddingId: { $exists: false } },
        { embeddingId: '' },
        { embeddingId: null }
      ]
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .select('title subtitle content category tags slug aiSummary publishedAt createdAt');

    res.json({ count: articles.length, articles });
  } catch (error) {
    console.error('Error fetching semantic automation queue:', error);
    res.status(500).json({ error: 'Unable to fetch semantic automation queue.' });
  }
};

export const updateNewsSemanticData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid article ID.' });
    }

    const relatedArticles = Array.isArray(req.body.relatedArticles)
      ? Array.from(new Set(req.body.relatedArticles
        .map((value) => String(value))
        .filter((value) => mongoose.isValidObjectId(value) && value !== id)))
        .slice(0, 3)
      : [];

    const update = {
      backstory: cleanString(req.body.backstory, 2000),
      backstoryData: req.body.backstoryData && typeof req.body.backstoryData === 'object' ? req.body.backstoryData : undefined,
      relatedArticles,
      isDuplicateEcho: toBoolean(req.body.isDuplicateEcho),
      embeddingId: cleanString(req.body.embeddingId, 100)
    };

    if (!update.embeddingId) {
      return res.status(400).json({ error: 'embeddingId is required.' });
    }

    const article = await News.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true
    }).populate('relatedArticles', 'title slug subtitle imageUrl publishedAt');

    if (!article) return res.status(404).json({ error: 'Article not found.' });
    await invalidateNewsCaches(article);

    res.json({ message: 'Semantic article data updated.', article });
  } catch (error) {
    console.error('Error updating semantic article data:', error);
    res.status(500).json({ error: 'Unable to update semantic article data.' });
  }
};

export const getAutomationLiveBlogs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isLive !== undefined) filter.isLive = toBoolean(req.query.isLive);
    if (req.query.externalMatchId) filter.externalMatchId = cleanString(req.query.externalMatchId, 120);

    const liveBlogs = await LiveBlog.find(filter)
      .sort({ updatedAt: -1 })
      .limit(clampInteger(req.query.limit, 50, 1, 100));
    res.json({ count: liveBlogs.length, liveBlogs });
  } catch (error) {
    console.error('Error fetching automation live blogs:', error);
    res.status(500).json({ error: 'Unable to fetch live blogs.' });
  }
};

const getThematicLiveImage = (category = 'sports', title = '') => {
  const cat = String(category || '').toLowerCase();
  const t = String(title || '').toLowerCase();

  if (cat.includes('esport') || t.includes('cs2') || t.includes('valorant') || t.includes('fortnite') || t.includes('dota') || t.includes('gaming')) {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('cricket') || t.includes('odi') || t.includes('t20') || t.includes('test') || t.includes('wicket') || t.includes('stumps') || cat.includes('cricket')) {
    return 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('sport') || t.includes('league') || t.includes('cup') || t.includes('championship') || t.includes('match')) {
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('politic') || t.includes('election') || t.includes('parliament') || t.includes('congress') || t.includes('minister') || t.includes('court') || t.includes('government')) {
    return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('world') || t.includes('diplomacy') || t.includes('un ') || t.includes('treaty') || t.includes('iran') || t.includes('summit') || t.includes('crisis')) {
    return 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1200&q=80';
  }
  if (cat.includes('tech') || t.includes('ai ') || t.includes('meta') || t.includes('google') || t.includes('apple') || t.includes('robot') || t.includes('software')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
};

export const upsertLiveFixture = async (req, res) => {
  try {
    const fixture = req.body.fixture || req.body;
    const externalMatchId = cleanString(fixture.externalMatchId, 120);
    const title = cleanString(fixture.title || fixture.matchName, 300);
    if (!externalMatchId || !title) {
      return res.status(400).json({ error: 'externalMatchId and title are required.' });
    }

    const team1Name = cleanString(fixture.teams?.team1 || fixture.team1?.name || fixture.team1, 100);
    const team2Name = cleanString(fixture.teams?.team2 || fixture.team2?.name || fixture.team2, 100);
    const venue = cleanString(fixture.venue, 200);
    const matchType = cleanString(fixture.matchType, 80);
    const category = cleanString(fixture.category || 'sports', 40).toLowerCase();
    const description = cleanString(
      fixture.description || `Live score, real-time commentary and instant bulletins for ${title}${venue ? ` at ${venue}` : ''}.`,
      1000
    );
    const mainImageUrl = cleanString(fixture.mainImageUrl || getThematicLiveImage(category, title), 500);

    const initialStats = Array.isArray(fixture.customStats) && fixture.customStats.length > 0
      ? fixture.customStats
      : [
        { label: 'Format', value: matchType || 'Official Match' },
        { label: 'Coverage', value: 'Ball-by-Ball Live' }
      ];

    const defaultPoll = fixture.poll || {
      question: team1Name && team2Name
        ? `Who will win the match between ${team1Name} and ${team2Name}?`
        : `What is your prediction for ${title.slice(0, 80)}?`,
      options: [
        { text: team1Name || 'Option 1', votes: 14 },
        { text: team2Name || 'Option 2', votes: 9 },
        { text: 'Draw / Close Decider', votes: 3 }
      ]
    };

    const initialUpdates = Array.isArray(fixture.updates) && fixture.updates.length > 0
      ? fixture.updates
      : [
        {
          title: 'LIVE COVERAGE COMMENCED',
          content: `${title} is now streaming live on News Nests. Follow real-time commentary, live telemetry, and community discussion below.`
        }
      ];

    let liveBlog = await LiveBlog.findOne({ externalMatchId });
    let created = false;
    if (!liveBlog) {
      liveBlog = await LiveBlog.create({
        title,
        description,
        category,
        isLive: true,
        author: 'News Nests Real-Time Desk',
        mainImageUrl,
        externalMatchId,
        tags: Array.from(new Set(['Live Coverage', category, matchType, team1Name && `${team1Name} live`, team2Name && `${team2Name} live`].filter(Boolean))),
        matchStatus: {
          team1: { name: team1Name, score: cleanString(fixture.team1?.score || 'Yet to bat', 100) },
          team2: { name: team2Name, score: cleanString(fixture.team2?.score || 'Yet to bat', 100) },
          matchInfo: [matchType, venue].filter(Boolean).join(', ') || 'Live Coverage',
          customStats: initialStats
        },
        poll: defaultPoll,
        updates: initialUpdates
      });
      created = true;
    } else {
      if (title) liveBlog.title = title;
      if (description) liveBlog.description = description;
      if (mainImageUrl) liveBlog.mainImageUrl = mainImageUrl;
      if (category) liveBlog.category = category;
      liveBlog.isLive = true;
      if (!liveBlog.matchStatus) liveBlog.matchStatus = {};
      if (team1Name) liveBlog.matchStatus.team1 = { name: team1Name, score: cleanString(fixture.team1?.score || liveBlog.matchStatus.team1?.score || 'Yet to bat', 100) };
      if (team2Name) liveBlog.matchStatus.team2 = { name: team2Name, score: cleanString(fixture.team2?.score || liveBlog.matchStatus.team2?.score || 'Yet to bat', 100) };
      if (venue || matchType) {
        liveBlog.matchStatus.matchInfo = [matchType, venue].filter(Boolean).join(', ') || liveBlog.matchStatus.matchInfo;
      }
      if (Array.isArray(fixture.customStats) && fixture.customStats.length > 0) {
        liveBlog.matchStatus.customStats = fixture.customStats;
      }
      if (defaultPoll.question && (!liveBlog.poll || !liveBlog.poll.question || liveBlog.poll.question.includes('Ahmedabad'))) {
        liveBlog.poll = defaultPoll;
      }
      await liveBlog.save();
    }

    res.status(created ? 201 : 200).json({ created, liveBlog });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateExternalMatchId = cleanString(
        req.body.fixture?.externalMatchId || req.body.externalMatchId,
        120,
      );
      const liveBlog = await LiveBlog.findOne({ externalMatchId: duplicateExternalMatchId });
      return res.json({ created: false, liveBlog });
    }
    console.error('Error upserting automated live fixture:', error);
    res.status(500).json({ error: 'Unable to create or update live fixture.' });
  }
};

export const syncLiveScore = async (req, res) => {
  try {
    const externalMatchId = cleanString(req.params.externalMatchId, 120);
    const score = req.body.score || req.body;
    const liveBlog = await LiveBlog.findOne({ externalMatchId });
    if (!liveBlog) return res.status(404).json({ error: 'Live blog not found for this match.' });

    const updateId = cleanString(score.updateId || score.latestUpdateId, 160);
    const updateContent = cleanString(
      score.latestCommentary?.content || score.latestCommentary || score.commentary,
      4000
    );
    const updateTitle = cleanString(score.latestCommentary?.title || score.updateTitle || 'LIVE UPDATE', 200);

    const incomingMatchStatus = score.matchStatus || {
      team1: score.team1,
      team2: score.team2,
      matchInfo: score.matchInfo || score.status || '',
      customStats: score.customStats || []
    };

    if (incomingMatchStatus?.team1 || incomingMatchStatus?.team2 || incomingMatchStatus?.matchInfo) {
      liveBlog.matchStatus = {
        team1: {
          name: cleanString(incomingMatchStatus.team1?.name || liveBlog.matchStatus?.team1?.name, 100),
          score: cleanString(incomingMatchStatus.team1?.score || liveBlog.matchStatus?.team1?.score, 100)
        },
        team2: {
          name: cleanString(incomingMatchStatus.team2?.name || liveBlog.matchStatus?.team2?.name, 100),
          score: cleanString(incomingMatchStatus.team2?.score || liveBlog.matchStatus?.team2?.score, 100)
        },
        matchInfo: cleanString(incomingMatchStatus.matchInfo || liveBlog.matchStatus?.matchInfo, 300),
        customStats: Array.isArray(incomingMatchStatus.customStats) && incomingMatchStatus.customStats.length > 0
          ? incomingMatchStatus.customStats.slice(0, 20).map((stat) => ({
            label: cleanString(stat.label, 80),
            value: cleanString(stat.value, 120)
          }))
          : (liveBlog.matchStatus?.customStats || [])
      };
    }

    let appendedUpdate = false;
    const incomingUpdates = Array.isArray(score.updates) && score.updates.length > 0
      ? score.updates
      : (updateContent ? [{ title: updateTitle, content: updateContent }] : []);

    // Filter out dummy/stale updates if real commentary is present
    if (incomingUpdates.length > 0 && liveBlog.updates.some(u => u.content && u.content.includes('Ahmedabad'))) {
      liveBlog.updates = liveBlog.updates.filter(u => !u.content.includes('Ahmedabad'));
    }

    // Ingest newest updates first
    const now = Date.now();
    for (const [idx, item] of [...incomingUpdates].reverse().entries()) {
      const content = cleanString(item.content || item, 4000);
      const title = cleanString(item.title || 'LIVE UPDATE', 200);
      if (content && !liveBlog.updates.some((u) => u.content === content)) {
        const itemDate = item.createdAt
          ? new Date(item.createdAt)
          : new Date(now - (incomingUpdates.length - 1 - idx) * 3 * 60 * 1000);

        liveBlog.updates.unshift({
          title,
          content,
          createdAt: itemDate
        });
        appendedUpdate = true;
      }
    }

    if (updateId) liveBlog.lastExternalUpdateId = updateId;

    const statusStr = String(score.result || score.status || score.matchStatus?.matchInfo || '').toLowerCase();
    const hasCompleteWord = ['won by', 'won the', 'match complete', 'complete', 'match over', 'abandoned', 'match drawn', 'match tied', 'no result'].some(w => statusStr.includes(w));
    const isComplete = toBoolean(score.isComplete || score.matchComplete) || hasCompleteWord;
    
    if (isComplete) {
      liveBlog.isLive = false;
      const finalText = cleanString(score.result || score.status || 'Match complete.', 1000);
      if (finalText && !liveBlog.updates.some((update) => update.title === 'MATCH OVER' || update.content === finalText)) {
        liveBlog.updates.unshift({ title: 'MATCH OVER', content: finalText, createdAt: new Date() });
      }
    }

    liveBlog.updatedAt = new Date();
    await liveBlog.save();
    res.json({ appendedUpdate, closed: !liveBlog.isLive, liveBlog });
  } catch (error) {
    console.error('Error syncing automated live score:', error);
    res.status(500).json({ error: 'Unable to sync live score.' });
  }
};

export const seedMultiCategoryLiveBlogs = async (req, res) => {
  try {
    const baseNow = Date.now();
    const multiCategorySeeds = [
      {
        externalMatchId: 'esports_starseries_fall_2026',
        title: 'Grand Finals Live: Team Vitality vs Aurora Gaming - CS2 StarSeries Fall 2026',
        description: 'Comprehensive round-by-round commentary, tactical utility analytics, and economy telemetry from the CS2 StarSeries Fall 2026 Grand Final showdown.',
        category: 'esports',
        mainImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        author: 'News Nests Esports Desk',
        matchStatus: {
          team1: { name: 'Team Vitality', score: '2' },
          team2: { name: 'Aurora Gaming', score: '1' },
          matchInfo: 'Grand Final (BO5) • Map 4: Inferno (Live 11-9)',
          customStats: [
            { label: 'Tournament', value: 'StarSeries Fall 2026' },
            { label: 'Prize Pool', value: '$500,000 USD' },
            { label: 'Map 1 (Nuke)', value: '13-8 (Vitality)' },
            { label: 'Map 2 (Mirage)', value: '11-13 (Aurora)' },
            { label: 'Map 3 (Anubis)', value: '13-10 (Vitality)' },
            { label: 'Current Map', value: 'Inferno (Vitality 11 - 9 Aurora)' }
          ]
        },
        poll: {
          question: 'Can Aurora Gaming force a deciding Map 5 on Train?',
          options: [
            { text: 'Yes, Aurora will mount the comeback', votes: 47 },
            { text: 'No, Vitality will close out the championship', votes: 122 }
          ]
        },
        updates: [
          {
            title: 'Round 20: ZywOo 1v2 Clutch on B Site!',
            content: 'Vitality 11 - 9 Aurora. With the bomb planted on B Site, ZywOo finds two crisp AWP frags through smoke to secure match point buffer for Vitality!',
            createdAt: new Date(baseNow - 4 * 60 * 1000)
          },
          {
            title: 'Round 19: Aurora Answers with Fast Banana Push',
            content: 'Vitality 10 - 9 Aurora. deko and KENSI open Banana with double HE grenades, overwhelming Vitality defenders and winning the round with zero casualties.',
            createdAt: new Date(baseNow - 12 * 60 * 1000)
          },
          {
            title: 'Halftime Switch: Vitality 9 - 6 Aurora',
            content: 'Vitality concludes a dominant Counter-Terrorist half on Inferno. Apex orchestrates high-pressure middle control to shut down Aurora default executes.',
            createdAt: new Date(baseNow - 27 * 60 * 1000)
          },
          {
            title: 'Pistol Round: Vitality takes CT opener',
            content: 'FlameZ secures a triple-kill with dualies in Apartments to kick off Map 4 for Team Vitality.',
            createdAt: new Date(baseNow - 48 * 60 * 1000)
          }
        ]
      },
      {
        externalMatchId: 'politics_hormuz_un_summit_2026',
        title: 'Global Geopolitics Live: Geneva Emergency Talks on Strait of Hormuz Navigation & Oil Security',
        description: 'Instant bulletins and diplomatic analysis as US, European, Iranian, and Gulf representatives hold high-stakes emergency negotiations on Persian Gulf maritime corridors.',
        category: 'politics',
        mainImageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
        author: 'Global Affairs Newsroom',
        matchStatus: {
          team1: { name: 'Western Coalition', score: 'Draft Communique 4' },
          team2: { name: 'Regional Mediators', score: 'Oman Protocol B' },
          matchInfo: 'Geneva Peace Palace • Ministerial Emergency Session',
          customStats: [
            { label: 'Host & Mediator', value: 'Switzerland & Oman' },
            { label: 'Core Transit Zone', value: 'Strait of Hormuz' },
            { label: 'Oil Market Impact', value: 'Brent Crude $86.40/bbl' },
            { label: 'Delegation Status', value: 'Minister-level closed consultations' }
          ]
        },
        poll: {
          question: 'Will international diplomatic mediation produce a binding maritime transit agreement?',
          options: [
            { text: 'Yes, both sides face intense economic pressure', votes: 89 },
            { text: 'No, fundamental disagreements remain unresolved', votes: 71 }
          ]
        },
        updates: [
          {
            title: '17:15 GMT: European Mediators Present 5-Point De-escalation Memo',
            content: 'European Union foreign policy representatives have formally tabled a 5-point proposal providing commercial ship escorts alongside monitored maritime corridors.',
            createdAt: new Date(baseNow - 9 * 60 * 1000)
          },
          {
            title: '16:30 GMT: Iranian Foreign Ministry Signals Willingness for Technical Talks',
            content: 'Tehran foreign ministry spokespersons confirm participation in technical maritime security working groups while maintaining sovereign territorial waters claims.',
            createdAt: new Date(baseNow - 34 * 60 * 1000)
          },
          {
            title: '15:00 GMT: Joint Plenary Session Convenes in Geneva',
            content: 'Delegates from 14 nations enter the main assembly chamber under strict diplomatic protocol to discuss international shipping insurance and energy transit guarantees.',
            createdAt: new Date(baseNow - 72 * 60 * 1000)
          }
        ]
      },
      {
        externalMatchId: 'tech_meta_muse_agent_keynote_2026',
        title: 'AI Economy Keynote Live: Meta Launches Autonomous Agent "Muse" & Subscription Management Engine',
        description: 'Real-time announcements, technical architecture breakdowns, and Wall Street financial impact analysis as Meta introduces agentic AI assistant Muse.',
        category: 'technology',
        mainImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        author: 'Silicon Valley Technology Desk',
        matchStatus: {
          team1: { name: 'Agent Capabilities', score: '100% Autonomous' },
          team2: { name: 'Platform Rollout', score: 'Phase 1 Beta' },
          matchInfo: 'Meta Global Keynote • Menlo Park, California',
          customStats: [
            { label: 'Featured Speaker', value: 'Mark Zuckerberg' },
            { label: 'Core Architecture', value: 'Llama 4 Multi-Agentic Engine' },
            { label: 'Target Disruption', value: 'Subscription Economy & Auto-Audits' },
            { label: 'Developer SDK', value: 'Live on GitHub & Cloud APIs' }
          ]
        },
        poll: {
          question: 'Will autonomous AI agents replace human management of subscriptions and recurring bills?',
          options: [
            { text: 'Yes, agents will automate daily finances completely', votes: 156 },
            { text: 'No, consumers will insist on manual verification', votes: 41 }
          ]
        },
        updates: [
          {
            title: 'Demo: Muse Cancels Inactive Streaming Subscription in 3 Seconds',
            content: 'On stage, Zuckerberg demonstrates Muse identifying a forgotten recurring $18/month gym subscription, navigating the cancellation flow, and depositing savings into a high-yield account.',
            createdAt: new Date(baseNow - 6 * 60 * 1000)
          },
          {
            title: 'Security Architecture: Encrypted Local Enclaves Announced',
            content: 'Meta Chief AI Scientist details the cryptographic sandboxing that prevents personal agents from exposing banking credentials to third-party services.',
            createdAt: new Date(baseNow - 26 * 60 * 1000)
          },
          {
            title: 'Keynote Starts: Zuckerberg Outlines Post-App Internet Strategy',
            content: 'Mark Zuckerberg takes the stage in Menlo Park, declaring agentic AI personal assistants as the central computing interface of the next decade.',
            createdAt: new Date(baseNow - 59 * 60 * 1000)
          }
        ]
      }
    ];

    const results = [];
    for (const seed of multiCategorySeeds) {
      let liveBlog = await LiveBlog.findOne({ externalMatchId: seed.externalMatchId });
      if (!liveBlog) {
        liveBlog = await LiveBlog.create({
          ...seed,
          isLive: true,
          tags: [seed.category, 'Live Coverage', 'Breaking']
        });
      } else {
        liveBlog.title = seed.title;
        liveBlog.description = seed.description;
        liveBlog.category = seed.category;
        liveBlog.isLive = true;
        liveBlog.mainImageUrl = seed.mainImageUrl;
        liveBlog.matchStatus = seed.matchStatus;
        liveBlog.poll = seed.poll;
        liveBlog.updates = seed.updates;
        liveBlog.updatedAt = new Date();
        await liveBlog.save();
      }
      results.push(liveBlog);
    }

    res.json({ message: 'Multi-category live coverage seeded successfully', count: results.length, liveBlogs: results });
  } catch (error) {
    console.error('Error seeding multi-category live blogs:', error);
    res.status(500).json({ error: 'Unable to seed multi-category live blogs.' });
  }
};

export const getNewsletterAutomationContext = async (_req, res) => {
  try {
    const [subscriberCount, liveCoverage, topStories] = await Promise.all([
      Subscriber.countDocuments({ isActive: true }),
      LiveBlog.find({ isLive: true }).sort({ updatedAt: -1 }).limit(3).lean(),
      News.find({ status: 'approved' })
        .sort({ isTrending: -1, views: -1, shares: -1, publishedAt: -1, createdAt: -1 })
        .limit(5)
        .select('title slug subtitle aiSummary backstory relatedArticles category imageUrl publishedAt views shares')
        .populate('relatedArticles', 'title slug')
        .lean()
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      subscriberCount,
      liveCoverage,
      topStories
    });
  } catch (error) {
    console.error('Error building newsletter automation context:', error);
    res.status(500).json({ error: 'Unable to build newsletter context.' });
  }
};

export const sendAutomatedNewsletter = async (req, res) => {
  try {
    const subject = cleanString(req.body.subject, 200);
    const content = String(req.body.content || '').trim();
    if (!subject || content.length < 100) {
      return res.status(400).json({ error: 'A subject and complete HTML content are required.' });
    }
    if (content.length > 750000) {
      return res.status(413).json({ error: 'Newsletter HTML is too large.' });
    }

    const sentCount = await sendPersonalizedEmailBlast(subject, content, true);
    res.json({ message: `Automated campaign sent to ${sentCount} subscribers.`, sentCount });
  } catch (error) {
    console.error('Error sending automated newsletter:', error);
    res.status(500).json({ error: 'Unable to send automated newsletter.' });
  }
};
