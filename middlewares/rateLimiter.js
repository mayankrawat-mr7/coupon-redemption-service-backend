import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const csvImportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.user?.id || ipKeyGenerator(req);
  },

  message: {
    responseCode: 1,
    status: "error",
    message: "Too many CSV import requests. Please try again later.",
  },
});