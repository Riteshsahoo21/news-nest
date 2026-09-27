import express from 'express';
import { globalSearch, getSearchRecommendations } from '../controllers/searchController.js';

const router = express.Router();

// Search recommendations and trending query topics
router.get('/recommendations', getSearchRecommendations);

// Public route for global searching
router.get('/', globalSearch);

export default router;
