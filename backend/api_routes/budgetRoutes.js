const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { convertCurrency } = require('../services/exchangeRate');

const router = express.Router();

// All budget routes require authentication
router.use(authMiddleware);

/**
 * POST /api/budget
 * Add an expense to a trip. Converts currency if different from trip base currency.
 */
router.post('/', async (req, res) => {
  try {
    const { tripId, amount, currency, category, notes } = req.body;

    if (!tripId || !amount || !category) {
      return res.status(400).json({ message: 'Trip ID, amount, and category are required.' });
    }

    if (!ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');
    const expensesCollection = db.collection('expenses');

    // Verify trip belongs to user
    const trip = await tripsCollection.findOne({
      _id: new ObjectId(tripId),
      userId: new ObjectId(req.user.userId),
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Currency conversion if expense currency differs from trip base currency
    const expenseCurrency = currency || trip.currency || 'USD';
    let convertedAmount = amount;
    let conversionRate = 1;
    let conversionWarning = null;

    if (expenseCurrency !== trip.currency) {
      try {
        const conversion = await convertCurrency(expenseCurrency, trip.currency, amount);
        convertedAmount = conversion.convertedAmount;
        conversionRate = conversion.rate;
      } catch (convErr) {
        console.error('Currency conversion failed:', convErr.message);
        conversionWarning = `Currency conversion failed: ${convErr.message}. Stored original amount as fallback.`;
        convertedAmount = amount;
      }
    }

    const newExpense = {
      tripId: new ObjectId(tripId),
      userId: new ObjectId(req.user.userId),
      amount: parseFloat(amount),
      originalCurrency: expenseCurrency,
      convertedAmount: parseFloat(convertedAmount),
      baseCurrency: trip.currency || 'USD',
      conversionRate,
      category,
      notes: notes || '',
      createdAt: new Date(),
    };

    const result = await expensesCollection.insertOne(newExpense);

    res.status(201).json({
      message: conversionWarning || 'Expense added successfully.',
      warning: conversionWarning,
      expense: { ...newExpense, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ message: 'Server error while adding expense.' });
  }
});

/**
 * GET /api/budget/:tripId
 * Get all expenses for a trip with total spent calculation.
 */
router.get('/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    if (!ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID.' });
    }

    const db = getDB();
    const tripsCollection = db.collection('trips');
    const expensesCollection = db.collection('expenses');

    // Verify trip belongs to user
    const trip = await tripsCollection.findOne({
      _id: new ObjectId(tripId),
      userId: new ObjectId(req.user.userId),
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const expenses = await expensesCollection
      .find({ tripId: new ObjectId(tripId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate total spent (in base currency)
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.convertedAmount, 0);

    res.status(200).json({
      expenses,
      summary: {
        totalSpent,
        totalBudget: trip.budget || 0,
        baseCurrency: trip.currency || 'USD',
        remaining: (trip.budget || 0) - totalSpent,
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error while fetching expenses.' });
  }
});

/**
 * DELETE /api/budget/:id
 * Delete an expense.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense ID.' });
    }

    const db = getDB();
    const expensesCollection = db.collection('expenses');

    const result = await expensesCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.status(200).json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error while deleting expense.' });
  }
});

module.exports = router;
