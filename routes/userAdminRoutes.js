import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUserRole, 
  toggleUserStatus,
  addStaff
} from '../controllers/userAdminController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Protect all user admin routes - only admins with manage_users permission
// Note: We allow 'admin' role directly as a fallback
router.use(verifyToken);
router.use(authorizePermissions('manage_users'));

// Admin User Management Routes
router.post('/add-staff', addStaff);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id/role', updateUserRole);
router.put('/:id/status', toggleUserStatus);

export default router;
