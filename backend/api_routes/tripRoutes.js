const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');

const router = express.Router();

// All trip routes require JWT authentication
router.use(authMiddleware);

/**
 * POST /api/trips
 * Create a new trip.
 */
router.post('/', async (req, res) => {
  try {
    const {
      destination,
      tripName,
      startDate,
      endDate,
      budget,
      currency,
      arrivalTime,
      departureTime,
      arrivalAirport,
      departureAirport,
      arrivalAirportLat,
      arrivalAirportLng,
      departureAirportLat,
      departureAirportLng,
      hotelCheckIn,
      hotelCheckOut,
      hotelLocation,
      hotelLat,
      hotelLng,
      travelPreferences,
      notes,
    } = req.body;

    // Validation
    if (!destination || !tripName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Destination, trip name, start date, and end date are required.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');

    const newTrip = {
      userId: new ObjectId(req.user.userId),
      destination,
      tripName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: budget || 0,
      currency: currency || 'USD',
      arrivalTime: arrivalTime || null,
      departureTime: departureTime || null,
      arrivalAirport: arrivalAirport || null,
      departureAirport: departureAirport || null,
      arrivalAirportLat: arrivalAirportLat || null,
      arrivalAirportLng: arrivalAirportLng || null,
      departureAirportLat: departureAirportLat || null,
      departureAirportLng: departureAirportLng || null,
      hotelCheckIn: hotelCheckIn || null,
      hotelCheckOut: hotelCheckOut || null,
      hotelLocation: hotelLocation || null,
      hotelLat: hotelLat || null,
      hotelLng: hotelLng || null,
      travelPreferences: travelPreferences || [],
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tripsCollection.insertOne(newTrip);

    res.status(201).json({
      message: 'Trip created successfully.',
      trip: { ...newTrip, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ message: 'Server error while creating trip.' });
  }
});

/**
 * GET /api/trips
 * Get all trips for the authenticated user with aggregated metrics.
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const tripsCollection = db.collection('trips');
    const userId = new ObjectId(req.user.userId);

    // Fetch all trips for this user
    const trips = await tripsCollection
      .find({ userId })
      .sort({ startDate: 1 })
      .toArray();

    // Compute aggregated metrics
    const now = new Date();
    const totalPlannedTrips = trips.length;
    const upcomingTrips = trips.filter(t => new Date(t.startDate) > now).length;
    const distinctCountries = [...new Set(trips.map(t => t.destination))].length;

    res.status(200).json({
      metrics: {
        totalPlannedTrips,
        upcomingTrips,
        countriesPlanned: distinctCountries,
      },
      trips,
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ message: 'Server error while fetching trips.' });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');

    const trip = await tripsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    res.status(200).json({ trip });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Server error while fetching trip.' });
  }
});

/**
 * PUT /api/trips/:id
 * Update a trip.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');

    // Build update object from allowed fields
    const allowedFields = [
      'destination', 'tripName', 'startDate', 'endDate', 'budget', 'currency',
      'arrivalTime', 'departureTime', 'arrivalAirport', 'departureAirport',
      'arrivalAirportLat', 'arrivalAirportLng', 'departureAirportLat', 'departureAirportLng',
      'hotelCheckIn', 'hotelCheckOut', 'hotelLocation', 'hotelLat', 'hotelLng',
      'travelPreferences', 'notes',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Convert date strings to Date objects
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    updateData.updatedAt = new Date();

    const result = await tripsCollection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(req.user.userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    res.status(200).json({ message: 'Trip updated successfully.', trip: result });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ message: 'Server error while updating trip.' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip and cascade-delete all associated stops and expenses.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripId = new ObjectId(id);
    const userId = new ObjectId(req.user.userId);

    // Verify trip belongs to user
    const trip = await db.collection('trips').findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Cascade delete: remove all stops and expenses linked to this trip
    await db.collection('stops').deleteMany({ tripId });
    await db.collection('expenses').deleteMany({ tripId });
    await db.collection('trips').deleteOne({ _id: tripId });

    res.status(200).json({ message: 'Trip and all associated data deleted successfully.' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Server error while deleting trip.' });
  }
});

/**
 * GET /api/trips/admin/all
 * Admin-only: Get all trips across all users.
 * Restricted via RBAC — only 'admin' role can access.
 */
router.get('/admin/all', authorize(ROLES.ADMIN), async (req, res) => {
  try {
    const db = getDB();
    const trips = await db.collection('trips').find({}).sort({ createdAt: -1 }).toArray();

    res.status(200).json({ totalTrips: trips.length, trips });
  } catch (error) {
    console.error('Admin get all trips error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
