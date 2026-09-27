import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscriptions: {
      type: [String],
      default: ['daily_briefing', 'breaking_news', 'market_watch'],
    },
    bindedUserEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export default Subscriber;
