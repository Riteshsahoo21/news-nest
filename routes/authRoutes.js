import express from 'express';
import { register, login, googleSignIn, logout } from '../controllers/authController.js';
import rateLimit from 'express-rate-limit';

const authLimiter = (req, res, next) => next();
// rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   limit: 5, // Limit each IP to 5 requests per window
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   message: { error: 'Too many authentication attempts, please try again after 5 minutes' }
// });

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', googleSignIn);
router.post('/logout', logout);

export default router;
