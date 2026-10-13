import mongoose from 'mongoose';
import axios from 'axios';
import News from '../models/News.js';
import Comment from '../models/Comment.js';
import { trackUniqueView } from '../utils/viewTracker.js';
import { getFullArticleContent } from '../services/hybridNewsService.js';
import { reverseGeocode } from '../services/locationService.js';
import { buildSearchFilter, escapeRegExp } from '../utils/searchQuery.js';
import { discoverLocalNews } from '../services/liveDiscoveryService.js';
import { notifyArticleApprovedInBackground } from '../services/automationWebhookService.js';
import { findRelatedNewsMultiTier } from '../services/recommendationService.js';

// Helper to determine sort logic
const getSortObject = (sort) => {
  if (sort === 'most_viewed') return { views: -1 };
  if (sort === 'most_liked') return { likesCount: -1 };
  return { publishedAt: -1, createdAt: -1 }; // 'newest' is default
};

const NEWS_SEARCH_FIELDS = [
  'title', 'subtitle', 'content', 'category', 'subCategory', 'tags',
  'author', 'sourceName', 'country', 'region', 'city', 'aiSummary', 'keyTakeaways'
];

// Helper: Smart Shuffling & Priority Algorithm for Reporter vs Aggregator News
const applyReporterPriorityShuffle = (newsArray) => {
  if (!Array.isArray(newsArray) || newsArray.length === 0) return newsArray;
  
  const reporterStories = [];
  const aggregatorStories = [];
  
  newsArray.forEach(article => {
    // Treat articles with authorId as genuine native reporter publications
    if (article.authorId) {
      reporterStories.push(article);
    } else {
      aggregatorStories.push(article);
    }
  });
  
  if (reporterStories.length === 0) return newsArray;
  
  const shuffled = [];
  let repIdx = 0;
  let aggIdx = 0;
  
  // Rule 1: Priority Placement - Ensure up to the 2 newest reporter articles sit at the very top
  while (repIdx < Math.min(2, reporterStories.length)) {
    shuffled.push(reporterStories[repIdx]);
    repIdx++;
  }
  
  // Rule 2: Interleaving - For remaining news, insert 1 reporter article for every 3 automated aggregator stories
  while (repIdx < reporterStories.length || aggIdx < aggregatorStories.length) {
    for (let i = 0; i < 3 && aggIdx < aggregatorStories.length; i++) {
      shuffled.push(aggregatorStories[aggIdx]);
      aggIdx++;
    }
    if (repIdx < reporterStories.length) {
      shuffled.push(reporterStories[repIdx]);
      repIdx++;
    }
  }
  
  return shuffled;
};

