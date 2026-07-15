import express from 'express';
import { deleteComment, likeComment } from '../controllers/commentController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Admin route to delete comments
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteComment);

// Like a comment (Authenticated users only)
router.post('/:id/like', verifyToken, likeComment);

export default router;
