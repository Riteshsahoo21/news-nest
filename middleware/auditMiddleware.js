import AuditLog from '../models/AuditLog.js';
import crypto from 'crypto';

// Basic mapping for exact auth/system routes
const exactActionMap = {
  '/api/auth/login': 'User Login',
  '/api/auth/register': 'User Registration',
  '/api/auth/logout': 'User Logout',
  '/api/auth/google': 'Google Sign-In',
  '/api/auth/refresh': 'Refresh Token',
  '/api/settings': 'System Settings Update',
};

const getModuleCategory = (urlBase) => {
  if (urlBase.startsWith('/api/news') || urlBase.startsWith('/api/live-blogs') || 
      urlBase.startsWith('/api/photo-galleries') || urlBase.startsWith('/api/video-news') || 
      urlBase.startsWith('/api/categories')) {
    return 'Content';
  }
  if (urlBase.startsWith('/api/auth')) {
    return 'Authentication';
  }
  if (urlBase.startsWith('/api/users') || urlBase.startsWith('/api/user-admin') || 
      urlBase.startsWith('/api/roles') || urlBase.startsWith('/api/reporter-applications')) {
    return 'Users & Access';
  }
  if (urlBase.startsWith('/api/subscriptions') || urlBase.startsWith('/api/payment') || 
      urlBase.startsWith('/api/stripe') || urlBase.startsWith('/api/revenue') || urlBase.startsWith('/api/ads')) {
    return 'Monetization';
  }
  if (urlBase.startsWith('/api/comments') || urlBase.startsWith('/api/newsletter') || 
      urlBase.startsWith('/api/notifications')) {
    return 'Community';
  }
  if (urlBase.startsWith('/api/settings') || urlBase.startsWith('/api/upload')) {
    return 'System';
  }
  return 'General';
};

const getReadableAction = (method, originalUrl) => {
  const urlBase = originalUrl.split('?')[0];
  
  if (exactActionMap[urlBase]) return exactActionMap[urlBase];

  // Pattern matching by module & action method
  if (urlBase.includes('/live-blogs') && urlBase.includes('/updates')) return method === 'POST' ? 'Add Live Blog Update' : 'Modify Live Blog Update';
  
  const segments = urlBase.split('/').filter(Boolean); // ['api', 'news', '12345']
  const resource = segments[1] || 'resource';
  
  // Clean up resource name to human singular/plural
  const resourceNames = {
    'news': 'Article',
    'live-blogs': 'Live Blog',
    'photo-galleries': 'Photo Gallery',
    'video-news': 'Video News',
    'categories': 'Category',
    'users': 'User Profile',
    'user-admin': 'User Account',
    'roles': 'User Role',
    'reporter-applications': 'Reporter Application',
    'comments': 'Comment',
    'ads': 'Ad Campaign',
    'subscriptions': 'Subscription Plan',
    'newsletter': 'Newsletter Campaign',
    'settings': 'System Setting'
  };

  const entityName = resourceNames[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);

  switch (method) {
    case 'POST': return `Create ${entityName}`;
    case 'PUT':
    case 'PATCH': return `Update ${entityName}`;
    case 'DELETE': return `Delete ${entityName}`;
    default: return `${method} ${entityName}`;
  }
};

const getTargetEntity = (originalUrl, details) => {
  const urlBase = originalUrl.split('?')[0];
  const segments = urlBase.split('/').filter(Boolean);
  const resource = segments[1] || 'Resource';

  const typeMap = {
    'news': 'Article',
    'live-blogs': 'Live Blog',
    'photo-galleries': 'Photo Gallery',
    'video-news': 'Video News',
    'categories': 'Category',
    'users': 'User Account',
    'user-admin': 'User Account',
    'roles': 'Role',
    'reporter-applications': 'Application',
    'comments': 'Comment',
    'ads': 'Ad Campaign',
    'settings': 'Setting'
  };

  const entityType = typeMap[resource] || 'Resource';
  
  // Extract a meaningful title/name from payload if present
  let entityName = details.title || details.name || details.fullName || details.email || 
                   details.categoryName || details.subject || details.headline || details.key || null;

  // Extract ID from params or URL segment (e.g. /api/news/65a12...)
  let entityId = details.id || details._id || details.articleId || null;
  if (!entityId && segments.length >= 3 && segments[2].length === 24) {
    entityId = segments[2];
  }

  // If no name is found but we have an ID, formulate a clean identifier
  if (!entityName && entityId) {
    entityName = `${entityType} (#${entityId.slice(-6)})`;
  } else if (!entityName) {
    entityName = `${entityType}`;
  }

  return { entityType, entityName, entityId };
};

const parseDeviceInfo = (userAgent) => {
  if (!userAgent || userAgent === 'Unknown') return { browser: 'Unknown', os: 'Unknown', deviceType: 'Unknown' };

  let browser = 'Unknown Browser';
  if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Postman') || userAgent.includes('insomnia') || userAgent.includes('curl')) browser = 'API Client';

  let os = 'Unknown OS';
  if (userAgent.includes('Win')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  const isMobile = userAgent.includes('Mobi') || userAgent.includes('Android') || userAgent.includes('iPhone');
  const deviceType = isMobile ? 'Mobile / Tablet' : 'Desktop / Laptop';

  return { browser, os, deviceType };
};

const auditLogger = async (req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (isMutating && req.originalUrl.startsWith('/api')) {
    res.end = async function (chunk, encoding) {
      const responseTime = Date.now() - start;
      
      res.end = originalEnd;
      res.end(chunk, encoding);

      try {
        const userId = req.user ? req.user.id : null;
        let details = { ...req.body, ...req.params, ...req.query };

        // Hide sensitive fields
        ['password', 'confirmPassword', 'oldPassword', 'newPassword', 'captchaToken', 'idToken', 'secret'].forEach(field => {
          if (details[field] !== undefined) details[field] = '***';
        });

        const status = res.statusCode;
        let severity = 'info';
        if (status >= 500) severity = 'critical';
        else if (status >= 400) severity = 'warning';

        const userAgent = req.headers['user-agent'] || 'Unknown';
        let ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
        let location = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;

        // Clean up localhost loopback IP and location
        if (['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ipAddress)) {
          ipAddress = '127.0.0.1 (Local)';
          location = location || 'Local / Intranet';
        } else {
          location = location || 'Not Available';
        }

        const sessionId = req.headers['x-session-id'] || crypto.randomBytes(8).toString('hex');
        const urlBase = req.originalUrl.split('?')[0];

        const moduleCategory = getModuleCategory(urlBase);
        const readableAction = getReadableAction(req.method, req.originalUrl);
        const targetEntity = getTargetEntity(req.originalUrl, details);
        const deviceInfo = parseDeviceInfo(userAgent);

        const newLog = new AuditLog({
          action: `${req.method} ${urlBase}`,
          readableAction,
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
          sessionId,
          moduleCategory,
          targetEntity,
          deviceInfo
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