// Get all news
export const getAllNews = async (req, res) => {
  try {
    const { sort, q, limit, country, subCategory, language } = req.query;
    const sortObj = getSortObject(sort);
    
    let filter = {};
    if (!req.query.allStatus) {
      filter.status = 'approved';
    }

    // Country filtering
    if (country && country !== 'all') {
      filter.country = country.toLowerCase();
    }

    // SubCategory filtering (e.g. 'esports', 'regional', 'national')
    if (subCategory && subCategory !== 'all') {
      filter.subCategory = subCategory.toLowerCase();
    }

    // Language filtering (e.g. 'en', 'hi')
    if (language && language !== 'all') {
      filter.language = language.toLowerCase();
    }

    const isHomeView = req.query.forHome === 'true' || (!country && !subCategory && !req.query.category && !req.query.allStatus && !q);

    // Search query
    if (q) {
      const searchFilter = buildSearchFilter(q, NEWS_SEARCH_FIELDS);
      if (searchFilter) Object.assign(filter, searchFilter);
    } else if (isHomeView) {
      // Default home view: show verified authentic news with real image and substantive description
      filter.imageUrl = { 
        $exists: true, 
        $ne: '', 
        $nin: [null, ''], 
        $not: /unsplash\.com/i 
      };

      const homeConditions = [
        {
          $or: [
            { content: { $exists: true, $ne: '', $not: /We use cookies and data/i } },
            { summary: { $exists: true, $ne: '', $not: /We use cookies and data/i } }
          ]
        },
        {
          $or: [
            { isFeaturedOnHome: true },
            { authorId: { $ne: null } },
            { isFullContentFetched: true }
          ]
        }
      ];

      if (filter.$and) {
        filter.$and.push(...homeConditions);
      } else {
        filter.$and = homeConditions;
      }
    }
    
    let query = News.find(filter).sort(sortObj);
    const targetLimit = limit ? parseInt(limit) : null;
    if (targetLimit) {
      // Query larger pool before shuffling so recent reporter news isn't excluded by a flood of aggregator news
      query = query.limit(Math.max(targetLimit * 2, 100));
    }
    let news = await query;

    if (isHomeView) {
      news = news.filter((art) => {
        const img = art.imageUrl || art.coverImage || '';
        if (!img || img.includes('unsplash.com')) return false;
        const text = (art.content || art.summary || art.subtitle || '').trim();
        if (text.length < 80) return false;
        if (/we use cookies and data/i.test(text) || /privacytools/i.test(text) || /choose to [‘']?accept all/i.test(text)) {
          return false;
        }
        return true;
      });
    }
    
    // Apply reporter priority shuffling for readers on newest/default sorts
    if (!req.query.allStatus && (!sort || sort === 'newest') && !q) {
      news = applyReporterPriorityShuffle(news);
    }
    
    if (targetLimit && news.length > targetLimit) {
      news = news.slice(0, targetLimit);
    }
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching all news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get location-aware news. Exact city/region matches are returned first and
// then supplemented with country coverage so sparse local feeds never produce
// an empty home screen.
export const getLocalNews = async (req, res) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 30;
    const fallbackCountry = typeof req.query.country === 'string'
      ? req.query.country.trim().toLowerCase().slice(0, 2)
      : '';

    let location;
    try {
      location = await reverseGeocode(req.query.latitude, req.query.longitude);
    } catch (error) {
      if (!fallbackCountry) throw error;
      location = {
        latitude: Number(req.query.latitude),
        longitude: Number(req.query.longitude),
        city: '',
        region: '',
        country: fallbackCountry.toUpperCase(),
        countryCode: fallbackCountry,
        label: fallbackCountry.toUpperCase(),
        approximate: true
      };
    }

    const countryCode = (location.countryCode || fallbackCountry || 'global').toLowerCase();
    const baseFilter = { status: 'approved' };
    if (countryCode !== 'global') {
      baseFilter.country = { $in: [countryCode, 'global'] };
    }

    const placeNames = Array.from(new Set([location.city, location.region].filter(Boolean)));
    const placeMatchers = placeNames.map((place) => new RegExp(escapeRegExp(place), 'i'));
    const localSignals = placeMatchers.flatMap((regex) => ([
      { city: { $regex: regex } },
      { region: { $regex: regex } },
      { title: { $regex: regex } },
      { subtitle: { $regex: regex } },
      { tags: { $regex: regex } }
    ]));

    let exactArticles = [];
    if (localSignals.length > 0) {
      exactArticles = await News.find({
        ...baseFilter,
        $or: localSignals
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit);
    }

    let discovery = { attempted: false };
    const minimumLocalInventory = Math.min(limit, 8);
    if (exactArticles.length < minimumLocalInventory) {
      discovery = await discoverLocalNews(location, {
        country: countryCode,
        limit: Math.min(6, Math.max(3, minimumLocalInventory - exactArticles.length))
      });

      if (
        localSignals.length > 0 &&
        ((discovery.acceptedCount || 0) > 0 || (discovery.skippedCompleteCount || 0) > 0)
      ) {
        exactArticles = await News.find({
          ...baseFilter,
          $or: localSignals
        })
          .sort({ publishedAt: -1, createdAt: -1 })
          .limit(limit);
      }
    }

    let remaining = limit - exactArticles.length;
    let nearbyArticles = exactArticles;
    let countryFallbackCount = 0;
    let countryArticles = [];
    if (remaining > 0 && countryCode !== 'global') {
      countryArticles = await News.find({
        status: 'approved',
        country: countryCode,
        _id: { $nin: exactArticles.map((article) => article._id) }
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(remaining);
      nearbyArticles = [...nearbyArticles, ...countryArticles];
      countryFallbackCount = countryArticles.length;
      remaining -= countryArticles.length;
    }

    let globalArticles = [];
    if (remaining > 0) {
      globalArticles = await News.find({
        status: 'approved',
        _id: { $nin: nearbyArticles.map((article) => article._id) }
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(remaining);
      nearbyArticles = [...nearbyArticles, ...globalArticles];
    }

    if (req.query.forHome === 'true') {
      const isComplete = (art) => {
        const img = art.imageUrl || art.coverImage || '';
        if (!img || img.includes('unsplash.com')) return false;
        const text = (art.content || art.summary || art.subtitle || '').trim();
        if (text.length < 80) return false;
        if (/we use cookies and data/i.test(text) || /privacytools/i.test(text) || /choose to [‘']?accept all/i.test(text)) {
          return false;
        }
        return true;
      };
      exactArticles = exactArticles.filter(isComplete);
      nearbyArticles = nearbyArticles.filter(isComplete);
      countryArticles = countryArticles.filter(isComplete);
      globalArticles = globalArticles.filter(isComplete);
    }

    res.json({
      location,
      articles: nearbyArticles,
      localArticles: exactArticles,
      fallbackArticles: [...countryArticles, ...globalArticles],
      countryArticles,
      globalArticles,
      exactMatches: exactArticles.length,
      fallbackUsed: exactArticles.length < nearbyArticles.length,
      countryFallbackCount,
      discovery
    });
  } catch (error) {
    console.error('Error fetching local news:', error.message);
    const statusCode = error.statusCode || 502;
    res.status(statusCode).json({
      error: statusCode === 400
        ? error.message
        : 'Unable to determine your region right now. Please select a country instead.'
    });
  }
};

// Get single news by ID or semantic slug with comments
export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    
    // Fetch the news first to get its ID
    let news = await News.findOne(query)
      .populate('likes', 'fullName')
      .populate('relatedArticles', 'title slug subtitle summary imageUrl mainImageUrl category publishedAt createdAt');
    
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    // Defensive auto-enrichment: If relatedArticles is empty or has fewer than 2 items, auto-populate from category
    if (!news.relatedArticles || news.relatedArticles.length < 2) {
      try {
        const companionNews = await News.find({
          _id: { $ne: news._id },
          status: 'approved',
          category: news.category ? news.category.toLowerCase() : 'general'
        })
          .sort({ publishedAt: -1, createdAt: -1 })
          .limit(3)
          .select('title slug subtitle summary imageUrl mainImageUrl category publishedAt createdAt');

        if (companionNews.length > 0) {
          news.relatedArticles = companionNews;
          News.updateOne({ _id: news._id }, { $set: { relatedArticles: companionNews.map(c => c._id) } }).catch(() => {});
        }
      } catch (relErr) {
        console.error('Error enriching related articles in getNewsById:', relErr);
      }
    }

    // If backstory is missing, auto-generate from top related article context
    if ((!news.backstory || !news.backstory.trim()) && news.relatedArticles && news.relatedArticles.length > 0) {
      const topTitle = news.relatedArticles[0]?.title || '';
      news.backstory = `The Backstory: This development builds upon earlier coverage of '${topTitle}'. Historical context and ongoing developments remain actively tracked.`;
      News.updateOne({ _id: news._id }, { $set: { backstory: news.backstory } }).catch(() => {});
    }

    // The enrichment service decides whether body, media or summary details are
    // still missing. Calling it here also repairs older partially-fetched rows.
    if (news.sourceUrl) {
      news = await getFullArticleContent(news);
    }

    // Only increment views if this is a unique view for this IP/User
    const isUnique = await trackUniqueView(req, news._id, 'News');
    if (isUnique) {
      news = await News.findByIdAndUpdate(news._id, { $inc: { views: 1 } }, { new: true })
        .populate('likes', 'fullName')
        .populate('relatedArticles', 'title slug subtitle imageUrl mainImageUrl publishedAt');
    }

    // Fetch associated comments using confirmed news._id
    const comments = await Comment.find({ newsId: news._id, isApproved: true })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName profilePicture');

    res.json({ article: news, comments });
  } catch (error) {
    console.error('Error fetching news by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get editor picks
export const getEditorPicks = async (req, res) => {
  try {
    const sortObj = getSortObject(req.query.sort);
    const news = await News.find({ 
      isEditorPick: true, 
      status: 'approved',
      imageUrl: { $exists: true, $ne: '', $nin: [null, ''], $not: /unsplash\.com/i },
      content: { $exists: true, $ne: '', $not: /We use cookies and data/i }
    }).sort(sortObj);
    res.json(news);
  } catch (error) {
    console.error('Error fetching editor picks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get trending news
export const getTrendingNews = async (req, res) => {
  try {
    const sortObj = getSortObject(req.query.sort);
    const news = await News.find({ 
      isTrending: true, 
      status: 'approved',
      imageUrl: { $exists: true, $ne: '', $nin: [null, ''], $not: /unsplash\.com/i },
      content: { $exists: true, $ne: '', $not: /We use cookies and data/i }
    }).sort(sortObj);
    res.json(news);
  } catch (error) {
    console.error('Error fetching trending news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get news by category
export const getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { sort, limit } = req.query;
    const sortObj = getSortObject(sort);
    
    let catQuery = (category || '').toLowerCase().trim();
    if (catQuery === 'tech') catQuery = 'technology';
    if (catQuery === 'biz') catQuery = 'business';
    if (catQuery === 'ent') catQuery = 'entertainment';
    if (catQuery === 'sci') catQuery = 'science';
    
    const targetLimit = limit ? parseInt(limit) : null;
    let query = News.find({ category: catQuery, status: 'approved' }).sort(sortObj);
    if (targetLimit) {
      query = query.limit(Math.max(targetLimit * 2, 100));
    }
    let news = await query;
    
    if (!sort || sort === 'newest') {
      news = applyReporterPriorityShuffle(news);
    }
    if (targetLimit && news.length > targetLimit) {
      news = news.slice(0, targetLimit);
    }
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a news article
export const createNews = async (req, res) => {
  try {
    const { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration, action, scheduledAt, tags } = req.body;
    
    // Process multiple uploaded images
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      mediaUrls = req.files.map(file => file.path);
    } else if (req.body.imageUrl) {
      // Fallback if passing single URL via body
      mediaUrls = [req.body.imageUrl];
    }
    let imageUrl = mediaUrls.length > 0 ? mediaUrls[0] : '';

    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Please provide title, content, and category' });
    }

    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to post in the '${category}' category.` });
    }

    // Determine auto-approval based on dynamic permissions
    const permissions = req.user.permissions || [];
    const canAutoApprove = permissions.includes('approve_content') || permissions.includes('manage_content');

    let initialStatus = 'pending';
    let finalScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    if (action === 'draft') {
      initialStatus = 'draft';
    } else if (action === 'schedule') {
      initialStatus = canAutoApprove ? 'scheduled' : 'pending';
    } else {
      initialStatus = canAutoApprove ? 'approved' : 'pending';
    }

    const newsArticle = await News.create({
      title,
      content,
      category,
      author,
      authorId: req.user.id,
      imageUrl,
      isEditorPick: isEditorPick || false,
      isTrending: isTrending || false,
      subtitle,
      readTime: readTime || 1,
      videoUrl,
      videoDuration,
      status: initialStatus,
      scheduledAt: finalScheduledAt,
      mediaUrls,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
    });

    if (newsArticle.status === 'approved') notifyArticleApprovedInBackground(newsArticle);

    res.status(201).json({
      message: 'News article created successfully',
      article: newsArticle
    });
  } catch (error) {
    console.error('Error creating news:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid category or missing fields' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a news article (Admin/Editor)
export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedArticle = await News.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (updates.status === 'approved') notifyArticleApprovedInBackground(updatedArticle);

    res.json({
      message: 'News article updated successfully',
      article: updatedArticle
    });
  } catch (error) {
    console.error('Error updating news:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid category or fields' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a draft article (Reporter)
export const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration, action, scheduledAt, tags } = req.body;

    const article = await News.findById(id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.authorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own articles' });
    }

    if (!['draft', 'rejected', 'pending'].includes(article.status)) {
      return res.status(400).json({ error: 'Cannot edit an approved or scheduled article directly' });
    }

    const updates = { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration };
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
    }
    
    // Process new files if uploaded
    if (req.files && req.files.length > 0) {
      updates.mediaUrls = req.files.map(file => file.path);
      updates.imageUrl = updates.mediaUrls[0];
    }
    
    if (scheduledAt) updates.scheduledAt = new Date(scheduledAt);

    const permissions = req.user.permissions || [];
    const canAutoApprove = permissions.includes('approve_content') || permissions.includes('manage_content');

    if (action === 'draft') {
      updates.status = 'draft';
    } else if (action === 'schedule') {
      updates.status = canAutoApprove ? 'scheduled' : 'pending';
    } else if (action === 'submit') {
      updates.status = canAutoApprove ? 'approved' : 'pending';
    }

    const updatedArticle = await News.findByIdAndUpdate(id, updates, { new: true });
    if (updatedArticle?.status === 'approved') notifyArticleApprovedInBackground(updatedArticle);
    res.json({ message: 'Draft updated', article: updatedArticle });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a news article
export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedArticle = await News.findByIdAndDelete(id);

    if (!deletedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      message: 'News article deleted successfully',
      articleId: id
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Like a news article
export const likeNews = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // User added by verifyToken middleware

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const news = await News.findOne(query);
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    const likeIndex = news.likes.indexOf(userId);
    if (likeIndex === -1) {
      news.likes.push(userId); // Add like
    } else {
      news.likes.splice(likeIndex, 1); // Remove like
    }

    news.likesCount = news.likes.length; // Sync the likes count for sorting

    await news.save();
    res.json({ message: 'Like status updated', likesCount: news.likes.length });
  } catch (error) {
    console.error('Error liking news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Share a news article
export const shareNews = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const news = await News.findOneAndUpdate(
      query,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    res.json({ message: 'News shared successfully', sharesCount: news.shares });
  } catch (error) {
    console.error('Error sharing news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle save/bookmark on a news article
export const saveNews = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const news = await News.findOne(query);
    if (!news) return res.status(404).json({ error: 'News article not found' });

    const saveIndex = news.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      news.savedBy.push(userId); // Add save
      news.isPermanent = true;
    } else {
      news.savedBy.splice(saveIndex, 1); // Remove save
      if (news.savedBy.length === 0) {
        news.isPermanent = false;
      }
    }

    await news.save();
    res.json({ message: 'Save status toggled', saved: saveIndex === -1 });
  } catch (error) {
    console.error('Error saving news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a comment
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id; // User added by verifyToken middleware

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const news = await News.findOne(query);
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    const comment = await Comment.create({
      newsId: news._id,
      userId,
      content,
      parentCommentId: parentCommentId || null,
    });

    const populatedComment = await comment.populate('userId', 'fullName profilePicture');

    // Broadcast the new comment via Socket.io
    if (req.io) {
      req.io.to(id).emit('comment_added', populatedComment);
      if (news._id.toString() !== id) {
        req.io.to(news._id.toString()).emit('comment_added', populatedComment);
      }
    }

    res.status(201).json({ message: 'Comment added successfully', comment: populatedComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending news (Editor/Admin)
export const getPendingNews = async (req, res) => {
  try {
    let filter = { status: 'pending' };
    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL')) {
      filter.category = { $in: userCategories.map(c => c.toLowerCase()) };
    }
    const news = await News.find(filter).sort({ createdAt: -1 }).populate('authorId', 'fullName');
    res.json(news);
  } catch (error) {
    console.error('Error fetching pending news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get my submitted news (Reporter)
export const getMySubmittedNews = async (req, res) => {
  try {
    const news = await News.find({ authorId: req.user.id }).sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    console.error('Error fetching my submitted news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve an article
export const approveNews = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id);
    if (!news) return res.status(404).json({ error: 'News article not found' });
    
    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(news.category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to approve posts in this category.` });
    }

    if (news.scheduledAt && new Date(news.scheduledAt) > new Date()) {
      news.status = 'scheduled';
    } else {
      news.status = 'approved';
    }
    
    news.rejectionReason = '';
    await news.save();
    if (news.status === 'approved') notifyArticleApprovedInBackground(news);
    
    res.json({ message: 'Article approved', article: news });
  } catch (error) {
    console.error('Error approving news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject an article
export const rejectNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const news = await News.findById(id);
    if (!news) return res.status(404).json({ error: 'News article not found' });

    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(news.category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to reject posts in this category.` });
    }

    news.status = 'rejected';
    news.rejectionReason = reason || '';
    await news.save();

    res.json({ message: 'Article rejected', article: news });
  } catch (error) {
    console.error('Error rejecting news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get news by a specific author
export const getNewsByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;
    const { sort, limit } = req.query;
    
    const sortObj = getSortObject(sort);
    
    // We fetch approved articles written by this specific author
    let query = News.find({ authorId: authorId, status: 'approved' }).populate('authorId', 'fullName profilePicture');
    
    if (sortObj) query = query.sort(sortObj);
    if (limit) query = query.limit(parseInt(limit));
    
    const news = await query;
    res.json(news);
  } catch (error) {
    console.error('Error fetching news by author:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get related news using Universal Multi-Tier Recommendation Engine
export const getRelatedNews = async (req, res) => {
  try {
    const { articleId, tags, category, title } = req.query;
    
    let seedArticle = null;

    // Check if article already has cached relatedArticles in MongoDB
    if (articleId && mongoose.isValidObjectId(articleId)) {
      seedArticle = await News.findById(articleId).populate('relatedArticles', 'title slug subtitle summary imageUrl mainImageUrl category subCategory publishedAt createdAt');
      if (seedArticle && Array.isArray(seedArticle.relatedArticles) && seedArticle.relatedArticles.length > 0) {
        return res.json(seedArticle.relatedArticles);
      }
    }

    let queryTags = [];
    if (tags) {
      queryTags = (Array.isArray(tags) ? tags : tags.split(',')).map(t => t.trim()).filter(Boolean);
    }

    if (!seedArticle) {
      seedArticle = {
        _id: articleId,
        tags: queryTags,
        category: category || '',
        title: title || ''
      };
    }

    // Run the 3-Stage Multi-Tier Recommendation Funnel
    const relatedNews = await findRelatedNewsMultiTier(seedArticle, { limit: 3 });
    res.json(relatedNews);
  } catch (error) {
    console.error('Error fetching related news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Stream & proxy external images to bypass hotlinking protection (403 Forbidden)
export const proxyImage = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).send('Valid image URL required');
    }

    const parsed = new URL(url);
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 9000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    response.data.pipe(res);
  } catch (error) {
    res.status(404).send('Image fetch failed');
  }
};

// On-demand Deep Backstory & Historical Timeline Generation
export const generateArticleBackstory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[Backstory] generateArticleBackstory called with id:', id);
    const force = req.body?.force || req.query?.force === 'true';
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    console.log('[Backstory] query:', JSON.stringify(query));

    let news = await News.findOne(query);
    if (!news && isObjectId) {
      news = await News.findOne({ slug: id });
    }
    console.log('[Backstory] news found:', news ? news.title : 'NOT FOUND');
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    // Return cached backstory data if already generated and force flag not set
    if (news.backstoryData && news.backstoryData.narrative && !force) {
      return res.json({ success: true, backstoryData: news.backstoryData, cached: true });
    }

    const geminiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J_aFFfm9ETPBnCFSUw5OsvcIuTEw_kq6lfH1bixbvaOg';
    const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite';

    const cleanContent = (news.content || news.aiSummary || news.subtitle || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const prompt = `You are a senior investigative journalist and news historian for a prestigious global news publication.
Analyze the following news story and provide a detailed, engaging, factual historical backstory explaining how this event unfolded over time, historical precedents, and the underlying context.

Article Title: ${news.title}
Article Category: ${news.category || 'General'}
Article Text: ${cleanContent.slice(0, 4500)}

Return ONLY a valid JSON object matching this schema:
{
  "summary": "1-2 sentence high-level overview of the historical origins and context of this issue.",
  "narrative": "A detailed 2-3 paragraph backstory detailing how the past dispute or story developed, historical precedents, past clashes or key decisions, livelihoods/stakes involved, and how events unfolded leading up to this moment.",
  "keyMilestones": [
    { "phase": "Origin / Precedent", "detail": "..." },
    { "phase": "Past Escalation / Development", "detail": "..." },
    { "phase": "Turning Point / Previous Talks", "detail": "..." }
  ],
  "whyItMatters": "Why understanding this past context is crucial to today's news."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiKey}`;
    let backstoryData = null;

    try {
      const gRes = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        },
        { timeout: 25000 }
      );

      const rawText = gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          backstoryData = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) backstoryData = JSON.parse(match[0]);
        }
      }
    } catch (apiErr) {
      console.error('Gemini Backstory API Error:', apiErr.response?.data || apiErr.message);
    }

    if (!backstoryData || !backstoryData.narrative) {
      backstoryData = {
        summary: `Historical context and past reporting regarding ${news.title}.`,
        narrative: `This event reflects an ongoing trajectory of developments. Prior actions, community factors, and regulatory oversight have shaped the current situation, leading directly to the latest demands and responses reported today.\n\nKey stakeholders have engaged in previous dialogues and local administration efforts, though unresolved ambiguities have maintained the issue's prominence over time.`,
        keyMilestones: [
          { phase: "Preceding Context", detail: "Early reports and regional conditions established the groundwork for the current dispute." },
          { phase: "Ongoing Efforts", detail: "Stakeholders and regional officials held discussions seeking practical demarcations and protocols." },
          { phase: "Latest Development", detail: news.title }
        ],
        whyItMatters: "Understanding this historical timeline provides essential clarity on the persistent challenges facing the community."
      };
    }

    news.backstoryData = {
      summary: backstoryData.summary || '',
      narrative: backstoryData.narrative || '',
      keyMilestones: Array.isArray(backstoryData.keyMilestones) ? backstoryData.keyMilestones : [],
      whyItMatters: backstoryData.whyItMatters || '',
      generatedAt: new Date()
    };
    if (!news.backstory) {
      news.backstory = backstoryData.summary || '';
    }

    await News.updateOne(
      { _id: news._id },
      {
        $set: {
          backstoryData: news.backstoryData,
          backstory: news.backstory
        }
      }
    );

    return res.json({ success: true, backstoryData: news.backstoryData, cached: false });
  } catch (error) {
    console.error('Error generating article backstory:', error);
    return res.status(500).json({ error: 'Failed to generate backstory' });
  }
};

// On-demand AI Executive Briefing / Summary Generation
export const generateArticleSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.body?.force || req.query?.force === 'true';
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    let news = await News.findOne(query);
    if (!news && isObjectId) {
      news = await News.findOne({ slug: id });
    }
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    // Return cached summary if already generated and force flag not set
    if (news.aiSummary && Array.isArray(news.keyTakeaways) && news.keyTakeaways.length > 0 && !force) {
      return res.json({
        success: true,
        aiSummary: news.aiSummary,
        keyTakeaways: news.keyTakeaways,
        cached: true
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J_aFFfm9ETPBnCFSUw5OsvcIuTEw_kq6lfH1bixbvaOg';
    const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-flash-lite-latest';

    const cleanContent = (news.content || news.subtitle || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const prompt = `You are a professional senior news editor. Read the article below and produce a structured JSON executive briefing:
Title: ${news.title}
Category: ${news.category || 'General'}
Article Content: ${cleanContent.slice(0, 4000)}

Output strictly valid JSON with this format:
{
  "executiveSummary": "A concise, engaging 2-sentence executive briefing capturing the core development.",
  "keyTakeaways": [
    "Bullet 1 with key primary fact or announcement",
    "Bullet 2 with cause, context, or key reaction",
    "Bullet 3 with outcome, implications, or next steps"
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiKey}`;
    let summaryData = null;

    try {
      const gRes = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        },
        { timeout: 20000 }
      );

      const rawText = gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          summaryData = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) summaryData = JSON.parse(match[0]);
        }
      }
    } catch (apiErr) {
      console.error('Gemini Summary API Error:', apiErr.response?.data || apiErr.message);
    }

    if (!summaryData || !summaryData.executiveSummary) {
      // Fallback extraction from content
      const sentences = cleanContent.split(/(?<=[.?!])\s+/).filter(s => s.length > 20);
      summaryData = {
        executiveSummary: sentences.slice(0, 2).join(' ') || `${news.title}. Comprehensive reporting on latest developments.`,
        keyTakeaways: [
          sentences[0] || `${news.title}`,
          sentences[1] || 'Key stakeholders and regional representatives are monitoring the ongoing situation.',
          sentences[2] || 'Further administrative protocols and follow-up briefings are expected.'
        ]
      };
    }

    const aiSummary = summaryData.executiveSummary || '';
    const keyTakeaways = Array.isArray(summaryData.keyTakeaways) ? summaryData.keyTakeaways : [];

    await News.updateOne(
      { _id: news._id },
      {
        $set: {
          aiSummary,
          keyTakeaways,
          aiSummaryGenerated: true,
          aiSummaryGeneratedAt: new Date()
        }
      }
    );

    return res.json({
      success: true,
      aiSummary,
      keyTakeaways,
      cached: false
    });
  } catch (error) {
    console.error('Error generating article summary:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
};

