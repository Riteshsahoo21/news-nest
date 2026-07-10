import express from 'express';
import { register, login, googleSignIn } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleSignIn);

export default router;
