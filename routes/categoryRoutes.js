import express from 'express';
import { 
  getActiveCategories, 
  getAllCategoriesAdmin, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Public route to get categories for navigation menus, etc.
router.get('/', getActiveCategories);

// Protected Admin routes
router.get('/admin', verifyToken, authorizePermissions('manage_categories'), getAllCategoriesAdmin);
router.post('/', verifyToken, authorizePermissions('manage_categories'), createCategory);
router.put('/:id', verifyToken, authorizePermissions('manage_categories'), updateCategory);
router.delete('/:id', verifyToken, authorizePermissions('manage_categories'), deleteCategory);

export default router;
