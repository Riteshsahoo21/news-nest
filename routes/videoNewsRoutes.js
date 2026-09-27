import express from 'express';
import {
  getAllVideos,
  getVideoById,
  likeVideo,
  saveVideo,
  incrementDownload,
  addComment,
  createVideo,
  updateVideo,
  deleteVideo,
  getMySubmittedVideos,
  getPendingVideos,
  approveVideo,
  rejectVideo,
  getRelatedVideos
} from '../controllers/videoNewsController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import { commentLimiter } from '../middleware/rateLimiters.js';
import cacheMiddleware from '../middleware/cacheMiddleware.js';
import upload, { mediaUpload } from '../middleware/upload.js';

const router = express.Router();

// Public routes & Reporter submissions
router.get('/', cacheMiddleware(60), getAllVideos); // Cache for 1 minute

// --- Protected Editorial Workflow Routes ---
// Must come before /:id to avoid ID conflict
router.get('/pending', verifyToken, authorizePermissions('approve_content'), getPendingVideos);
router.get('/my-submissions', verifyToken, authorizePermissions('create_content'), getMySubmittedVideos);

router.put('/:id/approve', verifyToken, authorizePermissions('approve_content'), approveVideo);
router.put('/:id/reject', verifyToken, authorizePermissions('approve_content'), rejectVideo);

// Public single video route
router.get('/related', getRelatedVideos);
router.get('/:id', getVideoById);
router.post('/:id/download', incrementDownload);

// Protected user routes
router.post('/:id/like', verifyToken, likeVideo);
router.post('/:id/save', verifyToken, saveVideo);
router.post('/:id/comments', verifyToken, commentLimiter, addComment);

// Content creation & management routes (Reporters & Admins)
router.post('/', verifyToken, authorizePermissions('create_content'), mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), createVideo);
router.put('/:id', verifyToken, authorizePermissions('manage_content'), updateVideo);
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteVideo);

export default router;
