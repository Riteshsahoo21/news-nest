import express from 'express';
import { createCheckoutSession, stripeWebhook, verifySession } from '../controllers/stripeController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Webhook endpoint needs raw body to verify signature
// We define it in server.js before express.json() but the logic is here
// For create checkout, we need auth
router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.post('/verify-session', verifyToken, verifySession);

export default router;
