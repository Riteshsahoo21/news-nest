import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['breaking_news', 'subscription_alert', 'sports_update', 'system_notice', 'general'],
      default: 'general',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'premium_only', 'free_only', 'specific_user'],
      default: 'all',
    },
    link: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // If targetAudience is not specific_user, this will be null
    },
    // For legacy support or specific_user notifications
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
