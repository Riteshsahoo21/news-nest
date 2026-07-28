import News from '../models/News.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let daysRemaining = null;
    if (user.isPremium && user.subscriptionExpiry) {
      const expiry = new Date(user.subscriptionExpiry);
      const now = new Date(); // Secure Backend Clock
      const diffTime = expiry - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) daysRemaining = 0;
    }
    
    res.json({
      ...user.toObject(),
      allowedCategories: req.user.allowedCategories,
      permissions: req.user.permissions || [],
      daysRemaining,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
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

export const cancelPremium = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Set the flag to true so the user retains perks until the timer runs out
    user.cancelAtPeriodEnd = true;
    await user.save();
    
    res.json({ success: true, message: 'Your subscription has been cancelled. You will keep your perks until your plan expires.' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, mobileNumber, bio, location, socialLinks, profilePicture } = req.body;
    
    // Find user and update
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Update allowed fields
    if (fullName !== undefined) user.fullName = fullName;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (socialLinks !== undefined) {
      user.socialLinks = {
        ...user.socialLinks,
        ...socialLinks
      };
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        bio: user.bio,
        location: user.location,
        profilePicture: user.profilePicture,
        socialLinks: user.socialLinks,
        roles: user.roles || (user.role ? [user.role] : []),
        role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
        isPremium: user.isPremium
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
