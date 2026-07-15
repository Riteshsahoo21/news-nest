import express from 'express';
import { getDashboardStats } from '../controllers/adminController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyToken);
// Only allow admins to access these routes
router.use(authorizePermissions('view_admin_panel'));

// @route   GET /api/admin/dashboard
// @desc    Get statistics for the admin dashboard
// @access  Private/Admin
router.get('/dashboard', getDashboardStats);

export default router;
