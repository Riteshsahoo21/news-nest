import jwt from 'jsonwebtoken';
import Role from '../models/Role.js';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Real-time check to ensure user hasn't been suspended or deleted
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found in database.' });
    }
    
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    // JWT payload has userId, but controllers use req.user.id. Ensure both exist.
    req.user = {
      ...decoded,
      id: decoded.userId
    };
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Invalid Token' });
  }
};

// Middleware to check if user has required roles (Legacy, to be replaced)
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user must be populated by verifyToken first
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Role information missing. Please authenticate.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

// New Dynamic RBAC Middleware
export const authorizePermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).json({ error: 'User information missing.' });
      }

      const user = await User.findById(req.user.id).lean();
      if (!user) {
        return res.status(403).json({ error: 'User not found in database.' });
      }

      const roles = user.roles || [user.role];

      const userRoles = await Role.find({ name: { $in: roles } });
      if (!userRoles || userRoles.length === 0) {
        return res.status(403).json({ error: 'Roles not found.' });
      }

      // Merge permissions from all roles
      const allPermissions = userRoles.reduce((acc, r) => [...acc, ...(r.permissions || [])], []);
      req.user.permissions = allPermissions;

      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some(perm => allPermissions.includes(perm));
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Access denied. Requires permission: ${requiredPermissions.join(' or ')}` 
          });
        }
      }

      // Merge allowedCategories from all roles
      let allowedCategories = [];
      let hasGlobalCategoryAccess = false;

      for (const r of userRoles) {
        // If a role has no allowedCategories explicitly set, or it's empty, it means global access
        if (!r.allowedCategories || r.allowedCategories.length === 0) {
          hasGlobalCategoryAccess = true;
          break; 
        }
        allowedCategories = [...allowedCategories, ...r.allowedCategories];
      }

      if (hasGlobalCategoryAccess) {
        req.user.allowedCategories = ['ALL'];
      } else {
        req.user.allowedCategories = [...new Set(allowedCategories)];
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};
