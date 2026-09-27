import express from 'express';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import {
  createAd,
  getAdminAds,
  updateAd,
  deleteAd,
  getRandomAd,
  trackView,
  trackClick
} from '../controllers/adController.js';

const router = express.Router();

// Public Routes (for displaying and tracking ads)
router.get('/serve', getRandomAd);
router.post('/:id/view', trackView);
router.post('/:id/click', trackClick);

// Admin Routes (for managing ads)
router.get('/', verifyToken, authorizePermissions('view_admin_panel'), getAdminAds);
router.post('/', verifyToken, authorizePermissions('view_admin_panel'), createAd);
router.put('/:id', verifyToken, authorizePermissions('view_admin_panel'), updateAd);
router.delete('/:id', verifyToken, authorizePermissions('view_admin_panel'), deleteAd);

export default router;
