import express from 'express';
import { 
  subscribe, 
  unsubscribe, 
  getSubscribers, 
  deleteSubscriber, 
  getCampaigns, 
  sendManualCampaign 
} from '../controllers/newsletterController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Public Routes
router.post('/subscribe', subscribe);
router.get('/unsubscribe', unsubscribe); // GET for easy email link clicking

// Admin Routes
router.get('/subscribers', verifyToken, authorizePermissions('manage_users'), getSubscribers);
router.delete('/subscribers/:id', verifyToken, authorizePermissions('manage_users'), deleteSubscriber);

router.get('/campaigns', verifyToken, authorizePermissions('manage_users'), getCampaigns);
router.post('/campaigns/send', verifyToken, authorizePermissions('manage_users'), sendManualCampaign);

export default router;
