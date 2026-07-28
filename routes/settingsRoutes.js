import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', verifyToken, authorizePermissions('view_admin_panel'), updateSettings);

export default router;
