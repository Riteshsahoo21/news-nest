import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';

// Helper to determine sort logic
const getSortObject = (sort) => {
  if (sort === 'most_viewed') return { views: -1 };
  if (sort === 'most_liked') return { likesCount: -1 };
  return { createdAt: -1 }; // 'newest' is default
};

// Global search across all content collections
export const globalSearch = async (req, res) => {
  try {
    const { q, sort } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }

    // Case-insensitive regex
    const regex = new RegExp(q, 'i');

    const sortObj = getSortObject(sort);

    // Run queries concurrently for performance
    const [news, liveBlogs, videos, photoGalleries] = await Promise.all([
      // News: Match title or content, MUST be approved
      News.find({
        status: 'approved',
        $or: [
          { title: { $regex: regex } },
          { content: { $regex: regex } }
        ]
      })
      .select('-content') // Optionally exclude full content to reduce payload size
      .sort(sortObj)
      .limit(20), // Limit to top 20 matches per category for performance

      // LiveBlogs: Match title or description
      LiveBlog.find({
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } }
        ]
      })
      .sort(sortObj)
      .limit(10),

      // VideoNews: Match title or description
      VideoNews.find({
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } }
        ]
      })
      .sort(sortObj)
      .limit(10),

      // PhotoGallery: Match title or description
      PhotoGallery.find({
        status: 'approved',
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } }
        ]
      })
      .sort(sortObj)
      .limit(10)
    ]);

    // Group the results
    res.json({
      query: q,
      results: {
        news,
        liveBlogs,
        videos,
        photoGalleries
      },
      totalMatches: news.length + liveBlogs.length + videos.length + photoGalleries.length
    });

  } catch (error) {
    console.error('Error during global search:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
};
