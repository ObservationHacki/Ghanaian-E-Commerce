import rateLimit from "express-rate-limit";

/** Shared limiter for checkout / payment mutations. */
export const checkoutMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

export const momoReferenceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many MoMo reference submissions. Please try again shortly." },
});
