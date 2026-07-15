import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Require users to be logged in
router.use(verifyToken);

// Anyone who can manage users or roles can view the list of roles
router.get('/', authorizePermissions('manage_roles', 'manage_users'), getRoles);

// Only those with manage_roles can create, update, or delete roles
router.post('/', authorizePermissions('manage_roles'), createRole);
router.put('/:id', authorizePermissions('manage_roles'), updateRole);
router.delete('/:id', authorizePermissions('manage_roles'), deleteRole);

export default router;
