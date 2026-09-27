import express from 'express';
import axios from 'axios';
import { syncMetadataFeeds, syncAllCategories } from '../services/hybridNewsService.js';
import { syncHarmonizedNews, getProviderStatus } from '../services/unifiedNewsAggregator.js';

const router = express.Router();
const FASTAPI_SCRAPER_URL = process.env.FASTAPI_SCRAPER_URL || 'http://127.0.0.1:8000';

// Trigger the scraper-only, full-content ingestion pipeline.
router.post('/sync-unified', async (req, res) => {
  try {
    const quotaPerCategory = req.body?.quotaPerCategory || 8;
    const result = await syncHarmonizedNews(quotaPerCategory);
    res.json({
      success: true,
      message: 'Complete scraper news sync completed',
      result
    });
  } catch (error) {
    console.error('Error in sync-unified:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check the active ingestion provider and quality threshold.
router.get('/provider-status', (req, res) => {
  res.json(getProviderStatus());
});

// Trigger single category/country sync
router.post('/sync-now', async (req, res) => {
  try {
    const { category, subCategory, country, language, query, city, region, limit } = req.body || {};
    const result = await syncMetadataFeeds({
      category,
      subCategory,
      country,
      language,
      query,
      city,
      region,
      limit
    });
    res.json({
      success: true,
      message: 'Scraper sync completed successfully',
      result
    });
  } catch (error) {
    console.error('Error in manual sync-now:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger comprehensive sync across all 9 categories + esports + India
router.post('/sync-all', async (req, res) => {
  try {
    const limitPerFeed = req.body?.limitPerFeed || 8;
    const result = await syncAllCategories(limitPerFeed);
    res.json({
      success: true,
      message: 'Comprehensive news sync completed',
      result
    });
  } catch (error) {
    console.error('Error in manual sync-all:', error);
    res.status(500).json({ error: error.message });
  }
});

// Microservice health & status check
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_SCRAPER_URL}/health`, { timeout: 3000 });
    res.json({
      microserviceConnected: true,
      microserviceUrl: FASTAPI_SCRAPER_URL,
      data: response.data
    });
  } catch (error) {
    res.status(502).json({
      microserviceConnected: false,
      microserviceUrl: FASTAPI_SCRAPER_URL,
      error: 'FastAPI microservice is unreachable. Ensure it is running on port 8000.'
    });
  }
});

export default router;
