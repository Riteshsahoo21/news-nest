import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Only one settings document should exist
  isGlobal: {
    type: Boolean,
    default: true,
    unique: true
  },
  newsletterEnabled: {
    type: Boolean,
    default: true
  },
  newsletterFrequency: {
    type: String,
    enum: ['daily', 'every_3_days', 'weekly'],
    default: 'daily'
  },
  lastAutomatedBlast: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
