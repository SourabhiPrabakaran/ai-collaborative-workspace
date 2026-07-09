import express from 'express';
import { getPublicDocumentByToken } from '../controllers/documentController.js';

const router = express.Router();

// Public route to fetch public document content by token link
router.get('/document/:token', getPublicDocumentByToken);

export default router;
