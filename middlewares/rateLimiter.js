import rateLimit from "express-rate-limit";

/**
 * General rate limit for unauthenticated/public endpoints.
 * Keyed by IP address.
 */
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    responseCode: 1,
    status: "error",
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Stricter limit for authentication endpoints.
 * Helps prevent repeated login attempts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    responseCode: 1,
    status: "error",
    message: "Too many authentication attempts. Please try again later.",
  },
});

/**
 * Stricter limit for CSV imports because file uploads
 * consume more server resources.
 */
export const csvImportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    responseCode: 1,
    status: "error",
    message: "Too many CSV import requests. Please try again later.",
  },
});

/**
 * Limits redemption attempts by authenticated customer, not by shared IP.
 */
export const redemptionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    responseCode: 1,
    status: "error",
    message: "Too many redemption attempts. Please try again later.",
  },
});
