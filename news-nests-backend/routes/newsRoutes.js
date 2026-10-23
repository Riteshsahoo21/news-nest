import express from 'express';
import rateLimit from 'express-rate-limit';
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
  saveNews,
  getNewsByAuthor,
  getRelatedNews,
  proxyImage,
  getLocalNews,
  generateArticleBackstory,
  generateArticleSummary
} from '../controllers/newsController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { commentLimiter } from '../middleware/rateLimiters.js';
import cacheMiddleware from '../middleware/cacheMiddleware.js';
import { fetchAndSaveCurrentsNews } from '../services/currentsService.js';

const router = express.Router();
const currentsDiscoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'News discovery is temporarily limited. Please try again later.' }
});

// --- Public routes ---
router.get('/image-proxy', proxyImage); // Image streaming proxy
router.get('/', cacheMiddleware(60), getAllNews); // Cache for 1 minute
router.post('/discover', currentsDiscoveryLimiter, async (req, res) => {
  const result = await fetchAndSaveCurrentsNews({
    includeKeywordExpansion: false,
    maxCandidatesPerCategory: 5
  });
  if (result?.error || result?.reason) {
    return res.status(result.error ? 502 : 503).json({ success: false, ...result });
  }
  return res.json({ success: true, ...result });
});
router.get('/local', getLocalNews);
router.get('/related', cacheMiddleware(60), getRelatedNews);
router.get('/editor-picks', cacheMiddleware(60), getEditorPicks);
router.get('/trending', cacheMiddleware(60), getTrendingNews);
router.get('/author/:authorId', getNewsByAuthor);
router.get('/article/:id', getNewsById);
router.post('/article/:id/backstory', generateArticleBackstory);
router.get('/article/:id/backstory', generateArticleBackstory);
router.post('/article/:id/summary', generateArticleSummary);
router.get('/article/:id/summary', generateArticleSummary);
router.post('/article/:id/share', shareNews);

// --- Protected Workflow Routes ---
// Must come before /:category to avoid matching 'pending' or 'my-submissions' as a category
router.get('/pending', verifyToken, authorizePermissions('approve_content'), getPendingNews);
router.get('/my-submissions', verifyToken, authorizePermissions('create_content'), getMySubmittedNews);

router.put('/:id/approve', verifyToken, authorizePermissions('approve_content'), approveNews);
router.put('/:id/reject', verifyToken, authorizePermissions('approve_content'), rejectNews);

// --- Public Category Route ---
router.get('/:category', cacheMiddleware(60), getNewsByCategory);

// --- Authenticated user routes (likes, comments, saves) ---
router.post('/article/:id/like', verifyToken, likeNews);
router.put('/article/:id/save', verifyToken, saveNews);
router.post('/article/:id/comments', verifyToken, commentLimiter, addComment);

// Protected CRUD routes
// Reporters can create (submit) news. Editors and Admins can also create.
router.post('/', verifyToken, authorizePermissions('create_content'), upload.array('images', 5), createNews);
router.put('/draft/:id', verifyToken, authorizePermissions('create_content'), upload.array('images', 5), updateDraft);

// Only admins/editors can update/delete arbitrarily.
router.put('/:id', verifyToken, authorizePermissions('manage_content'), updateNews);
router.delete('/:id', verifyToken, authorizePermissions('delete_content'), deleteNews);

export default router;
