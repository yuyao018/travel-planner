const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { getWeather } = require('../services/weather');

const router = express.Router();

// Rate limiter specific to weather API (30 requests per 15 min per IP)
const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many weather requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: JWT authentication + rate limiting
router.use(authMiddleware);
router.use(weatherLimiter);

/**
 * GET /api/weather/:city
 * Weather proxy endpoint — fetches live weather from OpenWeatherMap.
 * Security: JWT required, rate limited
 */
router.get('/:city', async (req, res) => {
  try {
    const { city } = req.params;

    // Input validation and sanitization
    if (!city || city.trim().length === 0) {
      return res.status(400).json({ message: 'City name is required.' });
    }

    if (city.length > 100) {
      return res.status(400).json({ message: 'City name is too long.' });
    }

    // Only allow letters, spaces, hyphens, and common characters in city names
    const cityRegex = /^[a-zA-Z\s\-'.]+$/;
    if (!cityRegex.test(city.trim())) {
      return res.status(400).json({ message: 'Invalid city name format.' });
    }

    const weatherData = await getWeather(city.trim());

    res.status(200).json({ weather: weatherData });
  } catch (error) {
    console.error('Weather proxy error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('not configured')) {
      return res.status(503).json({ message: 'Weather service is not configured.' });
    }

    res.status(500).json({ message: 'Failed to fetch weather data.' });
  }
});

module.exports = router;
