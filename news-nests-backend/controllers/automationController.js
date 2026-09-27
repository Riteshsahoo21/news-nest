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
    const description = cleanString(
      fixture.description || `Live score, updates and commentary for ${title}${venue ? ` at ${venue}` : ''}.`,
      1000
    );

    let liveBlog = await LiveBlog.findOne({ externalMatchId });
    let created = false;
    if (!liveBlog) {
      liveBlog = await LiveBlog.create({
        title,
        description,
        category: 'sports',
        isLive: true,
        author: 'News Nests Sports Automation',
        externalMatchId,
        tags: Array.from(new Set(['Cricket', matchType, team1Name && `${team1Name} live`, team2Name && `${team2Name} live`].filter(Boolean))),
        matchStatus: {
          team1: { name: team1Name, score: cleanString(fixture.team1?.score || 'Yet to bat', 100) },
          team2: { name: team2Name, score: cleanString(fixture.team2?.score || 'Yet to bat', 100) },
          matchInfo: [matchType, venue].filter(Boolean).join(', '),
          customStats: []
        }
      });
      created = true;
    } else {
      if (!liveBlog.title) liveBlog.title = title;
      if (!liveBlog.description) liveBlog.description = description;
      if (!liveBlog.matchStatus?.team1?.name && team1Name) liveBlog.matchStatus.team1.name = team1Name;
      if (!liveBlog.matchStatus?.team2?.name && team2Name) liveBlog.matchStatus.team2.name = team2Name;
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
        customStats: Array.isArray(incomingMatchStatus.customStats)
          ? incomingMatchStatus.customStats.slice(0, 20).map((stat) => ({
            label: cleanString(stat.label, 80),
            value: cleanString(stat.value, 120)
          }))
          : (liveBlog.matchStatus?.customStats || [])
      };
    }

    let appendedUpdate = false;
    if (updateContent && (!updateId || updateId !== liveBlog.lastExternalUpdateId)) {
      const alreadyPresent = liveBlog.updates.some((update) => update.content === updateContent);
      if (!alreadyPresent) {
        liveBlog.updates.push({ title: updateTitle, content: updateContent });
        appendedUpdate = true;
      }
      if (updateId) liveBlog.lastExternalUpdateId = updateId;
    }

    const isComplete = toBoolean(score.isComplete || score.matchComplete);
    if (isComplete && liveBlog.isLive) {
      const finalText = cleanString(score.result || score.status || 'Match complete.', 1000);
      if (finalText && !liveBlog.updates.some((update) => update.title === 'MATCH OVER' && update.content === finalText)) {
        liveBlog.updates.push({ title: 'MATCH OVER', content: finalText });
      }
      liveBlog.isLive = false;
    }

    liveBlog.updatedAt = new Date();
    await liveBlog.save();
    res.json({ appendedUpdate, closed: !liveBlog.isLive, liveBlog });
  } catch (error) {
    console.error('Error syncing automated live score:', error);
    res.status(500).json({ error: 'Unable to sync live score.' });
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
