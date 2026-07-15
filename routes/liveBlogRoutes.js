import express from 'express';
import { getAllLiveBlogs, getLiveBlogById, createLiveBlog, addUpdateToLiveBlog, saveLiveBlog } from '../controllers/liveBlogController.js';
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// Public routes
router.get('/', getAllLiveBlogs);
router.get('/:id', getLiveBlogById);

// Protected routes (Only logged in users/admins can create or update live blogs)
router.post('/', verifyToken, createLiveBlog);
router.post('/:id/updates', verifyToken, addUpdateToLiveBlog);
router.put('/:id/save', verifyToken, saveLiveBlog);

export default router;
