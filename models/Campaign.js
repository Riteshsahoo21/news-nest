import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String, // HTML content
      required: true,
    },
    type: {
      type: String,
      enum: ['automated', 'manual'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'failed'],
      default: 'sent',
    },
    sentCount: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
