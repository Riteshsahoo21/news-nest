import express from 'express';
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/subscriptionController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Public route to view plans
router.get('/plans', getPlans);

// Admin only routes for managing plans
router.use(verifyToken);
router.use(authorizePermissions('view_admin_panel')); // Assuming admin has this permission

router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

export default router;
