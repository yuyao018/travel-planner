const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');
const { authLimiter } = require('../middleware/rateLimiter');
const { generateApiKeyWithExpiry } = require('../middleware/apiKey');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply stricter rate limiting to auth routes
router.use(authLimiter);

/**
 * POST /api/auth/register
 * Create a new user account.
 * - Hashes password using bcrypt with salt rounds
 * - Generates a JWT token with expiry
 * - Generates an API key with 30-day expiry using crypto
 * - Assigns default role for RBAC
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const db = getDB();
    const usersCollection = db.collection('users');
    const apiKeysCollection = db.collection('api_keys');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Hash password using bcrypt with salt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user document with role for RBAC
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user', // Default role (RBAC: user, moderator, admin)
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate JWT token with expiry
    const token = jwt.sign(
      { userId: result.insertedId, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Generate API key with 30-day expiry using crypto
    const { apiKey, expiresAt } = generateApiKeyWithExpiry();

    // Store API key in database
    await apiKeysCollection.insertOne({
      key: apiKey,
      userId: result.insertedId,
      role: newUser.role,
      isActive: true,
      expiresAt,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      apiKey,
      apiKeyExpiresAt: expiresAt,
      user: { id: result.insertedId, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Verify credentials and return a JWT token.
 * - Compares hashed password using bcrypt
 * - Returns JWT with role claim for RBAC
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare password with hashed version using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT with expiry (includes role for RBAC)
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

/**
 * POST /api/auth/refresh-api-key
 * Regenerate API key for the authenticated user.
 * Invalidates the old key and issues a new one with 30-day expiry.
 */
router.post('/refresh-api-key', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const apiKeysCollection = db.collection('api_keys');
    const { ObjectId } = require('mongodb');
    const userId = new ObjectId(req.user.userId);

    // Deactivate all existing keys for this user
    await apiKeysCollection.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } }
    );

    // Generate new API key with expiry using crypto
    const { apiKey, expiresAt } = generateApiKeyWithExpiry();

    // Store new key
    await apiKeysCollection.insertOne({
      key: apiKey,
      userId,
      role: req.user.role || 'user',
      isActive: true,
      expiresAt,
      createdAt: new Date(),
    });

    res.status(200).json({
      message: 'API key regenerated successfully.',
      apiKey,
      expiresAt,
    });
  } catch (error) {
    console.error('Refresh API key error:', error);
    res.status(500).json({ message: 'Server error while regenerating API key.' });
  }
});

module.exports = router;
