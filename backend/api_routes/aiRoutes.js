const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /api/trips/:tripId/generate-ai
 * Generate a full itinerary using AI and save it as stops for the trip.
 */
router.post('/:tripId/generate-ai', async (req, res) => {
  try {
    const { tripId } = req.params;

    if (!ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');
    const stopsCollection = db.collection('stops');

    // Verify trip belongs to user
    const trip = await tripsCollection.findOne({
      _id: new ObjectId(tripId),
      userId: new ObjectId(req.user.userId),
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Generate itinerary using AI
    const generatedStops = await aiService.generateItinerary(trip);

    // Prepare stops for insertion with backend geocoding to improve map reliability
    const stopsToInsert = [];
    console.log(`AI Routes: Geocoding ${generatedStops.length} generated stops...`);
    
    for (let i = 0; i < generatedStops.length; i++) {
      const stop = generatedStops[i];
      let lat = null;
      let lng = null;

      try {
        // Only geocode if location is provided
        if (stop.location) {
          const query = `${stop.location}, ${trip.destination}`;
          // Nominatim requires 1s delay
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 1100));
          
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'User-Agent': 'TravelPlannerApp/1.1 (Contact: travel@example.com)' } }
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        }
      } catch (geoErr) {
        console.warn(`AI Routes: Geocoding failed for stop ${i}:`, geoErr.message);
      }

      stopsToInsert.push({
        tripId: new ObjectId(tripId),
        userId: new ObjectId(req.user.userId),
        day: stop.day || 1,
        time: stop.time || null,
        activityTitle: stop.activityTitle || 'Untitled Activity',
        location: stop.location || '',
        category: stop.category || 'General',
        duration: stop.duration || null,
        notes: stop.notes || '',
        order: stop.order || 0,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Clear existing stops for this trip to avoid duplicates
    await stopsCollection.deleteMany({ tripId: new ObjectId(tripId) });
    
    if (stopsToInsert.length > 0) {
      await stopsCollection.insertMany(stopsToInsert);
    }

    res.status(200).json({
      message: 'Itinerary generated successfully.',
      count: stopsToInsert.length,
    });
  } catch (error) {
    console.error('AI Generation error:', error);
    res.status(error.message.includes('not configured') ? 503 : 500).json({ 
      message: error.message || 'Server error while generating itinerary.' 
    });
  }
});

module.exports = router;
