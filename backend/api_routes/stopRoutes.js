const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All stop routes require authentication
router.use(authMiddleware);

/**
 * POST /api/trips/:tripId/stops
 * Add a stop to a trip.
 */
router.post('/trips/:tripId/stops', async (req, res) => {
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

    const {
      day,
      time,
      activityTitle,
      location,
      category,
      duration,
      notes,
      order,
      lat,
      lng,
    } = req.body;

    if (!activityTitle || !day) {
      return res.status(400).json({ message: 'Activity title and day are required.' });
    }

    const newStop = {
      tripId: new ObjectId(tripId),
      userId: new ObjectId(req.user.userId),
      day: day || 1,
      time: time || null,
      activityTitle,
      location: location || '',
      category: category || 'general',
      duration: duration || null,
      notes: notes || '',
      order: order || 0,
      lat: lat || null,
      lng: lng || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stopsCollection.insertOne(newStop);

    res.status(201).json({
      message: 'Stop added successfully.',
      stop: { ...newStop, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Add stop error:', error);
    res.status(500).json({ message: 'Server error while adding stop.' });
  }
});

/**
 * GET /api/trips/:tripId/stops
 * Get all stops for a trip, sorted by day and order.
 */
router.get('/trips/:tripId/stops', async (req, res) => {
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

    const stops = await stopsCollection
      .find({ tripId: new ObjectId(tripId) })
      .sort({ day: 1, time: 1, order: 1 })
      .toArray();

    res.status(200).json({ stops });
  } catch (error) {
    console.error('Get stops error:', error);
    res.status(500).json({ message: 'Server error while fetching stops.' });
  }
});

/**
 * PUT /api/stops/:id
 * Update a stop.
 */
router.put('/stops/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stop ID.' });
    }

    const db = getDB();
    const stopsCollection = db.collection('stops');

    // Verify stop belongs to user
    const existingStop = await stopsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    });

    if (!existingStop) {
      return res.status(404).json({ message: 'Stop not found.' });
    }

    const allowedFields = ['day', 'time', 'activityTitle', 'location', 'category', 'duration', 'notes', 'order', 'lat', 'lng'];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    updateData.updatedAt = new Date();

    const result = await stopsCollection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(req.user.userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    res.status(200).json({ message: 'Stop updated successfully.', stop: result });
  } catch (error) {
    console.error('Update stop error:', error);
    res.status(500).json({ message: 'Server error while updating stop.' });
  }
});

/**
 * DELETE /api/stops/:id
 * Delete a stop.
 */
router.delete('/stops/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stop ID.' });
    }

    const db = getDB();
    const stopsCollection = db.collection('stops');

    const result = await stopsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Stop not found.' });
    }

    res.status(200).json({ message: 'Stop deleted successfully.' });
  } catch (error) {
    console.error('Delete stop error:', error);
    res.status(500).json({ message: 'Server error while deleting stop.' });
  }
});

module.exports = router;
