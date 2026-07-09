const aiRequestTracker = new Map();

// Rate limiter: Max 10 requests per minute per authenticated user
export const aiRateLimiter = (req, res, next) => {
  const userId = req.user ? req.user._id.toString() : req.ip;
  const now = Date.now();
  const ONE_MINUTE = 60 * 1000;

  if (!aiRequestTracker.has(userId)) {
    aiRequestTracker.set(userId, []);
  }

  let timestamps = aiRequestTracker.get(userId);
  
  // Filter out timestamps older than 1 minute
  timestamps = timestamps.filter(time => now - time < ONE_MINUTE);
  
  if (timestamps.length >= 10) {
    return res.status(429).json({
      success: false,
      message: 'Too many AI requests. Rate limit is 10 requests per minute. Please try again shortly.'
    });
  }

  // Record current request timestamp
  timestamps.push(now);
  aiRequestTracker.set(userId, timestamps);

  next();
};
