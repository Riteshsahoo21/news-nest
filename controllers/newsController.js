import News from '../models/News.js';
import Comment from '../models/Comment.js';

// Helper to determine sort logic
const getSortObject = (sort) => {
  if (sort === 'most_viewed') return { views: -1 };
  if (sort === 'most_liked') return { likesCount: -1 };
  return { createdAt: -1 }; // 'newest' is default
};

// Get all news
export const getAllNews = async (req, res) => {
  try {
    const { sort, q } = req.query;
    const sortObj = getSortObject(sort);
    
    let filter = {};
    if (!req.query.allStatus) {
      filter.status = 'approved';
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }
    
    const news = await News.find(filter).sort(sortObj);
    res.json(news);
  } catch (error) {
    console.error('Error fetching all news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single news by ID with comments
export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    // We increment views directly here
    const news = await News.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).populate('likes', 'fullName');
    
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    // Fetch associated comments
    const comments = await Comment.find({ newsId: id, isApproved: true })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName');

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
    const news = await News.find({ isEditorPick: true, status: 'approved' }).sort(sortObj);
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
    const news = await News.find({ isTrending: true, status: 'approved' }).sort(sortObj);
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
    const sortObj = getSortObject(req.query.sort);
    
    // category will be converted to lowercase in the DB, but just in case
    const news = await News.find({ category: category.toLowerCase(), status: 'approved' }).sort(sortObj);
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a news article
export const createNews = async (req, res) => {
  try {
    const { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration, action, scheduledAt } = req.body;
    
    // Get image URL from Cloudinary if a file was uploaded
    let imageUrl = req.body.imageUrl || '';
    if (req.file && req.file.path) {
      imageUrl = req.file.path;
    }

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
    });

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
    const { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration, action, scheduledAt } = req.body;

    const article = await News.findById(id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.authorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own articles' });
    }

    if (!['draft', 'rejected', 'pending'].includes(article.status)) {
      return res.status(400).json({ error: 'Cannot edit an approved or scheduled article directly' });
    }

    const updates = { title, content, category, author, isEditorPick, isTrending, subtitle, readTime, videoUrl, videoDuration };
    if (req.file && req.file.path) updates.imageUrl = req.file.path;
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

    const news = await News.findById(id);
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
    const news = await News.findByIdAndUpdate(
      id,
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

    const news = await News.findById(id);
    if (!news) return res.status(404).json({ error: 'News article not found' });

    const saveIndex = news.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      news.savedBy.push(userId); // Add save
    } else {
      news.savedBy.splice(saveIndex, 1); // Remove save
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
    const { content } = req.body;
    const userId = req.user.id; // User added by verifyToken middleware

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ error: 'News article not found' });
    }

    const comment = await Comment.create({
      newsId: id,
      userId,
      content,
    });

    const populatedComment = await comment.populate('userId', 'fullName');

    // Broadcast the new comment via Socket.io
    if (req.io) {
      req.io.to(id).emit('comment_added', populatedComment);
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
