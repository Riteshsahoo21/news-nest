import express from 'express';
import { globalSearch } from '../controllers/searchController.js';

const router = express.Router();

// Public route for global searching
router.get('/', globalSearch);

export default router;
