import express from 'express';
import { getReverseGeocode, searchPlaces } from '../controllers/geocodingController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { geocodingRateLimiter } from '../middleware/geocodingRateLimiter.js';

const router = express.Router();

// GET /api/geocoding/reverse?lat=...&lon=... - Authenticated reverse geocoding
router.get('/reverse', authenticate, geocodingRateLimiter, getReverseGeocode);

// GET /api/geocoding/search?q=... - Search localities / streets by name
router.get('/search', authenticate, geocodingRateLimiter, searchPlaces);

export default router;
