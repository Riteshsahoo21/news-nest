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
  deleteVideo
} from '../controllers/videoNewsController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllVideos);
router.get('/:id', getVideoById);
router.post('/:id/download', incrementDownload);

// Protected user routes
router.post('/:id/like', verifyToken, likeVideo);
router.post('/:id/save', verifyToken, saveVideo);
router.post('/:id/comments', verifyToken, addComment);

// Admin only routes
router.post('/', verifyToken, authorizePermissions('create_content'), createVideo);
router.put('/:id', verifyToken, authorizePermissions('manage_content'), updateVideo);
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteVideo);

export default router;
