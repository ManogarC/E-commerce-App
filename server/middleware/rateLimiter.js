/**
 * Rate Limiter & Bot Protection Middleware
 * Protects checkout and API routes against rapid spam, bot floods, and DDoS
 */

const ipRequestMap = new Map()

// Clean up expired IP trackers periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of ipRequestMap.entries()) {
    if (now > data.resetTime) {
      ipRequestMap.delete(ip)
    }
  }
}, 30000)

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests allowed per window
 * @param {string} options.message - Error message
 */
export const createRateLimiter = ({
  windowMs = 10000,
  max = 20,
  message = 'Too many requests. Please slow down and try again.',
} = {}) => {
  return (req, res, next) => {
    // Generate identifier: User ID if authenticated, otherwise Client IP
    const key = req.user ? `user_${req.user.id}` : (req.ip || req.headers['x-forwarded-for'] || 'anonymous_ip')
    const now = Date.now()

    let record = ipRequestMap.get(key)

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      }
      ipRequestMap.set(key, record)
    } else {
      record.count++
    }

    const remaining = Math.max(0, max - record.count)
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)

    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', remaining)
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000))

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfter)
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfterSeconds: retryAfter,
      })
    }

    next()
  }
}

/**
 * Honeypot Anti-Bot Middleware
 * Detects automated bots that blindly fill all form fields including hidden honeypot fields
 */
export const botProtection = (req, res, next) => {
  const honeypot = req.body?.hp_website || req.body?.bot_trap
  if (honeypot && String(honeypot).trim().length > 0) {
    console.warn(`🤖 Bot detected and blocked via Honeypot Trap! IP: ${req.ip}`)
    return res.status(400).json({
      error: 'BOT_DETECTED',
      message: 'Automated submission blocked by bot shield.',
    })
  }
  next()
}

