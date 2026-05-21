const crypto = require('crypto');
const { getDB } = require('../config/db');

/**
 * Generate a secure API key using crypto.
 * Uses crypto.randomBytes for cryptographically strong random values.
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an API key with an expiry date (30 days from now).
 * @returns {{ apiKey: string, expiresAt: Date }}
 */
function generateApiKeyWithExpiry() {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  // Expire after 30 days
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    apiKey,
    expiresAt,
  };
}

/**
 * API Key Authentication Middleware
 * Validates the x-api-key header against stored keys in the database.
 * Checks both validity and expiry of the key.
 */
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ message: 'Access denied. API key is required.' });
  }

  try {
    const db = getDB();
    const apiKeysCollection = db.collection('api_keys');

    // Find the API key in the database
    const keyRecord = await apiKeysCollection.findOne({ key: apiKey, isActive: true });

    if (!keyRecord) {
      return res.status(403).json({ message: 'Invalid API key.' });
    }

    // Check if the key has expired
    if (keyRecord.expiresAt && new Date() > new Date(keyRecord.expiresAt)) {
      // Mark key as inactive
      await apiKeysCollection.updateOne(
        { _id: keyRecord._id },
        { $set: { isActive: false } }
      );
      return res.status(403).json({ message: 'API key has expired.' });
    }

    // Attach key owner info to request
    req.apiKeyOwner = {
      userId: keyRecord.userId,
      role: keyRecord.role || 'user',
    };

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ message: 'Server error during API key validation.' });
  }
}

module.exports = { generateApiKey, generateApiKeyWithExpiry, apiKeyMiddleware };
