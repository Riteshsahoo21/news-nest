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
    mainImageUrl: {
      type: String,
      default: '',
    },
    mediaUrls: [
      {
        type: String,
      }
    ],
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
    tags: [
      {
        type: String,
        trim: true,
      }
    ],
    // --- Advanced SEO Slug & Metadata ---
    slug: {
      type: String,
      unique: true,
      index: true,
      sparse: true
    },
    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },

    // --- Scraper, Country, Language & AI Fields ---
    country: {
      type: String,
      default: 'global',
      lowercase: true,
      index: true,
    },
    region: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      default: 'general',
      index: true,
    },
    language: {
      type: String,
      default: 'en',
      index: true,
    },
    isFeaturedOnHome: {
      type: Boolean,
      default: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      default: undefined,
    },
    sourceName: {
      type: String,
      default: '',
    },
    discoveryProvider: {
      type: String,
      default: 'curated-rss',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    isFullContentFetched: {
      type: Boolean,
      default: false,
    },
    aiSummary: {
      type: String,
      default: '',
    },
    keyTakeaways: [
      {
        type: String,
      }
    ],
    // Semantic automation fields populated by the n8n/Qdrant workflow.
    backstory: {
      type: String,
      default: '',
      trim: true,
    },
    backstoryData: {
      summary: { type: String, default: '' },
      narrative: { type: String, default: '' },
      keyMilestones: [
        {
          phase: { type: String, default: '' },
          detail: { type: String, default: '' }
        }
      ],
      whyItMatters: { type: String, default: '' },
      generatedAt: { type: Date, default: null }
    },
    relatedArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News',
      }
    ],
    isDuplicateEcho: {
      type: Boolean,
      default: false,
      index: true,
    },
    embeddingId: {
      type: String,
      default: '',
      index: true,
    },
    isPermanent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-purge external aggregator news after 7 days (604,800 seconds)
// Preserves reporter articles (authorId exists) and user-saved/permanent articles
newsSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 604800,
    partialFilterExpression: {
      authorId: null,
      isPermanent: false
    }
  }
);

newsSchema.index({ status: 1, category: 1, publishedAt: -1, createdAt: -1 });
newsSchema.index({ status: 1, country: 1, region: 1, city: 1, publishedAt: -1 });
newsSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });

newsSchema.pre('save', function() {
  if (this.isModified('title') || !this.slug) {
    this.slug = createSlug(this.title, this._id);
  }
});

const News = mongoose.model('News', newsSchema);
export default News;
