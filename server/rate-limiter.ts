/**
 * Rate Limiting Middleware for Production
 * 
 * Prevents abuse and DoS attacks by limiting requests per IP address.
 * Configure rate limits based on your application needs.
 */

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(ip => {
    if (store[ip].resetTime < now) {
      delete store[ip];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Maximum requests per window
  message?: string; // Error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

/**
 * Create a rate limiter middleware
 * 
 * @example
 * // Limit login attempts: 5 per 15 minutes
 * app.post('/api/login', rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }), handler);
 * 
 * @example
 * // Limit API calls: 100 per minute
 * app.use('/api/', rateLimiter({ max: 100, windowMs: 60 * 1000 }));
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // 100 requests default
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false
  } = options;

  return (req: any, res: any, next: any) => {
    // Skip rate limiting in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();

    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    if (store[ip].count >= max) {
      const retryAfter = Math.ceil((store[ip].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(store[ip].resetTime).toISOString());
      
      return res.status(429).json({
        message,
        retryAfter
      });
    }

    // Increment counter
    const originalSend = res.send;
    res.send = function (body: any) {
      if (!skipSuccessfulRequests || res.statusCode >= 400) {
        store[ip].count++;
      }
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[ip].count));
      res.setHeader('X-RateLimit-Reset', new Date(store[ip].resetTime).toISOString());
      
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  // Strict: Login, registration, password reset
  auth: rateLimiter({
    max: 5,
    windowMs: 15 * 60 * 1000, // 5 requests per 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  }),

  // Moderate: API endpoints
  api: rateLimiter({
    max: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    message: 'API rate limit exceeded. Please slow down your requests.'
  }),

  // Lenient: General routes
  general: rateLimiter({
    max: 1000,
    windowMs: 15 * 60 * 1000, // 1000 requests per 15 minutes
    message: 'Too many requests. Please try again later.'
  }),

  // Very strict: Ticket creation
  ticketCreation: rateLimiter({
    max: 10,
    windowMs: 60 * 60 * 1000, // 10 tickets per hour
    message: 'Too many tickets created. Please wait before creating more.'
  })
};
