import Notification from '../models/Notification.js';

// Get notifications for the logged-in user (includes global ones)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId; // Provided by verifyToken middleware

    // Fetch personal notifications AND global notifications (userId: null or does not exist)
    const notifications = await Notification.find({
      $or: [
        { userId: userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a notification
export const createNotification = async (req, res) => {
  try {
    const { title, message, userId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Please provide title and message' });
    }

    const notification = await Notification.create({
      title,
      message,
      userId: userId || undefined, // undefined makes it global
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
    const userId = req.user.userId;

    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or you do not have permission to modify it' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
