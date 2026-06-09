const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

router.use(authMiddleware);

/**
 * Extract HH:mm from a time string ("08:00") or datetime-local ("2026-07-01T09:30").
 */
function extractTime(value) {
  if (!value) return null;
  if (value.includes('T')) return value.split('T')[1].slice(0, 5);
  return value.slice(0, 5);
}

function timeToMins(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

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

    const durationDays = Math.ceil(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Time boundaries for filtering AI stops
    const arrivalMins   = timeToMins(extractTime(trip.arrivalTime));
    const departureMins = timeToMins(extractTime(trip.departureTime));

    // Generate itinerary using AI
    const generatedStops = await aiService.generateItinerary(trip);

    // Geocode AI-generated stops
    const stopsToInsert = [];
    console.log(`AI Routes: Geocoding ${generatedStops.length} generated stops...`);

    for (let i = 0; i < generatedStops.length; i++) {
      const stop = generatedStops[i];

      // ── Hard filter: drop stops that are illogically timed ──────────────────
      // Day 1: drop anything before the airport arrival time
      if (stop.day === 1 && arrivalMins !== null && stop.time) {
        if (timeToMins(stop.time) < arrivalMins) {
          console.log(`AI Routes: Dropping day-1 stop "${stop.activityTitle}" at ${stop.time} — before arrival ${extractTime(trip.arrivalTime)}`);
          continue;
        }
      }
      // Last day: drop anything after the airport departure time
      if (stop.day === durationDays && departureMins !== null && stop.time) {
        if (timeToMins(stop.time) >= departureMins) {
          console.log(`AI Routes: Dropping day-${durationDays} stop "${stop.activityTitle}" at ${stop.time} — after departure ${extractTime(trip.departureTime)}`);
          continue;
        }
      }

      let lat = null;
      let lng = null;

      try {
        if (stop.location) {
          const query = `${stop.location}, ${trip.destination}`;
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));

          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 3000));
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
              { headers: { 'User-Agent': 'TravelPlannerApp/1.0' } }
            );
            if (!geoRes.ok) {
              const text = await geoRes.text();
              throw new Error(`Nominatim returned HTTP ${geoRes.status}: ${text.slice(0, 80)}`);
            }
            const geoData = await geoRes.json();
            if (geoData && geoData.length > 0) {
              lat = parseFloat(geoData[0].lat);
              lng = parseFloat(geoData[0].lon);
            }
            break;
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

    // ── Add fixed logistics stops from trip fields ─────────────────────────────
    // These are always included regardless of time — they ARE the boundaries.

    // Day 1 — Airport arrival (first stop of the trip)
    if (trip.arrivalAirport) {
      stopsToInsert.push({
        tripId: new ObjectId(tripId),
        userId: new ObjectId(req.user.userId),
        day: 1,
        time: extractTime(trip.arrivalTime) || '08:00',
        activityTitle: `Arrive at ${trip.arrivalAirport}`,
        location: trip.arrivalAirport,
        category: 'Logistics',
        duration: '1h',
        notes: 'Airport arrival, immigration and customs.',
        order: 0,
        lat: trip.arrivalAirportLat || null,
        lng: trip.arrivalAirportLng || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Day 1 — Hotel check-in
    if (trip.hotelLocation && trip.hotelCheckIn) {
      stopsToInsert.push({
        tripId: new ObjectId(tripId),
        userId: new ObjectId(req.user.userId),
        day: 1,
        time: extractTime(trip.hotelCheckIn),
        activityTitle: `Check in at ${trip.hotelLocation}`,
        location: trip.hotelLocation,
        category: 'Logistics',
        duration: '30m',
        notes: 'Hotel check-in.',
        order: 1,
        lat: trip.hotelLat || null,
        lng: trip.hotelLng || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Last day — Hotel check-out
    if (trip.hotelLocation && trip.hotelCheckOut) {
      stopsToInsert.push({
        tripId: new ObjectId(tripId),
        userId: new ObjectId(req.user.userId),
        day: durationDays,
        time: extractTime(trip.hotelCheckOut),
        activityTitle: `Check out from ${trip.hotelLocation}`,
        location: trip.hotelLocation,
        category: 'Logistics',
        duration: '30m',
        notes: 'Hotel check-out.',
        order: 998,
        lat: trip.hotelLat || null,
        lng: trip.hotelLng || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Last day — Airport departure (last stop of the trip)
    if (trip.departureAirport) {
      stopsToInsert.push({
        tripId: new ObjectId(tripId),
        userId: new ObjectId(req.user.userId),
        day: durationDays,
        time: extractTime(trip.departureTime) || '18:00',
        activityTitle: `Depart from ${trip.departureAirport}`,
        location: trip.departureAirport,
        category: 'Logistics',
        duration: '2h',
        notes: 'Airport check-in and departure.',
        order: 999,
        lat: trip.departureAirportLat || null,
        lng: trip.departureAirportLng || null,
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
      message: error.message || 'Server error while generating itinerary.',
    });
  }
});

module.exports = router;
