import crypto from 'crypto';
import ViewTracker from '../models/ViewTracker.js';

/**
 * Tracks a unique view for a specific content item.
 * Uses IP Address + User-Agent to generate a unique hash for anonymous users,
 * or the User ID for authenticated users.
 * 
 * @param {Object} req - The Express request object
 * @param {ObjectId} contentId - The ID of the content being viewed
 * @param {String} contentType - The type of content ('News', 'VideoNews', 'Advertisement', etc.)
 * @returns {Boolean} - Returns true if this is a NEW unique view, false if it's a duplicate
 */
export const trackUniqueView = async (req, contentId, contentType) => {
  try {
    if (!contentId || !contentType) return false;

    let identifier = '';

    // If user is authenticated, use their unique ID
    if (req.user && req.user.userId) {
      identifier = `user_${req.user.userId}`;
    } else {
      // For anonymous users, hash their IP + User-Agent
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      const hash = crypto.createHash('sha256');
      hash.update(`${ip}-${userAgent}`);
      identifier = `anon_${hash.digest('hex')}`;
    }

    // Try to create the ViewTracker record
    // If it violates the unique compound index (contentId + viewerIdentifier), it will throw an error (duplicate)
    await ViewTracker.create({
      contentId,
      contentType,
      viewerIdentifier: identifier,
    });

    return true; // Successfully created -> It's a new unique view
  } catch (error) {
    // Error code 11000 is MongoDB's Duplicate Key error
    if (error.code === 11000) {
      return false; // Duplicate view, ignore
    }
    console.error('Error tracking unique view:', error);
    return false;
  }
};
