import mongoose from 'mongoose';

const viewTrackerSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['News', 'VideoNews', 'PhotoGallery', 'LiveBlog', 'Advertisement'],
    },
    viewerIdentifier: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL index (86400 seconds)
    }
  }
);

// Compound index for fast uniqueness checking
viewTrackerSchema.index({ contentId: 1, viewerIdentifier: 1 }, { unique: true });

const ViewTracker = mongoose.model('ViewTracker', viewTrackerSchema);
export default ViewTracker;
