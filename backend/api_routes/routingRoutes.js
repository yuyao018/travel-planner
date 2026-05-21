const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { getRoute, getMultiStopRoute } = require('../services/routing');

const router = express.Router();

// Rate limiter specific to routing API (20 requests per 15 min per IP)
const routingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many routing requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: JWT authentication + rate limiting
router.use(authMiddleware);
router.use(routingLimiter);

/**
 * POST /api/routing/directions
 * Get route between two points.
 * Body: { origin: { lat, lng }, destination: { lat, lng }, profile: 'driving'|'walking'|'cycling' }
 * Security: JWT required, rate limited
 */
router.post('/directions', async (req, res) => {
  try {
    const { origin, destination, profile } = req.body;

    // Input validation
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      return res.status(400).json({ message: 'Origin with numeric lat and lng is required.' });
    }

    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      return res.status(400).json({ message: 'Destination with numeric lat and lng is required.' });
    }

    // Validate coordinate ranges
    if (origin.lat < -90 || origin.lat > 90 || origin.lng < -180 || origin.lng > 180) {
      return res.status(400).json({ message: 'Origin coordinates out of valid range.' });
    }

    if (destination.lat < -90 || destination.lat > 90 || destination.lng < -180 || destination.lng > 180) {
      return res.status(400).json({ message: 'Destination coordinates out of valid range.' });
    }

    // Validate profile
    const validProfiles = ['driving', 'walking', 'cycling'];
    const selectedProfile = profile || 'driving';
    if (!validProfiles.includes(selectedProfile)) {
      return res.status(400).json({ message: `Profile must be one of: ${validProfiles.join(', ')}` });
    }

    const routeData = await getRoute(origin, destination, selectedProfile);

    res.status(200).json({ route: routeData });
  } catch (error) {
    console.error('Routing error:', error.message);
    res.status(500).json({ message: 'Failed to compute route.' });
  }
});

/**
 * POST /api/routing/multi
 * Get route between multiple waypoints.
 * Body: { waypoints: [{ lat, lng }, ...], profile: 'driving'|'walking'|'cycling' }
 * Security: JWT required, rate limited
 */
router.post('/multi', async (req, res) => {
  try {
    const { waypoints, profile } = req.body;

    // Input validation
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ message: 'At least two waypoints are required.' });
    }

    if (waypoints.length > 25) {
      return res.status(400).json({ message: 'Maximum 25 waypoints allowed.' });
    }

    // Validate each waypoint
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
        return res.status(400).json({ message: `Waypoint ${i + 1} must have numeric lat and lng.` });
      }
      if (wp.lat < -90 || wp.lat > 90 || wp.lng < -180 || wp.lng > 180) {
        return res.status(400).json({ message: `Waypoint ${i + 1} coordinates out of valid range.` });
      }
    }

    // Validate profile
    const validProfiles = ['driving', 'walking', 'cycling'];
    const selectedProfile = profile || 'driving';
    if (!validProfiles.includes(selectedProfile)) {
      return res.status(400).json({ message: `Profile must be one of: ${validProfiles.join(', ')}` });
    }

    const routeData = await getMultiStopRoute(waypoints, selectedProfile);

    res.status(200).json({ route: routeData });
  } catch (error) {
    console.error('Multi-stop routing error:', error.message);
    res.status(500).json({ message: 'Failed to compute multi-stop route.' });
  }
});

module.exports = router;
