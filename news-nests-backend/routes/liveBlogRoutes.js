import express from 'express';
import { 
  getAllLiveBlogs, 
  getLiveBlogById, 
  createLiveBlog, 
  updateLiveBlog,
  addUpdateToLiveBlog, 
  saveLiveBlog,
  voteLiveBlogPoll,
  addCommentToLiveBlog,
  deleteCommentFromLiveBlog
} from '../controllers/liveBlogController.js';
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// Public routes
router.get('/', getAllLiveBlogs);
router.get('/:id', getLiveBlogById);

// Protected routes (Creation/updating protected inside controllers for admins/editors/authorized reporters)
router.post('/', verifyToken, createLiveBlog);
router.put('/:id', verifyToken, updateLiveBlog);
router.post('/:id/updates', verifyToken, addUpdateToLiveBlog);

// Interactive features (Voting, bookmarking, commenting)
router.put('/:id/save', verifyToken, saveLiveBlog);
router.post('/:id/poll/vote', verifyToken, voteLiveBlogPoll);
router.post('/:id/comments', verifyToken, addCommentToLiveBlog);
router.delete('/:id/comments/:commentId', verifyToken, deleteCommentFromLiveBlog);

export default router;
