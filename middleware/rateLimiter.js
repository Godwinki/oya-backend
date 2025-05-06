const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message: message || '⚠️ Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use IP from X-Forwarded-For in a Railway-compatible way
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
      console.log(`⛔ Rate limit exceeded for IP: ${req.ip}`.red);
      res.status(429).json({
        status: 'error',
        message: message,
        lockoutUntil: new Date(Date.now() + windowMs).toISOString()
      });
    }
  });
};

// Higher limit for authentication endpoints - 3 attempts per 10 minutes
const authLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  5, 
  '⚠️ Too many login attempts. Please try again after 10 minutes'
);

// General API limit - 300 requests per minute (increased from 100)
const apiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  300, 
  '⚠️ Too many API requests'
);

// Special higher limit for frequently accessed endpoints like departments
const readOnlyLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  500,
  '⚠️ Too many read requests'
);

// Special limit for resource-intensive operations like PDF generation and notification checks
const resourceIntensiveLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 1 per second on average
  '⚠️ Too many resource-intensive requests'
);

// No rate limit for specific endpoints (but with monitoring)
const bypassRateLimiter = (req, res, next) => {
  console.log(`🔓 Rate limit bypassed for: ${req.originalUrl}`);
  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  readOnlyLimiter,
  resourceIntensiveLimiter,
  bypassRateLimiter
};