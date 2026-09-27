import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    lastUsernameChange: {
      type: Date,
    },
    hasCustomizedUsername: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      // Optional, not provided by Google
    },
    bio: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    profilePicture: {
      type: String,
      default: 'https://ui-avatars.com/api/?name=User&background=random',
    },
    location: {
      type: String,
      trim: true,
    },
    socialLinks: {
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'local';
      },
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    roles: {
      type: [String],
      default: ['registered_user'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    canManageLiveBlogs: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
