import AuditLog from '../models/AuditLog.js';
import crypto from 'crypto';

// Basic mapping for readable actions
const actionMap = {
  '/api/auth/login': 'User Login',
  '/api/auth/register': 'User Registration',
  '/api/auth/logout': 'User Logout',
  '/api/auth/google': 'Google Sign-In',
  '/api/news': 'Manage Article',
  '/api/categories': 'Manage Category',
  '/api/users': 'Manage User',
  '/api/roles': 'Manage Role',
  '/api/subscriptions': 'Manage Subscription',
  '/api/settings': 'System Settings Update',
};

const getReadableAction = (method, originalUrl) => {
  const urlBase = originalUrl.split('?')[0]; // Remove query params
  
  // Exact match first
  if (actionMap[urlBase]) return actionMap[urlBase];

  // Pattern matching
  if (urlBase.startsWith('/api/news') && method === 'POST') return 'Create Article';
  if (urlBase.startsWith('/api/news') && method === 'PUT') return 'Update Article';
  if (urlBase.startsWith('/api/news') && method === 'DELETE') return 'Delete Article';
  
  if (urlBase.startsWith('/api/users') && method === 'PUT') return 'Update User';
  if (urlBase.startsWith('/api/users') && method === 'DELETE') return 'Delete User';

  // Fallback
  return `${method} ${urlBase.split('/').slice(0,3).join('/')}`; 
};

const auditLogger = async (req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  // Log mutating actions and specific GETs (like auth checks if needed, but let's stick to mutating for cleaner logs)
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (isMutating && req.originalUrl.startsWith('/api')) {
    res.end = async function (chunk, encoding) {
      const responseTime = Date.now() - start;
      
      // Restore and call original end
      res.end = originalEnd;
      res.end(chunk, encoding);

      try {
        const userId = req.user ? req.user.id : null;
        let details = { ...req.body, ...req.params, ...req.query };

        // Hide sensitive fields
        if (details.password) details.password = '***';
        if (details.confirmPassword) details.confirmPassword = '***';
        if (details.captchaToken) details.captchaToken = '***';
        if (details.idToken) details.idToken = '***';

        const status = res.statusCode;
        let severity = 'info';
        if (status >= 500) severity = 'critical';
        else if (status >= 400) severity = 'warning';

        // Extract User Agent & Mock Location
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        // Vercel / Cloudflare typically pass these headers
        const location = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Generate a session ID if one doesn't exist
        const sessionId = req.headers['x-session-id'] || crypto.randomBytes(8).toString('hex');

        const newLog = new AuditLog({
          action: `${req.method} ${req.originalUrl.split('?')[0]}`,
          readableAction: getReadableAction(req.method, req.originalUrl),
          userId,
          details,
          ipAddress,
          location,
          endpoint: req.originalUrl,
          method: req.method,
          status,
          severity,
          responseTime,
          userAgent,
          sessionId
        });

        await newLog.save();
      } catch (error) {
        console.error('Failed to save audit log:', error);
      }
    };
  }

  next();
};

export default auditLogger;
