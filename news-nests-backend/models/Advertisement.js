import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String
    },
    videoUrl: {
      type: String
    },
    linkUrl: {
      type: String,
      required: true
    },
    position: {
      type: String,
      enum: ['leaderboard', 'sidebar', 'in_article', 'in_feed', 'interstitial', 'sticky_footer', 'everywhere', 'video_interstitial'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    viewedByIPs: {
      type: [String],
      default: []
    },
    clickedByIPs: {
      type: [String],
      default: []
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

const Advertisement = mongoose.model('Advertisement', advertisementSchema);
export default Advertisement;
