import mongoose from 'mongoose';

// Categories are now managed dynamically via the Category model

const photoGallerySchema = new mongoose.Schema(
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
    photographer: {
      type: String,
      default: 'Anonymous', // e.g., 'Amit Kumar (Capital Press Bureau)'
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
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
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      }
    ],
    relatedNews: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
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
    ]
  },
  { timestamps: true }
);

const PhotoGallery = mongoose.model('PhotoGallery', photoGallerySchema);
export default PhotoGallery;
