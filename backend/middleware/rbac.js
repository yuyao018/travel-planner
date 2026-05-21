/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to routes based on user roles.
 *
 * Roles hierarchy: admin > moderator > user
 */

const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
};

/**
 * Middleware factory that restricts access to specified roles.
 * @param  {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.delete('/users/:id', authorize('admin'), handler);
 *   router.put('/trips/:id', authorize('admin', 'moderator'), handler);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // req.user is set by authMiddleware (JWT verification)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = req.user.role || ROLES.USER;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
}

module.exports = { authorize, ROLES };
