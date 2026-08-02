import express from 'express';
import { deleteComment, likeComment } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Delete comments (Admin or comment author)
router.delete('/:id', verifyToken, deleteComment);

// Like a comment (Authenticated users only)
router.post('/:id/like', verifyToken, likeComment);

export default router;
