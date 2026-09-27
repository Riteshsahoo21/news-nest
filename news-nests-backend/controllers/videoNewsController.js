import VideoNews from '../models/VideoNews.js';
import Comment from '../models/Comment.js';
import { trackUniqueView } from '../utils/viewTracker.js';

// Helper to determine sort logic
const getSortObject = (sort) => {
  if (sort === 'most_viewed') return { views: -1 };
  if (sort === 'most_liked') return { likesCount: -1 };
  return { createdAt: -1 }; // 'newest' is default
};

import { fetchAndSaveCategoryVideos } from '../services/youtubeService.js';

// Get all videos with optional filtering
export const getAllVideos = async (req, res) => {
  try {
    const { category, isShort, isFeatured } = req.query;
    const filter = { status: 'approved' };
    
    if (category) {
      let cat = category.toLowerCase().trim();
      if (cat === 'tech') cat = 'technology';
      if (cat === 'biz') cat = 'business';
      if (cat === 'ent') cat = 'entertainment';
      if (cat === 'sci') cat = 'science';
      filter.category = cat;
    }
    if (isShort !== undefined) filter.isShort = isShort === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';

    const sortObj = getSortObject(req.query.sort);
    let videos = await VideoNews.find(filter).sort(sortObj);

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single video by ID and increment view count
export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let video = await VideoNews.findById(id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const isUnique = await trackUniqueView(req, video._id, 'VideoNews');
    if (isUnique) {
      video = await VideoNews.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      );
    }

    // Fetch associated approved comments
    const comments = await Comment.find({ videoId: id, isApproved: true })
      .populate('userId', 'fullName profilePicture')
      .sort({ createdAt: -1 });

    res.json({ video, comments });
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle like on a video
export const likeVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const video = await VideoNews.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const likeIndex = video.likes.indexOf(userId);
    if (likeIndex === -1) {
      video.likes.push(userId); // Add like
    } else {
      video.likes.splice(likeIndex, 1); // Remove like
    }

    video.likesCount = video.likes.length; // Sync the likes count for sorting

    await video.save();
    res.json({ message: 'Like status toggled', likesCount: video.likes.length });
  } catch (error) {
    console.error('Error liking video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle save/bookmark on a video
export const saveVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const video = await VideoNews.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const saveIndex = video.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      video.savedBy.push(userId); // Add save
    } else {
      video.savedBy.splice(saveIndex, 1); // Remove save
    }

    await video.save();
    res.json({ message: 'Save status toggled', saved: saveIndex === -1 });
  } catch (error) {
    console.error('Error saving video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Increment download counter
export const incrementDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await VideoNews.findByIdAndUpdate(
      id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Download counted', downloads: video.downloads });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a comment to a video
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const video = await VideoNews.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const newComment = await Comment.create({
      videoId: id,
      userId,
      content,
      parentCommentId: parentCommentId || null,
    });

    // Populate user details so the frontend can display the user's name immediately without refreshing
    await newComment.populate('userId', 'fullName profilePicture');

    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get my submitted videos (Reporter)
export const getMySubmittedVideos = async (req, res) => {
  try {
    const videos = await VideoNews.find({ authorId: req.user.id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching my submitted videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new video (Admin & Reporters)
export const createVideo = async (req, res) => {
  try {
    let thumbnailUrl = req.body.thumbnailUrl || '';
    let videoUrl = req.body.videoUrl || '';

    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail[0] && req.files.thumbnail[0].path) {
        thumbnailUrl = req.files.thumbnail[0].path;
      }
      if (req.files.video && req.files.video[0] && req.files.video[0].path) {
        videoUrl = req.files.video[0].path;
      }
    } else if (req.file && req.file.path) {
      thumbnailUrl = req.file.path;
    }

    if (!videoUrl) {
      return res.status(400).json({ error: 'Please provide either a valid Video URL or upload a local video file from your device.' });
    }

    const permissions = req.user?.permissions || [];
    const canAutoApprove = permissions.includes('approve_content') || permissions.includes('manage_content');

    const videoData = {
      ...req.body,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(t => t.trim())) : [],
      videoUrl,
      thumbnailUrl,
      authorId: req.user?.id || req.body.authorId,
      reporter: req.user?.fullName || req.body.reporter || 'News Desk',
      status: canAutoApprove ? 'approved' : 'pending'
    };
    const video = await VideoNews.create(videoData);
    res.status(201).json({ message: 'Video created successfully', video });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Update video details (Admin only)
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
      updates.tags = updates.tags ? updates.tags.split(',').map(t => t.trim()) : [];
    }
    const updatedVideo = await VideoNews.findByIdAndUpdate(id, updates, { new: true });
    
    if (!updatedVideo) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video updated successfully', video: updatedVideo });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a video (Admin only)
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVideo = await VideoNews.findByIdAndDelete(id);
    
    if (!deletedVideo) return res.status(404).json({ error: 'Video not found' });
    
    // Optionally delete associated comments here
    await Comment.deleteMany({ videoId: id });

    res.json({ message: 'Video deleted successfully', videoId: id });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Editorial Workflow Endpoints ---

export const getPendingVideos = async (req, res) => {
  try {
    const videos = await VideoNews.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('authorId', 'fullName email');
    res.json(videos);
  } catch (error) {
    console.error('Error fetching pending videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await VideoNews.findByIdAndUpdate(
      id,
      { status: 'approved', rejectionReason: '' },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video approved successfully', video });
  } catch (error) {
    console.error('Error approving video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const video = await VideoNews.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video rejected successfully', video });
  } catch (error) {
    console.error('Error rejecting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get related video news
export const getRelatedVideos = async (req, res) => {
  try {
    const { videoId, tags, category } = req.query;
    
    let queryTags = [];
    if (tags) {
      queryTags = (Array.isArray(tags) ? tags : tags.split(',')).map(t => t.trim()).filter(Boolean);
    }

    // Build the query to find related videos
    let filter = { status: 'approved' };
    
    // Exclude the current video if provided
    if (videoId) {
      filter._id = { $ne: videoId };
    }

    // Match by tags (highest priority) or category
    if (queryTags.length > 0) {
      filter.tags = { $in: queryTags };
    } else if (category) {
      filter.category = category.toLowerCase();
    }

    // Fetch related videos
    let relatedVideos = await VideoNews.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title slug thumbnailUrl duration createdAt');
      
    // Format response to match typical related structure
    relatedVideos = relatedVideos.map(v => ({
      _id: v._id,
      title: v.title,
      slug: v.slug,
      imageUrl: v.thumbnailUrl,
      duration: v.duration,
      createdAt: v.createdAt
    }));
    
    // If not enough related videos by tags, fallback to category
    if (relatedVideos.length < 3 && category && queryTags.length > 0) {
      const excludeIds = relatedVideos.map(n => n._id);
      if (videoId) excludeIds.push(videoId);
      
      const moreVideos = await VideoNews.find({
        _id: { $nin: excludeIds },
        status: 'approved',
        category: category.toLowerCase()
      }).sort({ createdAt: -1 }).limit(3 - relatedVideos.length).select('title slug thumbnailUrl duration createdAt');
      
      const mappedMore = moreVideos.map(v => ({
        _id: v._id,
        title: v.title,
        slug: v.slug,
        imageUrl: v.thumbnailUrl,
        duration: v.duration,
        createdAt: v.createdAt
      }));
      
      relatedVideos = [...relatedVideos, ...mappedMore];
    }
    
    res.json(relatedVideos);
  } catch (error) {
    console.error('Error fetching related video news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
