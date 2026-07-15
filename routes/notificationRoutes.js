import express from 'express';
import { getNotifications, createNotification, markAsRead } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// All notification routes require the user to be logged in
router.use(verifyToken);

router.get('/', getNotifications);
router.post('/', createNotification);
router.put('/:id/read', markAsRead);

export default router;
