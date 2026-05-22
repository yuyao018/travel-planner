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

    // Basic sanitization: remove any potential control characters or common injection symbols
    // but allow most characters for international city name support.
    const sanitizedCity = city.trim().replace(/[<>;"%]/g, '');

    if (sanitizedCity.length === 0) {
      return res.status(400).json({ message: 'City name is required.' });
    }

    const weatherData = await getWeather(sanitizedCity);

    res.status(200).json({ weather: weatherData });
  } catch (error) {
    console.error('Weather proxy error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('not configured') || error.message.includes('Invalid Weather API key')) {
      return res.status(503).json({ message: 'Weather service is currently unavailable due to configuration issues.' });
    }

    res.status(500).json({ message: 'Failed to fetch weather data.' });
  }
});

module.exports = router;
