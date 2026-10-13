import LiveBlog from '../models/LiveBlog.js';
import User from '../models/User.js';
import News from '../models/News.js';
import indexingService from '../services/indexingService.js';

// Helper to check if user has permission to manage live blogs
const canManageLiveBlog = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId);
  if (!user || !user.isActive) return false;
  const roles = user.roles || [user.role || ''];
  if (roles.includes('admin') || roles.includes('editor')) return true;
  if (roles.includes('reporter') && user.canManageLiveBlogs === true) return true;
  return false;
};

import { isMatchOrStreamEnded, pruneConcludedLiveBlogs } from '../services/liveBlogAutomationService.js';

// Get all live blogs (by default only active live blogs, or filtered by status)
export const getAllLiveBlogs = async (req, res) => {
  try {
    const { status, category } = req.query;
    let query = {};

    if (status === 'ended') {
      query.isLive = false;
    } else if (status === 'all') {
      // Return both active and concluded
    } else {
      // Default: ONLY active live blogs and active streams
      query.isLive = true;
    }

    if (category && category.toLowerCase() !== 'all') {
      query.category = category.toLowerCase();
    }

    const liveBlogs = await LiveBlog.find(query).sort({ updatedAt: -1, createdAt: -1 });

    // Defensive check: If serving live blogs (not status=all/ended), filter out any blog that has concluded
    // and asynchronously update isLive: false in database so it no longer appears in live stream
    if (status !== 'all' && status !== 'ended') {
      const activeOnly = [];
      for (const blog of liveBlogs) {
        if (isMatchOrStreamEnded(blog)) {
          // Concluded match or ended stream -> mark false in DB
          LiveBlog.updateOne({ _id: blog._id }, { $set: { isLive: false } })
            .then(() => pruneConcludedLiveBlogs(5))
            .catch(() => {});
        } else {
          activeOnly.push(blog);
        }
      }
      return res.json(activeOnly);
    }

    // If status === 'all', return all active blogs + strictly at most 5 latest concluded archives
    if (status === 'all') {
      const active = [];
      const concluded = [];
      for (const blog of liveBlogs) {
        if (blog.isLive && !isMatchOrStreamEnded(blog)) {
          active.push(blog);
        } else {
          concluded.push(blog);
        }
      }
      // Strictly keep at most 5 concluded blogs
      const limitedConcluded = concluded.slice(0, 5);
      if (concluded.length > 5) {
        pruneConcludedLiveBlogs(5).catch(() => {});
      }
      return res.json([...active, ...limitedConcluded]);
    }

    // If status === 'ended', return strictly at most 5 latest concluded blogs
    if (status === 'ended') {
      const limited = liveBlogs.slice(0, 5);
      if (liveBlogs.length > 5) {
        pruneConcludedLiveBlogs(5).catch(() => {});
      }
      return res.json(limited);
    }

    res.json(liveBlogs);
  } catch (error) {
    console.error('Error fetching live blogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single live blog by ID or semantic slug and dynamically enrich related news if empty
export const getLiveBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const liveBlog = isObjectId 
      ? await LiveBlog.findById(id) 
      : await LiveBlog.findOne({ slug: id });
    
    if (!liveBlog) {
      return res.status(404).json({ error: 'Live blog not found' });
    }

    // Sort timeline updates newest first for UI convenience
    const blogDoc = liveBlog.toObject();
    if (blogDoc.updates) {
      blogDoc.updates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (blogDoc.comments) {
      blogDoc.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Dynamically fetch related news if none exist
    if (!blogDoc.relatedNews || blogDoc.relatedNews.length === 0) {
      try {
        const matchingNews = await News.find({ 
          $or: [
            { category: new RegExp(liveBlog.category, 'i') },
            { title: new RegExp(liveBlog.category, 'i') }
          ],
          isArchived: { $ne: true } 
        }).limit(4);
        
        if (matchingNews.length > 0) {
          blogDoc.relatedNews = matchingNews.map(n => ({
            title: n.title,
            url: `/article/${n.slug || n._id}`
          }));
        } else {
          // Fallback to recent articles
          const recentNews = await News.find({ isArchived: { $ne: true } }).sort({ publishedDate: -1 }).limit(3);
          blogDoc.relatedNews = recentNews.map(n => ({
            title: n.title,
            url: `/article/${n.slug || n._id}`
          }));
        }
      } catch (err) {
        console.error('Error auto-populating related news:', err);
      }
    }
    
    res.json(blogDoc);
  } catch (error) {
    console.error('Error fetching live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new live blog (Requires admin, editor, or authorized reporter)
export const createLiveBlog = async (req, res) => {
  try {
    const hasPermission = await canManageLiveBlog(req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied: You do not have Live Blog management permissions. Contact an admin.' });
    }

    const { title, description, category, author, mainImageUrl, matchStatus, poll, mediaGallery, streamType, streamUrl, isStreamActive, tags } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Please provide title, description, and category' });
    }

    const creator = await User.findById(req.user.id);
    const authorName = author || creator?.fullName || 'News Nests Reporter';

    const liveBlog = await LiveBlog.create({
      title,
      description,
      category,
      author: authorName,
      authorId: req.user.id,
      mainImageUrl: mainImageUrl || '',
      streamType: streamType || 'none',
      streamUrl: streamUrl || '',
      isStreamActive: isStreamActive === true,
      matchStatus: matchStatus || { team1: { name: '', score: '' }, team2: { name: '', score: '' }, matchInfo: '', customStats: [] },
      poll: poll || { question: '', options: [] },
      mediaGallery: mediaGallery || (mainImageUrl ? [mainImageUrl] : []),
      updates: [],
      comments: []
    });

    // Trigger instant search engine indexing push in the background
    indexingService.submitUrl(`/live-blogs?id=${liveBlog.slug || liveBlog._id}`);

    res.status(201).json({
      message: 'Live blog event created successfully',
      liveBlog
    });
  } catch (error) {
    console.error('Error creating live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update existing live blog (Score updates, closing event, editing title/poll)
export const updateLiveBlog = async (req, res) => {
  try {
    const hasPermission = await canManageLiveBlog(req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to modify live blogs.' });
    }

    const { id } = req.params;
    const { title, description, category, isLive, mainImageUrl, matchStatus, poll, streamType, streamUrl, isStreamActive, tags } = req.body;

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) {
      return res.status(404).json({ error: 'Live blog not found' });
    }

    if (title !== undefined) liveBlog.title = title;
    if (description !== undefined) liveBlog.description = description;
    if (category !== undefined) liveBlog.category = category;
    if (isLive !== undefined) liveBlog.isLive = isLive;
    if (streamType !== undefined) liveBlog.streamType = streamType;
    if (streamUrl !== undefined) liveBlog.streamUrl = streamUrl;
    if (isStreamActive !== undefined) liveBlog.isStreamActive = isStreamActive;
    if (tags !== undefined) {
      liveBlog.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
    }
    if (mainImageUrl !== undefined) {
      liveBlog.mainImageUrl = mainImageUrl;
      if (mainImageUrl && !liveBlog.mediaGallery.includes(mainImageUrl)) {
        liveBlog.mediaGallery.push(mainImageUrl);
      }
    }
    if (matchStatus !== undefined) liveBlog.matchStatus = matchStatus;
    if (poll !== undefined) {
      // Preserve existing vote counts if options match, or just update question/options
      liveBlog.poll = { ...liveBlog.poll, ...poll };
    }

    await liveBlog.save();
    res.json({ message: 'Live blog updated successfully', liveBlog });
  } catch (error) {
    console.error('Error updating live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a minute-by-minute update to a live blog
export const addUpdateToLiveBlog = async (req, res) => {
  try {
    const hasPermission = await canManageLiveBlog(req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to broadcast live updates.' });
    }

    const { id } = req.params;
    const { title, content, imageUrl, videoUrl } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Please provide update content' });
    }

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) {
      return res.status(404).json({ error: 'Live blog not found' });
    }

    const newUpdate = {
      title: title || '',
      content,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || ''
    };

    liveBlog.updates.push(newUpdate);
    
    // Auto-index imageUrl into mediaGallery for the grid view
    if (imageUrl && !liveBlog.mediaGallery.includes(imageUrl)) {
      liveBlog.mediaGallery.push(imageUrl);
    }
    
    // Ensure parent document updatedAt timestamp refreshes for 5s polling clients
    liveBlog.updatedAt = new Date();
    await liveBlog.save();

    res.status(201).json({
      message: 'Timeline update broadcasted successfully',
      liveBlog
    });
  } catch (error) {
    console.error('Error adding update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vote on Live Blog Poll
export const voteLiveBlogPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

    if (optionIndex === undefined || optionIndex < 0) {
      return res.status(400).json({ error: 'Invalid poll option selected' });
    }

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog || !liveBlog.poll || !liveBlog.poll.options) {
      return res.status(404).json({ error: 'Live blog poll not found' });
    }

    if (optionIndex >= liveBlog.poll.options.length) {
      return res.status(400).json({ error: 'Option index out of range' });
    }

    // Initialize votedUsers array if undefined
    if (!liveBlog.poll.votedUsers) {
      liveBlog.poll.votedUsers = [];
    }

    // Check if user already voted
    const existingVoteIdx = liveBlog.poll.votedUsers.findIndex(u => u.user && u.user.toString() === userId);
    if (existingVoteIdx !== -1) {
      const prevOptIdx = liveBlog.poll.votedUsers[existingVoteIdx].optionIndex;
      if (prevOptIdx === optionIndex) {
        return res.json({ message: 'Vote already recorded', poll: liveBlog.poll });
      }
      // Decrement old option
      if (liveBlog.poll.options[prevOptIdx]) {
        liveBlog.poll.options[prevOptIdx].votes = Math.max(0, (liveBlog.poll.options[prevOptIdx].votes || 1) - 1);
      }
      // Update record to new option
      liveBlog.poll.votedUsers[existingVoteIdx].optionIndex = optionIndex;
    } else {
      liveBlog.poll.votedUsers.push({ user: userId, optionIndex });
    }

    // Increment new option
    liveBlog.poll.options[optionIndex].votes = (liveBlog.poll.options[optionIndex].votes || 0) + 1;

    await liveBlog.save();
    res.json({ message: 'Vote recorded successfully', poll: liveBlog.poll });
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add comment to live blog
export const addCommentToLiveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) return res.status(404).json({ error: 'Live blog not found' });

    const newComment = {
      user: userId,
      userName: user.fullName || user.username || 'News Reader',
      userAvatar: user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'User')}`,
      text: text.trim(),
      likes: 0,
      likedBy: []
    };

    if (!liveBlog.comments) liveBlog.comments = [];
    liveBlog.comments.unshift(newComment);
    await liveBlog.save();

    res.status(201).json({ message: 'Comment added successfully', comments: liveBlog.comments });
  } catch (error) {
    console.error('Error adding live comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete comment from live blog (Author, Event Creator, Editor, Admin)
export const deleteCommentFromLiveBlog = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) return res.status(404).json({ error: 'Live blog not found' });

    const commentIdx = (liveBlog.comments || []).findIndex(c => c._id.toString() === commentId);
    if (commentIdx === -1) return res.status(404).json({ error: 'Comment not found' });

    const comment = liveBlog.comments[commentIdx];
    const user = await User.findById(userId);
    const userRoles = user?.roles || [user?.role || ''];
    const isAdminOrEditor = userRoles.some(r => ['admin', 'editor'].includes(r));
    const isCommentAuthor = comment.user && comment.user.toString() === userId;
    const isEventCreator = liveBlog.authorId && liveBlog.authorId.toString() === userId;

    if (!isAdminOrEditor && !isCommentAuthor && !isEventCreator) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own comments.' });
    }

    liveBlog.comments.splice(commentIdx, 1);
    await liveBlog.save();

    res.json({ message: 'Comment removed successfully', comments: liveBlog.comments });
  } catch (error) {
    console.error('Error deleting live comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle save/bookmark on a live blog
export const saveLiveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) return res.status(404).json({ error: 'Live blog not found' });

    const saveIndex = liveBlog.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      liveBlog.savedBy.push(userId);
    } else {
      liveBlog.savedBy.splice(saveIndex, 1);
    }

    await liveBlog.save();
    res.json({ message: 'Save status toggled', saved: saveIndex === -1 });
  } catch (error) {
    console.error('Error saving live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
