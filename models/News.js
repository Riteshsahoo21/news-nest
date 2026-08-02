import mongoose from 'mongoose';
import { createSlug } from '../utils/slugify.js';

// Categories are now managed dynamically via the Category model

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    readTime: {
      type: Number,
      default: 1, // Reading time in minutes
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoDuration: {
      type: String,
      default: '', // e.g., "02:15"
    },
    isPremiumContent: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: true,
      lowercase: true,
    },
    author: {
      type: String,
      default: 'Anonymous',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isEditorPick: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
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
    shares: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'scheduled'],
      default: 'pending',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    commentSettings: {
      type: String,
      enum: ['all', 'staff_only', 'off'],
      default: 'all',
    },
    // --- Advanced SEO Slug & Metadata ---
    slug: {
      type: String,
      unique: true,
      index: true,
      sparse: true
    },
    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

newsSchema.pre('save', function() {
  if (this.isModified('title') || !this.slug) {
    this.slug = createSlug(this.title, this._id);
  }
});

const News = mongoose.model('News', newsSchema);
export default News;


