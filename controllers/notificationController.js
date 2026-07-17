import Notification from '../models/Notification.js';
import NotificationReadReceipt from '../models/NotificationReadReceipt.js';
import User from '../models/User.js';

// Get notifications for the logged-in user (includes global ones)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // Provided by verifyToken middleware
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPremium = user.isPremium || user.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));

    // Determine target audiences this user belongs to
    const audiences = ['all'];
    if (isPremium) {
      audiences.push('premium_only');
    } else {
      audiences.push('free_only');
    }

    // Fetch personal notifications AND targeted global notifications
    const notifications = await Notification.find({
      $or: [
        { targetAudience: 'specific_user', userId: userId },
        { targetAudience: { $in: audiences } },
      ]
    }).sort({ createdAt: -1 }).limit(50); // limit to recent 50 for performance

    // Fetch read receipts for this user
    const notificationIds = notifications.map(n => n._id);
    const readReceipts = await NotificationReadReceipt.find({
      userId: userId,
      notificationId: { $in: notificationIds }
    });

    const readReceiptMap = {};
    readReceipts.forEach(receipt => {
      readReceiptMap[receipt.notificationId.toString()] = true;
    });

    // Map notifications to include accurate isRead status
    const formattedNotifications = notifications.map(notification => {
      const notifObj = notification.toObject();
      if (notifObj.targetAudience === 'specific_user') {
        // use its own isRead
      } else {
        // global broadcast, check read receipt
        notifObj.isRead = !!readReceiptMap[notifObj._id.toString()];
      }
      return notifObj;
    });

    res.json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a notification
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, targetAudience, link, userId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Please provide title and message' });
    }

    // If specific user is targeted, ensure userId is provided
    if (targetAudience === 'specific_user' && !userId) {
      return res.status(400).json({ error: 'Please provide a userId for a specific user notification' });
    }

    const notification = await Notification.create({
      title,
      message,
      type: type || 'general',
      targetAudience: targetAudience || 'all',
      link,
      userId: targetAudience === 'specific_user' ? userId : undefined,
    });

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.targetAudience === 'specific_user') {
      if (notification.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'You do not have permission to modify this notification' });
      }
      notification.isRead = true;
      await notification.save();
    } else {
      // Global broadcast, create a read receipt
      try {
        await NotificationReadReceipt.create({
          userId,
          notificationId: id
        });
      } catch (err) {
        // Ignore duplicate key error if already marked as read
        if (err.code !== 11000) {
          throw err;
        }
      }
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
       return res.status(404).json({ error: 'User not found' });
    }
    
    const isPremium = user.isPremium || user.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
    
    const audiences = ['all'];
    if (isPremium) {
      audiences.push('premium_only');
    } else {
      audiences.push('free_only');
    }

    // 1. Update specific user notifications directly
    await Notification.updateMany(
      { targetAudience: 'specific_user', userId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Fetch all applicable global notifications
    const globalNotifications = await Notification.find({
      targetAudience: { $in: audiences }
    });

    // 3. Create read receipts for any that don't have one
    const globalIds = globalNotifications.map(n => n._id);
    
    const existingReceipts = await NotificationReadReceipt.find({
      userId,
      notificationId: { $in: globalIds }
    });
    
    const existingIds = existingReceipts.map(r => r.notificationId.toString());
    
    const newReceipts = globalNotifications
      .filter(n => !existingIds.includes(n._id.toString()))
      .map(n => ({
        userId,
        notificationId: n._id
      }));

    if (newReceipts.length > 0) {
      await NotificationReadReceipt.insertMany(newReceipts);
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
