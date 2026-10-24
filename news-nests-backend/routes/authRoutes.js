import express from 'express';
import { register, login, googleSignIn, exchangeGoogleLoginTicket, logout, sendRegistrationOTP } from '../controllers/authController.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many Google sign-in attempts. Please try again in 15 minutes.' },
});

const router = express.Router();

router.post('/send-otp', authLimiter, sendRegistrationOTP);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', googleAuthLimiter, googleSignIn);
router.post('/google/exchange', googleAuthLimiter, exchangeGoogleLoginTicket);
router.post('/logout', logout);

export default router;
