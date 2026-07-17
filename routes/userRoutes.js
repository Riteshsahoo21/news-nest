import express from 'express';
import { getMe, getMyBookmarks, cancelPremium, getMyInvoices } from '../controllers/userController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', verifyToken, authorizePermissions(), getMe);
router.get('/bookmarks', verifyToken, authorizePermissions(), getMyBookmarks);
router.post('/cancel-premium', verifyToken, authorizePermissions(), cancelPremium);
router.get('/invoices', verifyToken, getMyInvoices);

export default router;
