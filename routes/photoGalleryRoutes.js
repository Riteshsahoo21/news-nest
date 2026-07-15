import express from 'express';
import { 
  getAllGalleries, 
  getGalleryById, 
  createGallery, 
  updateGallery, 
  deleteGallery,
  savePhotoGallery,
  getPendingGalleries,
  getMySubmittedGalleries,
  approveGallery,
  rejectGallery,
  likeGallery,
  addComment
} from '../controllers/photoGalleryController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllGalleries);

// --- Protected Workflow Routes ---
// Must come before /:id to avoid ID conflict
// Protected editorial routes
router.get('/pending', verifyToken, authorizePermissions('approve_content'), getPendingGalleries);
router.get('/my-submissions', verifyToken, authorizePermissions('create_content'), getMySubmittedGalleries);

router.put('/:id/approve', verifyToken, authorizePermissions('approve_content'), approveGallery);
router.put('/:id/reject', verifyToken, authorizePermissions('approve_content'), rejectGallery);

// Public route for single gallery
router.get('/:id', getGalleryById);

import upload from '../middleware/upload.js';

// Protected routes (Reporters, Admins, Editors can create)
router.post('/', verifyToken, authorizePermissions('create_content'), upload.array('images', 10), createGallery);

// Admin routes for updating/deleting ANY gallery
router.put('/:id', verifyToken, authorizePermissions('manage_content'), updateGallery);
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteGallery);

// Authenticated routes
router.put('/:id/save', verifyToken, savePhotoGallery);
router.post('/:id/like', verifyToken, likeGallery);
router.post('/:id/comments', verifyToken, addComment);

export default router;
