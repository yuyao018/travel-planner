const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { searchPlaces, getDirections } = require('../services/serpapi');

const router = express.Router();

// Rate limiter specific to places API (30 requests per 15 min per IP)
const placesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many places requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: JWT authentication + rate limiting
router.use(authMiddleware);
router.use(placesLimiter);

/**
 * GET /api/places/search
 * Search for places near a location using Google Places via SerpAPI.
 * Query params: query, location, limit (optional)
 * Security: JWT required, rate limited
 */
router.get('/search', async (req, res) => {
  try {
    const { query, near, limit } = req.query;

    if (!query || !near) {
      return res.status(400).json({ message: 'Query and near (location name) are required.' });
    }

    if (query.trim().length === 0 || near.trim().length === 0) {
      return res.status(400).json({ message: 'Query and near cannot be empty.' });
    }

    const parsedLimit = limit ? parseInt(limit) : 10;
    if (parsedLimit < 1 || parsedLimit > 20) {
      return res.status(400).json({ message: 'Limit must be between 1 and 20.' });
    }

    const places = await searchPlaces({
      query: query.trim(),
      location: near.trim(),
      limit: parsedLimit,
    });

    res.status(200).json({ places });
  } catch (error) {
    console.error('Places search error:', error.message);

    if (error.message.includes('not configured')) {
      return res.status(503).json({ message: 'Places service is not configured.' });
    }

    if (error.message.includes('Invalid SerpAPI key')) {
      return res.status(503).json({ message: 'Places service authentication failed.' });
    }

    res.status(500).json({ message: error.message || 'Failed to search places.' });
  }
});

/**
 * GET /api/places/directions
 * Get directions between two locations using Google Directions via SerpAPI.
 * Query params: origin, destination, mode (optional: driving|walking|transit|bicycling)
 * Security: JWT required, rate limited
 */
router.get('/directions', async (req, res) => {
  try {
    const { origin, destination, mode } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required.' });
    }

    if (origin.trim().length === 0 || destination.trim().length === 0) {
      return res.status(400).json({ message: 'Origin and destination cannot be empty.' });
    }

    const directions = await getDirections(
      origin.trim(),
      destination.trim(),
      mode || 'driving'
    );

    res.status(200).json({ directions });
  } catch (error) {
    console.error('Directions error:', error.message);

    if (error.message.includes('not configured')) {
      return res.status(503).json({ message: 'Directions service is not configured.' });
    }

    if (error.message.includes('No route found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: error.message || 'Failed to get directions.' });
  }
});

module.exports = router;
