import express from "express";

import { requireRole } from "../middlewares/requireRole.js";

import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  refreshUserAccessToken,
} from "../controllers/userController.js";

import {
  redeemCoupon,
  getMyRedemptions,
} from "../controllers/redemptionController.js";

import { verifyToken } from "../middlewares/auth.js";

import { validateRequest } from "../middlewares/validations.js";

import {
  createUserSchema,
  updateUserSchema,
} from "../utils/validationSchemas/userSchema.js";

import {
  redeemCouponSchema,
} from "../utils/validationSchemas/redemptionSchema.js";

const router = express.Router();

router.route("/login").post(loginUser);

router
  .route("/update-refresh-access")
  .put(verifyToken("refresh"), refreshUserAccessToken);

router.route("/logout").delete(verifyToken("access"), logoutUser);

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
