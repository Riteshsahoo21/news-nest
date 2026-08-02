import express from 'express';
import { getDashboardStats, getAuditLogs, getAuditLogStats } from '../controllers/adminController.js';
import { getSeoAnalytics, auditContentSeo, updateSeoMetadata, triggerManualIndex } from '../controllers/seoAdminController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyToken);
// Only allow admins to access these routes (strictly enforced as requested)
router.use(authorizePermissions('view_admin_panel'));

// @route   GET /api/admin/dashboard
// @desc    Get statistics for the admin dashboard
// @access  Private/Admin
router.get('/dashboard', getDashboardStats);

// --- SEO & Real-Time Indexing Admin Routes ---
router.get('/seo/analytics', getSeoAnalytics);
router.get('/seo/audit', auditContentSeo);
router.put('/seo/update', updateSeoMetadata);
router.post('/seo/ping-index', triggerManualIndex);

// @route   GET /api/admin/audit-logs
// @desc    Get system audit logs
// @access  Private/Admin
router.get('/audit-logs', getAuditLogs);

// @route   GET /api/admin/audit-logs/stats
// @desc    Get system audit log stats
// @access  Private/Admin
router.get('/audit-logs/stats', getAuditLogStats);

export default router;

