import ReporterApplication from '../models/ReporterApplication.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// User applies for reporter
export const applyForReporter = async (req, res) => {
  try {
    const { phoneNumber, dateOfBirth, gender, idType, bio } = req.body;
    const userId = req.user.id;

    if (!req.files || !req.files.photo || !req.files.idDocument) {
      return res.status(400).json({ error: 'Both passport photo and ID document are required' });
    }

    const photoUrl = req.files.photo[0].path;
    const idDocumentUrl = req.files.idDocument[0].path;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isPremium) {
      return res.status(403).json({ error: 'Only Premium members can apply for the Reporter role' });
    }

    if (user.roles.includes('reporter')) {
      return res.status(400).json({ error: 'You are already a reporter' });
    }

    // Check if they already have a pending application
    const existing = await ReporterApplication.findOne({ userId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending application' });
    }

    const application = new ReporterApplication({
      userId,
      phoneNumber,
      dateOfBirth,
      gender,
      photoUrl,
      idType,
      idDocumentUrl,
      bio
    });

    await application.save();

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    console.error('Error applying for reporter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User gets their own application status
export const getMyApplication = async (req, res) => {
  try {
    const application = await ReporterApplication.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(application || null);
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin gets all applications
export const getAllApplications = async (req, res) => {
  try {
    const applications = await ReporterApplication.find().populate('userId', 'fullName email isPremium roles').sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error getting all applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin updates status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await ReporterApplication.findById(id).populate('userId');
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    await application.save();

    // If approved, update user roles
    if (status === 'approved') {
      const user = application.userId;
      if (!user.roles.includes('reporter')) {
        user.roles.push('reporter');
        await user.save();
      }

      // Send notification
      const notification = new Notification({
        user: user._id,
        title: 'Reporter Application Approved',
        message: 'Congratulations! Your application to become a reporter has been approved. You can now access the Reporter Dashboard.',
        type: 'system',
        read: false
      });
      await notification.save();
      
      if (req.io) {
        req.io.emit('receive_notification', notification);
      }
    } else if (status === 'rejected') {
      // Send rejection notification
      const notification = new Notification({
        user: application.userId._id,
        title: 'Reporter Application Update',
        message: 'Your recent application to become a reporter was reviewed but unfortunately not approved at this time. You may apply again later.',
        type: 'system',
        read: false
      });
      await notification.save();
      
      if (req.io) {
        req.io.emit('receive_notification', notification);
      }
    }

    res.json({ message: `Application ${status} successfully`, application });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
