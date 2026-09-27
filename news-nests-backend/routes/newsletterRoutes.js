import express from 'express';
import { 
  subscribe, 
  unsubscribe, 
  checkStatus,
  updatePreferences,
  getBindedAccounts,
  getSubscribers, 
  deleteSubscriber, 
  getCampaigns, 
  sendManualCampaign 
} from '../controllers/newsletterController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import { newsletterLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Public Routes
router.post('/subscribe', newsletterLimiter, subscribe);
router.get('/unsubscribe', unsubscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/status/:email', checkStatus);
router.get('/binded/:userEmail', getBindedAccounts);
router.put('/preferences', updatePreferences);

// Admin Routes
router.get('/subscribers', verifyToken, authorizePermissions('manage_users'), getSubscribers);
router.delete('/subscribers/:id', verifyToken, authorizePermissions('manage_users'), deleteSubscriber);

router.get('/campaigns', verifyToken, authorizePermissions('manage_users'), getCampaigns);
router.post('/campaigns/send', verifyToken, authorizePermissions('manage_users'), sendManualCampaign);

export default router;
