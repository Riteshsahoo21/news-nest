import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUserRole, 
  toggleUserStatus,
  addStaff,
  addEditor
} from '../controllers/userAdminController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import uploadLegalDocs from '../middleware/legalUpload.js';

const router = express.Router();

// Protect all user admin routes - only admins with manage_users permission
// Note: We allow 'admin' role directly as a fallback
router.use(verifyToken);
router.use(authorizePermissions('manage_users'));

// Admin User Management Routes
router.post('/add-staff', addStaff);
router.post('/add-editor', uploadLegalDocs.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 }
]), addEditor);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id/role', updateUserRole);
router.put('/:id/status', toggleUserStatus);

export default router;
