import express from 'express';
import { getMe, getMyBookmarks, cancelPremium, getMyInvoices, updateProfile, getPublicProfile, toggleFollowUser } from '../controllers/userController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', verifyToken, authorizePermissions(), getMe);
router.get('/bookmarks', verifyToken, authorizePermissions(), getMyBookmarks);
router.post('/cancel-premium', verifyToken, authorizePermissions(), cancelPremium);
router.get('/invoices', verifyToken, getMyInvoices);
router.put('/profile', verifyToken, updateProfile);
router.get('/public/:id', getPublicProfile);
router.post('/:id/follow', verifyToken, toggleFollowUser);

export default router;
