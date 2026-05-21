const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token from the Authorization header.
 * Extracts userId, email, and role for downstream use (including RBAC).
 *
 * JWT tokens are signed with a secret key and have a built-in expiry.
 * If the token is expired or tampered with, access is denied.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks both signature validity and token expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user', // Role used by RBAC middleware
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

module.exports = { authMiddleware };
