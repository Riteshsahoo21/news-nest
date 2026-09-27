import News from '../models/News.js';
import VideoNews from '../models/VideoNews.js';
import PhotoGallery from '../models/PhotoGallery.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      ...user.toObject(),
      allowedCategories: req.user.allowedCategories,
      permissions: req.user.permissions || [],
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
    const { fullName, username, mobileNumber, bio, location, socialLinks, profilePicture } = req.body;
    
    // Find user and update
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Handle Username Change
    if (username !== undefined) {
      const sanitizedUsername = username.replace(/\s+/g, '').toLowerCase();
      if (sanitizedUsername && sanitizedUsername !== (user.username || '').toLowerCase()) {
        // Check if taken
        const existingUser = await User.findOne({ username: sanitizedUsername });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
          return res.status(400).json({ error: 'Username is already taken' });
        }

        const userRoles = user.roles || (user.role ? [user.role] : []);
        const isAdmin = userRoles.includes('admin');

        // Check 14 days rule ONLY if user has already customized their username once
        if (!isAdmin && user.hasCustomizedUsername && user.lastUsernameChange) {
          const daysSinceChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < 14) {
            const daysLeft = Math.ceil(14 - daysSinceChange);
            return res.status(400).json({ error: `You can only change your username once every 14 days. Try again in ${daysLeft} day(s).` });
          }
        }

        user.username = sanitizedUsername;
        if (!isAdmin) {
          user.hasCustomizedUsername = true;
          user.lastUsernameChange = Date.now();
        }
      }
    }

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
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        bio: user.bio,
        location: user.location,
        profilePicture: user.profilePicture,
        socialLinks: user.socialLinks,
        roles: user.roles || (user.role ? [user.role] : []),
        role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { username: req.params.id };

    const user = await User.findOne(query)
      .populate('followers', 'fullName profilePicture')
      .populate('following', 'fullName profilePicture');
      
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Only return safe public information
    res.json({
      _id: user._id,
      fullName: user.fullName || (user.email ? user.email.split('@')[0] : 'User'),
      username: user.username,
      bio: user.bio,
      location: user.location,
      profilePicture: user.profilePicture,
      socialLinks: user.socialLinks,
      roles: user.roles || (user.role ? [user.role] : []),
      role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
      createdAt: user.createdAt || user._id.getTimestamp(),
      followersCount: user.followers ? user.followers.length : 0,
      followingCount: user.following ? user.following.length : 0,
      followers: user.followers || [], 
      following: user.following || []
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleFollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
