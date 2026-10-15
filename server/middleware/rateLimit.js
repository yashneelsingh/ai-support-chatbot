import rateLimit from 'express-rate-limit';

/**
 * Chat endpoint rate limiter — per-session throttling.
 *
 * Uses the sessionId from the request body (or falls back to IP) so that
 * each chat session gets its own quota. This prevents a single user from
 * burning through LLM API credits while still allowing legitimate multi-tab usage.
 *
 * Limits: 20 requests per minute per session (generous for normal chat,
 * but catches automated abuse).
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1-minute window
  max: 20,                       // 20 requests per window per IP
  standardHeaders: true,         // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    message: 'Too many requests — please slow down and try again in a moment.',
  },
});

/**
 * Auth endpoint rate limiter — stricter limits to prevent brute-force
 * attacks on login/register.
 *
 * Limits: 10 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15-minute window
  max: 10,                       // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts — please try again later.',
  },
});
