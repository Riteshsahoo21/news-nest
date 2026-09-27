import express from 'express';
import { verifyAutomationKey } from '../middleware/automationAuth.js';
import {
  getAutomationStatus,
  getPendingSemanticNews,
  updateNewsSemanticData,
  getAutomationLiveBlogs,
  upsertLiveFixture,
  syncLiveScore,
  seedMultiCategoryLiveBlogs,
  getNewsletterAutomationContext,
  sendAutomatedNewsletter
} from '../controllers/automationController.js';

const router = express.Router();

router.use(verifyAutomationKey);
router.get('/status', getAutomationStatus);
router.get('/news/semantic-pending', getPendingSemanticNews);
router.put('/news/:id/semantic', updateNewsSemanticData);
router.get('/live-blogs', getAutomationLiveBlogs);
router.post('/live-blogs/upsert-fixture', upsertLiveFixture);
router.post('/live-blogs/seed-multi-category', seedMultiCategoryLiveBlogs);
router.post('/live-blogs/sync-score/:externalMatchId', syncLiveScore);
router.get('/newsletter/context', getNewsletterAutomationContext);
router.post('/newsletter/send', sendAutomatedNewsletter);

export default router;

