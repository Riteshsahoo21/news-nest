import express from 'express';
import { getMyBookmarks, getMe } from '../controllers/userController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/bookmarks', getMyBookmarks);
router.get('/me', authorizePermissions(), getMe);

export default router;
