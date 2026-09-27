import Advertisement from '../models/Advertisement.js';
import { trackUniqueView } from '../utils/viewTracker.js';

// ADMIN ENDPOINTS

// Create a new Ad
export const createAd = async (req, res) => {
  try {
    const newAd = new Advertisement({
      ...req.body,
      createdBy: req.user.id
    });
    await newAd.save();
    res.status(201).json(newAd);
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
};

// Get all Ads (for Admin dashboard)
export const getAdminAds = async (req, res) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
};

// Update an Ad
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAd = await Advertisement.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
};

// Delete an Ad
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAd = await Advertisement.findByIdAndDelete(id);
    if (!deletedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
};

// PUBLIC ENDPOINTS

// Get a random active ad for a specific position
export const getRandomAd = async (req, res) => {
  try {
    const { position } = req.query;
    if (!position) {
      return res.status(400).json({ error: 'Position query parameter is required' });
    }

    let query = { isActive: true };
    if (position === 'video_interstitial') {
      // Allow explicitly positioned ads OR any active ad that has a valid videoUrl
      query.$or = [
        { position: { $in: [position, 'everywhere'] } },
        { videoUrl: { $exists: true, $nin: [null, ''] } }
      ];
    } else {
      query.position = { $in: [position, 'everywhere'] };
    }

    const ads = await Advertisement.find(query);
    
    if (ads.length === 0) {
      return res.json(null);
    }

    // Find the minimum view count among the active ads
    const minViews = Math.min(...ads.map(ad => ad.views || 0));
    
    // Filter the ads to only those that have the minimum views
    const lowestViewAds = ads.filter(ad => (ad.views || 0) === minViews);

    // Pick a random ad from those with the minimum views to shuffle them equally
    const randomAd = lowestViewAds[Math.floor(Math.random() * lowestViewAds.length)];
    res.json(randomAd);
  } catch (error) {
    console.error('Error fetching random ad:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
};

// Increment view count (Unique via ViewTracker)
export const trackView = async (req, res) => {
  try {
    const { id } = req.params;
    
    const isUnique = await trackUniqueView(req, id, 'Advertisement');
    if (isUnique) {
      await Advertisement.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }
    
    res.json({ success: true, unique: isUnique });
  } catch (error) {
    // Fail silently for tracking routes
    res.status(500).json({ error: 'Failed to track view' });
  }
};

// Increment click count (Unique by IP)
export const trackClick = async (req, res) => {
  try {
    const { id } = req.params;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await Advertisement.findOneAndUpdate(
      { _id: id, clickedByIPs: { $ne: clientIp } },
      { 
        $inc: { clicks: 1 },
        $push: { clickedByIPs: clientIp }
      }
    );
    res.json({ success: true });
  } catch (error) {
    // Fail silently for tracking routes
    res.status(500).json({ error: 'Failed to track click' });
  }
};
