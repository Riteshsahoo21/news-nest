import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    contentTypes: {
      type: [String],
      enum: ['article', 'video', 'live_blog', 'photo_gallery'],
      default: ['article', 'video', 'live_blog', 'photo_gallery'], // Default to all for backward compatibility
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
export default Category;
