import mongoose from 'mongoose';

const notificationReadReceiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a user can only have one read receipt per notification
notificationReadReceiptSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

const NotificationReadReceipt = mongoose.model('NotificationReadReceipt', notificationReadReceiptSchema);
export default NotificationReadReceipt;
