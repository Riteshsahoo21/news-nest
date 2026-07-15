import VideoNews from '../models/VideoNews.js';
import Comment from '../models/Comment.js';

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
    const filter = {};
    
    if (category) filter.category = category.toLowerCase();
    if (isShort !== undefined) filter.isShort = isShort === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';

    const sortObj = getSortObject(req.query.sort);
    let videos = await VideoNews.find(filter).sort(sortObj);
    
    // If it's a specific category and we have very few videos, try to fetch more
    if (category && category.toLowerCase() !== 'latest' && category.toLowerCase() !== 'trending') {
       if (videos.length < 5 && !isShort && !isFeatured) {
          await fetchAndSaveCategoryVideos(category);
          // Re-query after fetch
          videos = await VideoNews.find(filter).sort(sortObj);
       }
    }

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
    
    // Increment view count when fetching single video
    const video = await VideoNews.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Fetch associated approved comments
    const comments = await Comment.find({ videoId: id, isApproved: true })
      .populate('userId', 'name profilePicture')
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
    const { content } = req.body;
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
    });

    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new video (Admin only)
export const createVideo = async (req, res) => {
  try {
    const video = await VideoNews.create(req.body);
    res.status(201).json({ message: 'Video created successfully', video });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update video details (Admin only)
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVideo = await VideoNews.findByIdAndUpdate(id, req.body, { new: true });
    
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
