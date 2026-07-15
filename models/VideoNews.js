import mongoose from 'mongoose';

// Categories are now managed dynamically via the Category model

const videoNewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: String, // e.g., "12:45"
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      lowercase: true,
    },
    reporter: {
      type: String,
      default: 'News Desk',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    downloads: {
      type: Number,
      default: 0,
    },
    isShort: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const VideoNews = mongoose.model('VideoNews', videoNewsSchema);
export default VideoNews;
