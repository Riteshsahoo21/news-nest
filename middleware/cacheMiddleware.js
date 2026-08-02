import redisClient from '../config/redis.js';

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    // Generate a unique cache key based on the request URL and query params
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // If not cached, patch res.json to cache the output before sending it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache the response
        redisClient.set(key, JSON.stringify(body), 'EX', duration).catch((err) => {
          console.error('Redis Cache Set Error:', err);
        });
        
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis Cache Error:', err);
      // Fallback to next middleware if Redis fails
      next();
    }
  };
};

export default cacheMiddleware;
