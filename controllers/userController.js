import News from '../models/News.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';
import User from '../models/User.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      ...user.toObject(),
      allowedCategories: req.user.allowedCategories,
      permissions: req.user.permissions || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fetch all bookmarked items for the logged-in user
export const getMyBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;

    const [articles, videos, galleries] = await Promise.all([
      News.find({ savedBy: userId }).select('title category createdAt imageUrl readTime views status'),
      VideoNews.find({ savedBy: userId }).select('title category createdAt thumbnailUrl duration views status'),
      PhotoGallery.find({ savedBy: userId }).select('title category createdAt photos status'),
    ]);

    // Format the items so the frontend can easily render them
    const formattedArticles = articles.map(item => ({
      ...item.toObject(),
      type: 'article',
      thumbnail: item.imageUrl,
    }));

    const formattedVideos = videos.map(item => ({
      ...item.toObject(),
      type: 'video',
      thumbnail: item.thumbnailUrl,
    }));

    const formattedGalleries = galleries.map(item => ({
      ...item.toObject(),
      type: 'gallery',
      thumbnail: item.photos && item.photos.length > 0 ? item.photos[0].url : null,
    }));

    // Combine and sort by createdAt descending
    const allBookmarks = [...formattedArticles, ...formattedVideos, ...formattedGalleries]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allBookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
