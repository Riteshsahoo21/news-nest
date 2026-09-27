import PhotoGallery from '../models/PhotoGallery.js';
import Comment from '../models/Comment.js';

// Get all APPROVED photo galleries, optionally filtered by category
export const getAllGalleries = async (req, res) => {
  try {
    const { category } = req.query;
    // Default to only approved galleries unless the route bypasses this
    const filter = {};
    if (!req.query.allStatus) {
      filter.status = 'approved';
    }
    if (category) filter.category = category.toLowerCase();
    
    const galleries = await PhotoGallery.find(filter).sort({ createdAt: -1 });
    res.json(galleries);
  } catch (error) {
    console.error('Error fetching photo galleries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single photo gallery by ID
export const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await PhotoGallery.findById(id);
    
    if (!gallery) {
      return res.status(404).json({ error: 'Photo gallery not found' });
    }

    const comments = await Comment.find({ galleryId: id, isApproved: true })
      .populate('userId', 'fullName profilePicture')
      .sort({ createdAt: -1 });

    res.json({ gallery, comments });
  } catch (error) {
    console.error('Error fetching photo gallery by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new photo gallery (Admin/Editor/Reporter)
export const createGallery = async (req, res) => {
  try {
    const { title, description, category, photographer, relatedNews, tags } = req.body;

    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(file => ({ url: file.path }));
    }

    if (!title || !description || !category || photos.length === 0) {
      return res.status(400).json({ error: 'Please provide title, description, category, and at least one uploaded photo' });
    }

    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to post in the '${category}' category.` });
    }

    const permissions = req.user.permissions || [];
    const canAutoApprove = permissions.includes('approve_content') || permissions.includes('manage_content');

    const gallery = await PhotoGallery.create({
      title,
      description,
      category,
      photographer,
      photos,
      relatedNews,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      authorId: req.user ? req.user.id : null,
      status: canAutoApprove ? 'approved' : 'pending' // auto-approve if they have content management permissions
    });

    res.status(201).json({
      message: canAutoApprove ? 'Photo gallery created successfully' : 'Photo gallery submitted for review',
      gallery
    });
  } catch (error) {
    console.error('Error creating photo gallery:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending galleries (Editor/Admin)
export const getPendingGalleries = async (req, res) => {
  try {
    let filter = { status: 'pending' };
    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL')) {
      filter.category = { $in: userCategories.map(c => c.toLowerCase()) };
    }
    const pendingGalleries = await PhotoGallery.find(filter)
      .sort({ createdAt: -1 })
      .populate('authorId', 'fullName email');
    res.json(pendingGalleries);
  } catch (error) {
    console.error('Error fetching pending galleries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get submissions by a specific reporter
export const getMySubmittedGalleries = async (req, res) => {
  try {
    const myGalleries = await PhotoGallery.find({ authorId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(myGalleries);
  } catch (error) {
    console.error('Error fetching reporter galleries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a gallery
export const approveGallery = async (req, res) => {
  try {
    const gallery = await PhotoGallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(gallery.category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to approve posts in this category.` });
    }

    gallery.status = 'approved';
    gallery.rejectionReason = '';
    await gallery.save();

    res.json(gallery);
  } catch (error) {
    console.error('Error approving gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a gallery
export const rejectGallery = async (req, res) => {
  try {
    const { reason } = req.body;
    const gallery = await PhotoGallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    const userCategories = req.user.allowedCategories || [];
    if (!userCategories.includes('ALL') && !userCategories.includes(gallery.category.toLowerCase())) {
      return res.status(403).json({ error: `You are not authorized to reject posts in this category.` });
    }

    gallery.status = 'rejected';
    gallery.rejectionReason = reason || 'Rejected by editor';
    await gallery.save();

    res.json(gallery);
  } catch (error) {
    console.error('Error fetching gallery stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get related photo galleries
export const getRelatedGalleries = async (req, res) => {
  try {
    const { galleryId, tags, category } = req.query;
    
    let queryTags = [];
    if (tags) {
      queryTags = (Array.isArray(tags) ? tags : tags.split(',')).map(t => t.trim()).filter(Boolean);
    }

    // Build the query to find related galleries
    let filter = { status: 'approved' };
    
    // Exclude the current gallery if provided
    if (galleryId) {
      filter._id = { $ne: galleryId };
    }

    // Match by tags (highest priority) or category
    if (queryTags.length > 0) {
      filter.tags = { $in: queryTags };
    } else if (category) {
      filter.category = category.toLowerCase();
    }

    // Fetch related galleries
    let relatedGalleries = await PhotoGallery.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title slug coverImage photos createdAt');
    
    // Map to normalized structure (assuming coverImage or first photo is needed)
    relatedGalleries = relatedGalleries.map(g => ({
      _id: g._id,
      title: g.title,
      slug: g.slug,
      imageUrl: g.coverImage || (g.photos && g.photos.length > 0 ? g.photos[0].url : ''),
      createdAt: g.createdAt
    }));
    
    // If not enough related galleries by tags, fallback to category
    if (relatedGalleries.length < 3 && category && queryTags.length > 0) {
      const excludeIds = relatedGalleries.map(n => n._id);
      if (galleryId) excludeIds.push(galleryId);
      
      const moreGalleries = await PhotoGallery.find({
        _id: { $nin: excludeIds },
        status: 'approved',
        category: category.toLowerCase()
      }).sort({ createdAt: -1 }).limit(3 - relatedGalleries.length).select('title slug coverImage photos createdAt');
      
      const mappedMore = moreGalleries.map(g => ({
        _id: g._id,
        title: g.title,
        slug: g.slug,
        imageUrl: g.coverImage || (g.photos && g.photos.length > 0 ? g.photos[0].url : ''),
        createdAt: g.createdAt
      }));
      
      relatedGalleries = [...relatedGalleries, ...mappedMore];
    }
    
    res.json(relatedGalleries);
  } catch (error) {
    console.error('Error fetching related photo galleries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Update a photo gallery (Admin only)
export const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
      updates.tags = updates.tags ? updates.tags.split(',').map(t => t.trim()) : [];
    }
    
    const updatedGallery = await PhotoGallery.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!updatedGallery) {
      return res.status(404).json({ error: 'Photo gallery not found' });
    }

    res.json({
      message: 'Photo gallery updated successfully',
      gallery: updatedGallery
    });
  } catch (error) {
    console.error('Error updating photo gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a photo gallery (Admin only)
export const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedGallery = await PhotoGallery.findByIdAndDelete(id);

    if (!deletedGallery) {
      return res.status(404).json({ error: 'Photo gallery not found' });
    }

    res.json({
      message: 'Photo gallery deleted successfully',
      galleryId: id
    });
  } catch (error) {
    console.error('Error deleting photo gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle save/bookmark on a photo gallery
export const savePhotoGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const gallery = await PhotoGallery.findById(id);
    if (!gallery) return res.status(404).json({ error: 'Photo gallery not found' });

    const saveIndex = gallery.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      gallery.savedBy.push(userId); // Add save
    } else {
      gallery.savedBy.splice(saveIndex, 1); // Remove save
    }

    await gallery.save();
    res.json({ message: 'Save status toggled', saved: saveIndex === -1 });
  } catch (error) {
    console.error('Error saving photo gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Like a photo gallery
export const likeGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const gallery = await PhotoGallery.findById(id);
    if (!gallery) return res.status(404).json({ error: 'Photo gallery not found' });

    const likeIndex = gallery.likes.indexOf(userId);
    if (likeIndex === -1) {
      gallery.likes.push(userId); // Add like
    } else {
      gallery.likes.splice(likeIndex, 1); // Remove like
    }

    gallery.likesCount = gallery.likes.length;
    await gallery.save();

    res.json({ message: 'Gallery liked', likesCount: gallery.likesCount });
  } catch (error) {
    console.error('Error liking photo gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a comment to a photo gallery
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await Comment.create({
      galleryId: id,
      userId,
      content,
      parentCommentId: parentCommentId || null,
    });

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'fullName profilePicture');

    // Broadcast the new comment via Socket.io
    if (req.io) {
      req.io.to(id.toString()).emit('comment_added', populatedComment);
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
