import express from 'express';
import { 
  getAllNews, 
  getNewsByCategory, 
  createNews, 
  getEditorPicks, 
  getTrendingNews, 
  updateNews, 
  updateDraft,
  deleteNews,
  getNewsById,
  likeNews,
  shareNews,
  addComment,
  getPendingNews,
  getMySubmittedNews,
  approveNews,
  rejectNews,
  saveNews
} from '../controllers/newsController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { commentLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// --- Public routes ---
router.get('/', getAllNews);
router.get('/editor-picks', getEditorPicks);
router.get('/trending', getTrendingNews);
router.get('/article/:id', getNewsById);
router.post('/article/:id/share', shareNews);

// --- Protected Workflow Routes ---
// Must come before /:category to avoid matching 'pending' or 'my-submissions' as a category
router.get('/pending', verifyToken, authorizePermissions('approve_content'), getPendingNews);
router.get('/my-submissions', verifyToken, authorizePermissions('create_content'), getMySubmittedNews);

router.put('/:id/approve', verifyToken, authorizePermissions('approve_content'), approveNews);
router.put('/:id/reject', verifyToken, authorizePermissions('approve_content'), rejectNews);

// --- Public Category Route ---
router.get('/:category', getNewsByCategory);

// --- Authenticated user routes (likes, comments, saves) ---
router.post('/article/:id/like', verifyToken, likeNews);
router.put('/article/:id/save', verifyToken, saveNews);
router.post('/article/:id/comments', verifyToken, commentLimiter, addComment);

// Protected CRUD routes
// Reporters can create (submit) news. Editors and Admins can also create.
router.post('/', verifyToken, authorizePermissions('create_content'), upload.single('image'), createNews);
router.put('/draft/:id', verifyToken, authorizePermissions('create_content'), upload.single('image'), updateDraft);

// Only admins/editors can update/delete arbitrarily.
router.put('/:id', verifyToken, authorizePermissions('manage_content'), updateNews);
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteNews);

export default router;
