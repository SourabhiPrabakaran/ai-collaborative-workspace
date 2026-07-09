import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';
import { 
  summarize, 
  rewrite, 
  continueDoc, 
  translate, 
  brainstorm 
} from '../controllers/aiController.js';

const router = express.Router();

// Apply auth protector to all endpoints
router.use(protect);
router.use(aiRateLimiter);

router.post('/summarize', summarize);
router.post('/rewrite', rewrite);
router.post('/continue', continueDoc);
router.post('/translate', translate);
router.post('/brainstorm', brainstorm);

export default router;
