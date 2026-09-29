import express from "express";

import {
  authRateLimiter,
  redemptionRateLimiter,
} from "../middlewares/rateLimiter.js";
import { requireRole } from "../middlewares/requireRole.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validations.js";

import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  refreshUserAccessToken,
  getCurrentUser,
} from "../controllers/userController.js";

import {
  redeemCoupon,
  getMyRedemptions,
} from "../controllers/redemptionController.js";

import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
} from "../utils/validationSchemas/userSchema.js";

import {
  redeemCouponSchema,
} from "../utils/validationSchemas/redemptionSchema.js";

const router = express.Router();

// Login
router.post(
  "/login",
  authRateLimiter,
  validateRequest(loginSchema),
  loginUser
);

// Refresh access token
router
  .route("/update-refresh-access")
  .put(
    verifyToken("refresh"),
    refreshUserAccessToken
  );

// Logout
router
  .route("/logout")
  .delete(
    verifyToken("access"),
    logoutUser
  );

router.get("/session", verifyToken("access"), getCurrentUser);

// Admin user routes
router
  .route("/")
  .get(
    verifyToken("access"),
    requireRole("admin"),
    getAllUsers
  )
  .post(
    verifyToken("access"),
    requireRole("admin"),
    validateRequest(createUserSchema),
    createUser
  );

// Customer redemption routes
router
  .route("/redemptions")
  .post(
    verifyToken("access"),
    redemptionRateLimiter,
    validateRequest(redeemCouponSchema),
    redeemCoupon
  )
  .get(
    verifyToken("access"),
    getMyRedemptions
  );

// Admin user by ID
router
  .route("/:id")
  .get(
    verifyToken("access"),
    requireRole("admin"),
    getUserById
  )
  .put(
  verifyToken("access"),
  requireRole("admin"),
  validateRequest(updateUserSchema),
  updateUser
)
  .delete(
    verifyToken("access"),
    requireRole("admin"),
    deleteUser
  );

export default router;
