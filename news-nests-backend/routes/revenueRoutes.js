import express from 'express';
import { getRevenueStats } from '../controllers/revenueController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Admin Route to view revenue stats
router.get('/', verifyToken, authorizePermissions('view_admin_panel'), getRevenueStats);

export default router;
