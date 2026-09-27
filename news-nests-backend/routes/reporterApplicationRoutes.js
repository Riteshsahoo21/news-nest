import express from 'express';
import { 
  applyForReporter, 
  getMyApplication, 
  getAllApplications, 
  updateApplicationStatus 
} from '../controllers/reporterApplicationController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import legalUpload from '../middleware/legalUpload.js';

const router = express.Router();

// User Routes
router.post(
  '/apply', 
  verifyToken, 
  legalUpload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idDocument', maxCount: 1 }]), 
  applyForReporter
);
router.get('/my-application', verifyToken, getMyApplication);

// Admin Routes
router.get('/admin/all', verifyToken, authorizePermissions('manage_users'), getAllApplications);
router.put('/admin/:id/status', verifyToken, authorizePermissions('manage_users'), updateApplicationStatus);

export default router;
