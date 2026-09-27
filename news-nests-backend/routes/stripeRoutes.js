import express from 'express';
import { createCheckoutSession, stripeWebhook, verifySession, createCoupon, getCoupons, deleteCoupon } from '../controllers/stripeController.js';
import { verifyToken, authorizePermissions } from '../middleware/auth.js';

const router = express.Router();

// Webhook endpoint needs raw body to verify signature
// We define it in server.js before express.json() but the logic is here
// For create checkout, we need auth
router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.post('/verify-session', verifyToken, verifySession);

// Coupon Admin Routes
router.get('/coupons', verifyToken, authorizePermissions('view_admin_panel'), getCoupons);
router.post('/coupons', verifyToken, authorizePermissions('view_admin_panel'), createCoupon);
router.delete('/coupons/:id', verifyToken, authorizePermissions('view_admin_panel'), deleteCoupon);

export default router;
