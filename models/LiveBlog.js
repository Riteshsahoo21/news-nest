import mongoose from 'mongoose';
import { createSlug } from '../utils/slugify.js';

const updateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '', // e.g., "CRICKET UPDATE"
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '', // For updates that include a video
    },
  },
  { timestamps: true } // This will auto-generate createdAt and updatedAt for each update
);

const liveBlogSchema = new mongoose.Schema(
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
    category: {
      type: String,
      required: true,
      lowercase: true,
    },
    isLive: {
      type: Boolean,
      default: true, // True if the event is still ongoing
    },
    streamType: {
      type: String,
      enum: ['none', 'youtube', 'webrtc'],
      default: 'none',
    },
    streamUrl: {
      type: String,
      default: '', // YouTube URL/ID or VDO.Ninja stream room ID
    },
    isStreamActive: {
      type: Boolean,
      default: false,
    },
    author: {
      type: String,
      default: 'News Nests Editor',
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    mainImageUrl: {
      type: String,
      default: '',
    },
    updates: [updateSchema], // Array of updates for the live blog
    
    // --- New Fields for Live UI ---
    matchStatus: {
      team1: {
        name: { type: String, default: '' },
        score: { type: String, default: '' },
      },
      team2: {
        name: { type: String, default: '' },
        score: { type: String, default: '' },
      },
      matchInfo: { type: String, default: '' }, // e.g., "2nd ODI, Sydney"
      customStats: [
        {
          label: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
    },
    poll: {
      question: { type: String, default: '' },
      options: [
        {
          text: String,
          votes: { type: Number, default: 0 },
        }
      ],
      votedUsers: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          optionIndex: Number,
        }
      ],
    },
    mediaGallery: [{ type: String }], // Array of image URLs
    relatedNews: [
      {
        title: String,
        url: String, // Link to the full article
      }
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        userAvatar: String,
        text: { type: String, required: true },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now },
      }
    ],
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    // --- Advanced SEO Overrides & Semantic Slug ---
    slug: {
      type: String,
      unique: true,
      index: true,
      sparse: true
    },
    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate semantic keyword slug on save if missing or title changed
liveBlogSchema.pre('save', function() {
  if (this.isModified('title') || !this.slug) {
    this.slug = createSlug(this.title, this._id);
  }
});

const LiveBlog = mongoose.model('LiveBlog', liveBlogSchema);
export default LiveBlog;


